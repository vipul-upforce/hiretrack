import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Candidate, History, User } from '@/lib/mongodb';
import { broadcastMultipleCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import { logger } from '@/lib/logger/logger.server';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { ICandidateHistory } from '@/lib/models/history';
import { Schema } from 'mongoose';
import { ICandidate } from '@/lib/models/candidate';

interface BulkAssignRequest {
  candidateIds: string[];
  interviewerId: string;
  time?: string;
}

interface BulkAssignResponse {
  success: boolean;
  message: string;
  updatedCount: number;
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

export async function POST(
  req: NextRequest,
): Promise<NextResponse<BulkAssignResponse | { error: string }>> {
  try {
    await connectToDatabase();
    const body = (await req.json()) as BulkAssignRequest;
    const { candidateIds, interviewerId, time } = body;
    const dateTime = new Date().toISOString();

    const [user] = await Promise.all([
      getAuthenticatedUser(req),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!Candidate || !History || !User) {
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

    if (!interviewerId) {
      return NextResponse.json(
        { error: 'Interviewer ID is required' },
        { status: 400 },
      );
    }

    const interviewer = await User.findById(interviewerId)
      .select('_id name email')
      .lean();
    if (!interviewer) {
      return NextResponse.json(
        { error: 'Interviewer not found' },
        { status: 404 },
      );
    }

    const candidates = await Candidate.find({
      _id: { $in: candidateIds },
      isDeleted: { $ne: true },
    })
      .populate([
        { path: 'assignment.interviewerId', select: '_id name email' },
        { path: 'jobId', select: '_id title description' },
      ])
      .lean();

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'No candidates found' },
        { status: 404 },
      );
    }

    const toBroadcast: ICandidate[] = [];
    let failedCount = 0;

    for (const candidate of candidates) {
      try {
        const candidateId = (
          candidate._id as { toString: () => string }
        ).toString();
        let previousInterviewerId = null;
        if (candidate.assignment?.interviewerId != null) {
          if (
            typeof candidate.assignment.interviewerId === 'object' &&
            candidate.assignment.interviewerId !== null &&
            '_id' in candidate.assignment.interviewerId
          ) {
            previousInterviewerId = (
              candidate.assignment.interviewerId as { _id: unknown }
            )._id;
          } else {
            previousInterviewerId = candidate.assignment.interviewerId;
          }
        }

        const historyEntry: ICandidateHistory = {
          dateTime,
          title: `Assigned to ${interviewer.name} : Assigned by ${user.name}`,
          currentInterviewer: interviewerId as unknown as Schema.Types.ObjectId,
          previousInterviewer:
            previousInterviewerId as Schema.Types.ObjectId | null,
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
          {
            $set: {
              assignment: {
                interviewerId,
                time: time ?? null,
                assignedAt: dateTime,
              },
            },
          },
        );

        await History.findOneAndUpdate(
          { candidateId },
          { $push: { history: historyEntry } },
          { upsert: true },
        );

        const updated = await Candidate.findById(candidateId)
          .populate([
            { path: 'assignment.interviewerId', select: '_id name email' },
            { path: 'jobId', select: 'title description' },
            { path: 'status', select: 'name', transform: (status: { name?: string } | null) => status?.name ?? null },
          ])
          .lean();
        if (updated) {
          toBroadcast.push(updated as ICandidate);
        }
      } catch (err) {
        logger.error(
          { error: err, candidateId: (candidate as { _id: unknown })._id },
          'Bulk assign: failed one candidate',
        );
        failedCount += 1;
      }
    }

    if (toBroadcast.length > 0) {
      broadcastMultipleCandidateUpdate(toBroadcast).catch((error) => {
        logger.error(
          { error, url: req.url },
          'Failed to broadcast bulk assign updates',
        );
      });
    }

    return NextResponse.json<BulkAssignResponse>({
      success: true,
      message: `Assigned ${candidates.length - failedCount} candidate(s)`,
      updatedCount: candidates.length - failedCount,
      failedCount,
    });
  } catch (error) {
    logger.error({ error, url: req.url }, 'Bulk assign error');
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Unknown error occurred' },
      { status: 500 },
    );
  }
}
