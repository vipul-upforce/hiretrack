import { ICandidateHistory } from '@/lib/models/history';
import type { ICandidate } from '@/lib/models/candidate';
import type { BulkUnassignParams, BulkUpdateContext, BulkUpdateResult } from '../types';
import { getJobIdString } from '../utils';
import { logger } from '@/lib/logger/logger.server';

export async function runBulkUnassign(
  params: BulkUnassignParams,
  ctx: BulkUpdateContext,
): Promise<BulkUpdateResult> {
  const { candidateIds } = params;
  const { user, dateTime, Candidate, History } = ctx;
  const toBroadcast: ICandidate[] = [];
  let failedCount = 0;

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
    return {
      success: true,
      updatedCount: 0,
      failedCount: 0,
      skippedCount,
      candidatesToBroadcast: [],
      message: 'No assigned candidates found to unassign',
    };
  }

  const ids = candidates.map((c) => (c._id as { toString: () => string }).toString());

  try {
    // Batch update: set assignment to null for all candidates
    await Candidate.updateMany(
      { _id: { $in: ids } },
      { $set: { assignment: null } },
    );

    // Build history bulk operations
    const historyBulk = candidates
      .filter((c) => getJobIdString(c))
      .map((c) => {
        const candidateId = (c._id as { toString: () => string }).toString();
        const prev = c.assignment?.interviewerId;
        const previousInterviewerId =
          prev != null && typeof prev === 'object' && '_id' in prev
            ? (prev as { _id: unknown })._id
            : prev;

        const historyEntry: ICandidateHistory = {
          dateTime,
          title: 'Unassigned',
          currentInterviewer: null,
          previousInterviewer: previousInterviewerId as string | null,
          assignmentBy: user.id ?? null,
          note: { description: '', date: '', rating: 0, userId: null },
          attachments: [],
        };

        return {
          updateOne: {
            filter: {
              candidateId,
              jobId: getJobIdString(c),
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
    const updatedList = await Candidate.find({ _id: { $in: ids } })
      .populate([
        { path: 'assignment.interviewerId', select: '_id name email' },
        { path: 'jobId', select: 'title description' },
      ])
      .lean();

    toBroadcast.push(...(updatedList as ICandidate[]));

    // Build unassignments metadata
    const unassignments = candidates.map((c) => {
      const candidateId = (c._id as { toString: () => string }).toString();
      const jobId = getJobIdString(c) ?? '';
      const prev = c.assignment?.interviewerId;
      const previousInterviewerId =
        prev != null && typeof prev === 'object' && '_id' in prev
          ? (prev as { _id: unknown })._id
          : prev;
      const prevInterviewerName =
        prev != null && typeof prev === 'object' && 'name' in (prev as object)
          ? String((prev as { name?: string }).name ?? 'Interviewer')
          : 'Interviewer';
      const jobTitle =
        c.jobId != null && typeof c.jobId === 'object' && 'title' in (c.jobId as object)
          ? String((c.jobId as { title?: string }).title ?? 'Job')
          : 'Job';

      return {
        candidateId,
        candidateName: (c as ICandidate).name ?? 'Candidate',
        jobId,
        jobTitle,
        previousInterviewerId: String(previousInterviewerId),
        previousInterviewerName: prevInterviewerName,
      };
    });

    return {
      success: true,
      updatedCount: toBroadcast.length,
      failedCount: 0,
      skippedCount,
      candidatesToBroadcast: toBroadcast,
      message: `Unassigned ${toBroadcast.length} candidate(s)`,
      unassignNotificationMeta:
        unassignments.length > 0 ? { unassignments } : undefined,
    };
  } catch (err) {
    logger.error({ error: err }, 'Bulk unassign: batch failed');
    return {
      success: false,
      updatedCount: 0,
      failedCount: candidates.length,
      skippedCount,
      candidatesToBroadcast: [],
      message: 'Unassign failed',
    };
  }
}
