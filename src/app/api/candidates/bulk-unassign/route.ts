import { NextRequest, NextResponse } from 'next/server';
import { Schema } from 'mongoose';
import connectToDatabase, { Candidate, History } from '@/lib/mongodb';
import { broadcastMultipleCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import { logger } from '@/lib/logger/logger.server';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { ICandidateHistory } from '@/lib/models/history';
import { ICandidate } from '@/lib/models/candidate';

interface BulkUnassignRequest {
  candidateIds: string[];
}

interface BulkUnassignResponse {
  success: boolean;
  message: string;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
}

function getJobIdString(candidate: { jobId?: unknown }): string | null {
  if (!candidate.jobId) return null;
  if (typeof candidate.jobId === 'string') return candidate.jobId;
  const obj = candidate.jobId as { _id?: unknown };
  if (obj?._id != null) {
    return typeof obj._id === 'string' ? obj._id : String(obj._id);
  }
  return null;
}

function getPreviousInterviewerId(interviewerId: unknown): unknown {
  if (interviewerId == null) return null;
  if (
    typeof interviewerId === 'object' &&
    interviewerId !== null &&
    '_id' in interviewerId
  ) {
    return (interviewerId as { _id: unknown })._id;
  }
  return interviewerId;
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<BulkUnassignResponse | { error: string }>> {
  try {
    await connectToDatabase();
    const body = (await req.json()) as BulkUnassignRequest;
    const { candidateIds } = body;
    const dateTime = new Date().toISOString();

    const [user] = await Promise.all([
      getAuthenticatedUser(req),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!Candidate || !History) {
      return NextResponse.json(
        { error: 'Models not available' },
        { status: 500 },
      );
    }

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid candidate IDs' },
        { status: 400 },
      );
    }

    const candidates = await Candidate.find({
      _id: { $in: candidateIds },
      isDeleted: { $ne: true },
      'assignment.interviewerId': { $exists: true, $ne: null },
    })
      .populate([
        { path: 'assignment.interviewerId', select: '_id name email' },
        { path: 'jobId', select: '_id title description' },
      ])
      .lean();

    const skippedCount = candidateIds.length - candidates.length;

    if (candidates.length === 0) {
      return NextResponse.json<BulkUnassignResponse>({
        success: true,
        message: 'No assigned candidates found to unassign',
        updatedCount: 0,
        skippedCount,
        failedCount: 0,
      });
    }

    const toBroadcast: (ICandidate & { history?: ICandidateHistory[] })[] = [];
    let failedCount = 0;

    for (const candidate of candidates) {
      try {
        const candidateId = (
          candidate._id as { toString: () => string }
        ).toString();
        const jobId = getJobIdString(candidate);
        const previousInterviewerId = getPreviousInterviewerId(
          candidate.assignment?.interviewerId ?? null,
        );

        const historyEntry: ICandidateHistory = {
          dateTime,
          title: 'Unassigned',
          currentInterviewer: null,
          previousInterviewer: previousInterviewerId as
            | Schema.Types.ObjectId
            | { _id: string; name: string; email: string }
            | null,
          assignmentBy: user.id ?? null,
          note: {
            description: '',
            date: '',
            rating: 0,
            userId: null,
          },
          attachments: [],
        };

        await Candidate.updateOne(
          { _id: candidateId },
          { $set: { assignment: null } },
        );

        if (jobId) {
          await History.findOneAndUpdate(
            { candidateId, jobId },
            { $push: { history: historyEntry } },
            { upsert: true },
          );
        }

        const updated = await Candidate.findById(candidateId)
          .populate([
            { path: 'assignment.interviewerId', select: '_id name email' },
            { path: 'jobId', select: 'title description' },
          ])
          .lean();
        if (updated) {
          toBroadcast.push(updated as ICandidate & { history?: ICandidateHistory[] });
        }
      } catch (err) {
        logger.error(
          { error: err, candidateId: (candidate as { _id: unknown })._id },
          'Bulk unassign: failed one candidate',
        );
        failedCount += 1;
      }
    }

    if (toBroadcast.length > 0) {
      broadcastMultipleCandidateUpdate(toBroadcast).catch((error) => {
        logger.error(
          { error, url: req.url },
          'Failed to broadcast bulk unassign updates',
        );
      });
    }

    return NextResponse.json<BulkUnassignResponse>({
      success: true,
      message: `Unassigned ${candidates.length - failedCount} candidate(s)`,
      updatedCount: candidates.length - failedCount,
      skippedCount,
      failedCount,
    });
  } catch (error) {
    logger.error({ error, url: req.url }, 'Bulk unassign error');
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Unknown error occurred' },
      { status: 500 },
    );
  }
}
