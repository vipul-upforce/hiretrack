import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Candidate, History } from '@/lib/mongodb';
import { broadcastCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import { logger } from '@/lib/logger/logger.server';
import { getAuthenticatedUser } from '@/app/actions/auth';

interface BulkArchiveRequest {
  candidateIds: string[];
  action: 'archive' | 'unarchive';
}

interface BulkArchiveResponse {
  success: boolean;
  message: string;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<BulkArchiveResponse | { error: string }>> {
  try {
    await connectToDatabase();
    const body = (await req.json()) as BulkArchiveRequest;
    const { candidateIds, action } = body;
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

    if (!['archive', 'unarchive'].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'archive' or 'unarchive'" },
        { status: 400 },
      );
    }

    // Fetch candidates to check their current state
    const candidates = await Candidate.find({
      _id: { $in: candidateIds },
    }).populate([
      {
        path: 'assignment.interviewerId',
        select: '_id name email',
      },
      {
        path: 'remarks.userId',
        select: 'name email',
      },
      {
        path: 'jobId',
        select: 'title description',
      },
    ]);

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'No candidates found' },
        { status: 404 },
      );
    }

    // Determine target state
    const targetIsDeleted = action === 'archive';

    // Filter candidates that need to be updated
    const candidatesToUpdate = candidates.filter(
      (candidate) => candidate.isDeleted !== targetIsDeleted,
    );

    if (candidatesToUpdate.length === 0) {
      return NextResponse.json<BulkArchiveResponse>({
        success: true,
        message: `All selected candidates are already ${action === 'archive' ? 'archived' : 'unarchived'}`,
        updatedCount: 0,
        skippedCount: candidates.length,
        failedCount: 0,
      });
    }

    // Update candidates with better error handling
    const updatePromises = candidatesToUpdate.map(async (candidate) => {
      try {
        const historyEntry = {
          dateTime,
          title: targetIsDeleted ? 'Archived' : 'Unarchived',
          previousInterviewer: null,
          currentInterviewer: null,
          assignmentBy: user?.id || '',
        };

        // Update history
        const updatedHistory = await History?.findOneAndUpdate(
          { candidateId: candidate._id, jobId: candidate.jobId },
          { $push: { history: historyEntry } },
          { new: true, upsert: true },
        )
          .populate('history.currentInterviewer', '_id name email')
          .populate('history.previousInterviewer', '_id name email')
          .populate('history.assignmentBy', '_id name email')
          .populate('history.note.userId', '_id name email');

        // Update candidate
        const updatedCandidate = await Candidate?.findByIdAndUpdate(
          candidate._id,
          { isDeleted: targetIsDeleted },
          { new: true },
        ).populate([
          {
            path: 'assignment.interviewerId',
            select: '_id name email',
          },
          {
            path: 'remarks.userId',
            select: 'name email',
          },
          {
            path: 'jobId',
            select: 'title description',
          },
        ]);

        if (!updatedCandidate) {
          throw new Error(`Failed to update candidate ${candidate._id}`);
        }

        // Broadcast update
        const candidateObj = updatedCandidate.toObject();
        broadcastCandidateUpdate({
          ...candidateObj,
          history: updatedHistory?.history,
        });

        return { success: true, candidateId: candidate._id.toString() };
      } catch (error) {
        logger.error(
          { error, url: req.url },
          `Error updating candidate ${candidate._id}`,
        );
        return {
          success: false,
          candidateId: candidate._id.toString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    const results = await Promise.allSettled(updatePromises);
    const successfulUpdates = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success,
    ).length;
    const failedUpdates = results.filter(
      (r) =>
        r.status === 'rejected' ||
        (r.status === 'fulfilled' && !r.value.success),
    ).length;

    return NextResponse.json<BulkArchiveResponse>({
      success: true,
      message: `Successfully ${action === 'archive' ? 'archived' : 'unarchived'} ${successfulUpdates} candidate(s)`,
      updatedCount: successfulUpdates,
      skippedCount: candidates.length - candidatesToUpdate.length,
      failedCount: failedUpdates,
    });
  } catch (error) {
    logger.error({ error, url: req.url }, 'Bulk archive error');
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Unknown error occurred' },
      { status: 500 },
    );
  }
}
