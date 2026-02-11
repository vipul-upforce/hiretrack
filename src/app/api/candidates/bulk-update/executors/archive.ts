import { logger } from '@/lib/logger/logger.server';
import type {
  BulkArchiveParams,
  BulkUpdateContext,
  BulkUpdateResult,
} from '../types';

export async function runBulkArchive(
  params: BulkArchiveParams,
  ctx: BulkUpdateContext,
): Promise<BulkUpdateResult> {
  const { candidateIds, action } = params;
  const { user, dateTime, Candidate, History } = ctx;
  const targetIsDeleted = action === 'archive';

  const candidates = await Candidate.find({
    _id: { $in: candidateIds },
  }).populate([
    { path: 'assignment.interviewerId', select: '_id name email' },
    { path: 'remarks.userId', select: 'name email' },
    { path: 'followUp.userId', select: '_id name email' },
    { path: 'jobId', select: 'title description' },
  ]);

  if (candidates.length === 0) {
    return {
      success: true,
      updatedCount: 0,
      failedCount: 0,
      skippedCount: candidateIds.length,
      candidatesToBroadcast: [],
      message: 'No candidates found',
    };
  }

  const toUpdate = candidates.filter((c) => c.isDeleted !== targetIsDeleted);
  const skippedCount = candidates.length - toUpdate.length;

  if (toUpdate.length === 0) {
    return {
      success: true,
      updatedCount: 0,
      failedCount: 0,
      skippedCount,
      candidatesToBroadcast: [],
      message: `All selected candidates are already ${action === 'archive' ? 'archived' : 'unarchived'}`,
    };
  }

  const idsToUpdate = toUpdate.map((c) => c._id.toString());

  try {
    // Batch update: set isDeleted for all candidates that need updating
    await Candidate.updateMany(
      { _id: { $in: idsToUpdate } },
      { $set: { isDeleted: targetIsDeleted } },
    );

    // Build history bulk operations
    const historyBulk = toUpdate
      .filter((c) => c.jobId)
      .map((c) => {
        const historyEntry = {
          dateTime,
          title: targetIsDeleted ? 'Archived' : 'Unarchived',
          previousInterviewer: null,
          currentInterviewer: null,
          assignmentBy: user?.id ?? '',
        };

        return {
          updateOne: {
            filter: {
              candidateId: c._id.toString(),
              jobId: c.jobId?.toString() ?? null,
            },
            update: { $push: { history: historyEntry } },
            upsert: true as const,
          },
        };
      });

    if (historyBulk.length > 0) {
      await History.bulkWrite(historyBulk);
    }

    // Single query to get all updated candidates
    const updatedList = await Candidate.find({ _id: { $in: idsToUpdate } })
      .populate([
        { path: 'assignment.interviewerId', select: '_id name email' },
        { path: 'remarks.userId', select: 'name email' },
        { path: 'followUp.userId', select: '_id name email' },
        { path: 'jobId', select: 'title description' },
      ])
      .lean();

    const candidatesToBroadcast = updatedList.map(
      (c) => c as Record<string, unknown>,
    );
    const failedCount = 0;

    return {
      success: true,
      updatedCount: candidatesToBroadcast.length,
      failedCount,
      skippedCount,
      candidatesToBroadcast:
        candidatesToBroadcast as BulkUpdateResult['candidatesToBroadcast'],
      message: `Successfully ${action === 'archive' ? 'archived' : 'unarchived'} ${candidatesToBroadcast.length} candidate(s)`,
    };
  } catch (err) {
    logger.error({ error: err }, 'Bulk archive: batch failed');
    return {
      success: false,
      updatedCount: 0,
      failedCount: toUpdate.length,
      skippedCount,
      candidatesToBroadcast: [],
      message: 'Archive operation failed',
    };
  }
}
