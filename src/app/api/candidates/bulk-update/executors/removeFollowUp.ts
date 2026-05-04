import { ICandidateHistory } from '@/lib/models/history';
import type { ICandidate } from '@/lib/models/candidate';
import { logger } from '@/lib/logger/logger.server';
import type {
  BulkRemoveFollowUpParams,
  BulkUpdateContext,
  BulkUpdateResult,
} from '../types';
import { getJobIdString } from '../utils';
import { cancelPendingFollowUpRemindersForCandidates } from '@/lib/followups/reminderQueue';

function hasFollowUp(candidate: ICandidate): boolean {
  const note = candidate.followUp?.note;
  const date = candidate.followUp?.date;
  return Boolean((typeof note === 'string' && note.trim()) || date);
}

export async function runBulkRemoveFollowUp(
  params: BulkRemoveFollowUpParams,
  ctx: BulkUpdateContext,
): Promise<BulkUpdateResult> {
  const { candidateIds } = params;
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

  const candidatesToUpdate = candidates.filter(hasFollowUp);
  const ids = candidatesToUpdate.map((c) =>
    (c._id as { toString: () => string }).toString(),
  );

  if (ids.length === 0) {
    return {
      success: true,
      updatedCount: 0,
      failedCount: 0,
      candidatesToBroadcast: [],
      message: 'No follow-up to remove',
    };
  }

  const followUpPayload = {
    note: null,
    date: null,
    userId: user.id,
  };

  const historyEntry: ICandidateHistory = {
    dateTime,
    title: 'Followup Removed',
    currentInterviewer: null,
    previousInterviewer: null,
    assignmentBy: user.id ?? null,
    note: {
      description: '',
      date: '',
      rating: 0,
      userId: user.id ?? null,
    },
    attachments: [],
  };

  try {
    await Candidate.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          followUp: followUpPayload,
          'tracking.updatedAt': new Date(dateTime),
        },
      },
    );

    const historyBulk = candidatesToUpdate.map((c) => ({
      updateOne: {
        filter: {
          candidateId: (c._id as { toString: () => string }).toString(),
        },
        update: { $push: { history: historyEntry } },
        upsert: true as const,
      },
    }));

    if (historyBulk.length > 0) {
      await History.bulkWrite(historyBulk);
    }

    const updatedList = await Candidate.find({ _id: { $in: ids } })
      .populate([
        { path: 'assignment.interviewerId', select: '_id name email' },
        { path: 'followUp.userId', select: '_id name email' },
        { path: 'jobId', select: 'title description' },
      ])
      .lean();

    toBroadcast.push(...(updatedList as ICandidate[]));

    if (user.organizationId && ids.length > 0) {
      try {
        await cancelPendingFollowUpRemindersForCandidates({
          organizationId: user.organizationId,
          candidateIds: ids,
        });
      } catch (cancelError) {
        logger.error(
          { message: String(cancelError), name: 'CancelError' },
          'Bulk removeFollowUp: failed to cancel pending follow-up reminders',
        );
      }
    }

    const removeFollowUpNotificationMeta =
      toBroadcast.length > 0
        ? {
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
      message: `Removed follow-up from ${toBroadcast.length} candidate(s)`,
      removeFollowUpNotificationMeta,
    };
  } catch (err) {
    logger.error({ message: String(err), name: 'RemoveFollowUpError' }, 'Bulk removeFollowUp: batch failed');
    return {
      success: false,
      updatedCount: 0,
      failedCount: candidatesToUpdate.length,
      candidatesToBroadcast: [],
      message: 'Remove follow-up failed',
    };
  }
}
