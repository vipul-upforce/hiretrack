import { ICandidateHistory } from '@/lib/models/history';
import type { ICandidate } from '@/lib/models/candidate';
import { logger } from '@/lib/logger/logger.server';
import type {
  BulkAddFollowUpParams,
  BulkUpdateContext,
  BulkUpdateResult,
} from '../types';
import { getJobIdString } from '../utils';

export async function runBulkAddFollowUp(
  params: BulkAddFollowUpParams,
  ctx: BulkUpdateContext,
): Promise<BulkUpdateResult> {
  const { candidateIds, note, date } = params;
  const { user, dateTime, Candidate, History } = ctx;
  const toBroadcast: ICandidate[] = [];

  const candidates = await Candidate.find({
    _id: { $in: candidateIds },
    isDeleted: { $ne: true },
  })
    .populate([
      { path: 'assignment.interviewerId', select: '_id name email' },
      { path: 'followUp.userId', select: '_id name email' },
      { path: 'jobId', select: '_id title description' },
    ])
    .lean();

  if (candidates.length === 0) {
    return {
      success: true,
      updatedCount: 0,
      failedCount: 0,
      candidatesToBroadcast: [],
      message: 'No candidates found',
    };
  }

  const followUpPayload = {
    note: note ?? '',
    date: date ?? null,
    userId: user.id,
  };

  const historyEntry: ICandidateHistory = {
    dateTime,
    title: 'Followup Created',
    currentInterviewer: null,
    previousInterviewer: null,
    assignmentBy: user.id ?? null,
    note: {
      description: note,
      date: date ?? '',
      rating: 0,
      userId: user.id ?? null,
    },
    attachments: [],
  };

  const ids = candidates.map((c) =>
    (c._id as { toString: () => string }).toString(),
  );

  try {
    // Batch update: set followUp for all candidates
    await Candidate.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          followUp: followUpPayload,
          'tracking.updatedAt': new Date(dateTime),
        },
      },
    );

    // Build history bulk operations
    const historyBulk = candidates
      .filter((c) => getJobIdString(c))
      .map((c) => ({
        updateOne: {
          filter: {
            candidateId: (c._id as { toString: () => string }).toString(),
            jobId: getJobIdString(c),
          },
          update: { $push: { history: historyEntry } },
          upsert: true as const,
        },
      }));

    if (historyBulk.length > 0) {
      await History.bulkWrite(historyBulk);
    }

    // Single query to get all updated candidates
    const updatedList = await Candidate.find({ _id: { $in: ids } })
      .populate([
        { path: 'assignment.interviewerId', select: '_id name email' },
        { path: 'followUp.userId', select: '_id name email' },
        { path: 'jobId', select: 'title description' },
      ])
      .lean();

    toBroadcast.push(...(updatedList as ICandidate[]));

    const addFollowUpNotificationMeta =
      toBroadcast.length > 0
        ? {
            followupNote: note ?? '',
            followupDate: date ?? null,
            candidates: toBroadcast.map((c) => ({
              candidateId:
                (c as unknown as { _id: unknown })._id?.toString() ?? '',
              candidateName: (c as ICandidate).name ?? 'Candidate',
              jobId: getJobIdString(c as ICandidate) ?? '',
              jobTitle:
                c.jobId != null &&
                typeof c.jobId === 'object' &&
                'title' in (c.jobId as object)
                  ? String((c.jobId as { title?: string }).title ?? 'Job')
                  : 'Job',
            })),
          }
        : undefined;

    return {
      success: true,
      updatedCount: toBroadcast.length,
      failedCount: 0,
      candidatesToBroadcast: toBroadcast,
      message: `Added follow-up to ${toBroadcast.length} candidate(s)`,
      addFollowUpNotificationMeta,
    };
  } catch (err) {
    logger.error({ error: err }, 'Bulk addFollowUp: batch failed');
    return {
      success: false,
      updatedCount: 0,
      failedCount: candidates.length,
      candidatesToBroadcast: [],
      message: 'Add follow-up failed',
    };
  }
}
