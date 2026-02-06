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

  const results = await Promise.allSettled(
    toUpdate.map(async (candidate) => {
      try {
        const historyEntry = {
          dateTime,
          title: targetIsDeleted ? 'Archived' : 'Unarchived',
          previousInterviewer: null,
          currentInterviewer: null,
          assignmentBy: user?.id ?? '',
        };

        await History.findOneAndUpdate(
          { candidateId: candidate._id, jobId: candidate.jobId },
          { $push: { history: historyEntry } },
          { new: true, upsert: true },
        );

        const updated = await Candidate.findByIdAndUpdate(
          candidate._id,
          { isDeleted: targetIsDeleted },
          { new: true },
        ).populate([
          { path: 'assignment.interviewerId', select: '_id name email' },
          { path: 'remarks.userId', select: 'name email' },
          { path: 'jobId', select: 'title description' },
        ]);

        if (!updated)
          throw new Error(`Failed to update candidate ${candidate._id}`);
        return { success: true as const, candidate: updated.toObject() };
      } catch (error) {
        logger.error(
          { error, candidateId: candidate._id },
          'Bulk archive: failed one candidate',
        );
        return { success: false as const };
      }
    }),
  );

  const successful = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success,
  );
  const candidatesToBroadcast = successful
    .filter(
      (
        r,
      ): r is PromiseFulfilledResult<{
        success: true;
        candidate: Record<string, unknown>;
      }> => r.status === 'fulfilled' && r.value.success,
    )
    .map((r) => r.value.candidate);
  const failedCount = results.length - successful.length;

  return {
    success: true,
    updatedCount: successful.length,
    failedCount,
    skippedCount,
    candidatesToBroadcast:
      candidatesToBroadcast as BulkUpdateResult['candidatesToBroadcast'],
    message: `Successfully ${action === 'archive' ? 'archived' : 'unarchived'} ${successful.length} candidate(s)`,
  };
}
