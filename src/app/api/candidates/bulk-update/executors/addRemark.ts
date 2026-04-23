import { v4 as uuidv4 } from 'uuid';
import { ICandidateHistory } from '@/lib/models/history';
import type { ICandidate } from '@/lib/models/candidate';
import { logger } from '@/lib/logger/logger.server';
import type {
  BulkAddRemarkParams,
  BulkUpdateContext,
  BulkUpdateResult,
} from '../types';
import { getJobIdString } from '../utils';

export async function runBulkAddRemark(
  params: BulkAddRemarkParams,
  ctx: BulkUpdateContext,
): Promise<BulkUpdateResult> {
  const { candidateIds, description, isPrivate = false, rating = 0 } = params;
  const { user, dateTime, Candidate, History } = ctx;
  const toBroadcast: ICandidate[] = [];

  const candidates = await Candidate.find({
    _id: { $in: candidateIds },
    isDeleted: { $ne: true },
  })
    .populate([
      { path: 'assignment.interviewerId', select: '_id name email' },
      { path: 'remarks.userId', select: 'name email' },
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

  const ids = candidates.map((c) =>
    (c._id as { toString: () => string }).toString(),
  );
  const newRemarkDoc = {
    description,
    date: dateTime,
    rating,
    userId: user.id,
  };

  try {
    // Batch update: push remark to all candidates
    await Candidate.updateMany(
      { _id: { $in: ids } },
      {
        $push: { remarks: newRemarkDoc },
        $set: { 'tracking.updatedAt': new Date(dateTime) },
      },
    );

    // Build history bulk operations (each needs unique remarkId)
    const historyBulk = candidates.map((c) => {
      const candidateId = (c._id as { toString: () => string }).toString();
      const remarkId = uuidv4();
      const historyEntry: ICandidateHistory = {
        dateTime,
        title: 'Remark Added',
        currentInterviewer: null,
        previousInterviewer: null,
        assignmentBy: user.id ?? null,
        remark: {
          id: remarkId,
          isPrivate,
          description,
          date: dateTime,
          rating,
          userId: {
            _id: user.id,
            name: user.name,
            email: user.email ?? '',
          },
        },
        note: { description: '', date: '', rating: 0, userId: null },
        attachments: [],
      };

      return {
        updateOne: {
          filter: { candidateId },
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
        { path: 'remarks.userId', select: 'name email' },
        { path: 'followUp.userId', select: '_id name email' },
        { path: 'jobId', select: 'title description' },
      ])
      .lean();

    toBroadcast.push(...(updatedList as ICandidate[]));

    const addRemarkNotificationMeta =
      toBroadcast.length > 0
        ? {
            remarkText: description,
            roles: ['admin', 'hr'],
            validMentionUserIds: params.selectedMentionUserIds,
            rating,
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
      message: `Added remark to ${toBroadcast.length} candidate(s)`,
      addRemarkNotificationMeta,
    };
  } catch (err) {
    logger.error({ error: err }, 'Bulk addRemark: batch failed');
    return {
      success: false,
      updatedCount: 0,
      failedCount: candidates.length,
      candidatesToBroadcast: [],
      message: 'Add remark failed',
    };
  }
}
