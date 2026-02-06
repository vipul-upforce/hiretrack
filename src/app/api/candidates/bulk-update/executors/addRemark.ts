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
  let failedCount = 0;

  const candidates = await Candidate.find({
    _id: { $in: candidateIds },
    isDeleted: { $ne: true },
  })
    .populate([
      { path: 'assignment.interviewerId', select: '_id name email' },
      { path: 'remarks.userId', select: 'name email' },
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

  for (const candidate of candidates) {
    try {
      const candidateId = (
        candidate._id as { toString: () => string }
      ).toString();
      const jobId = getJobIdString(candidate) ?? null;
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
          userId: user.id as unknown as ICandidateHistory['remark'],
        },
        note: { description: '', date: '', rating: 0, userId: null },
        attachments: [],
      };

      await History.findOneAndUpdate(
        { candidateId, jobId },
        { $push: { history: historyEntry } },
        { upsert: true },
      );

      const newRemarkDoc = {
        description,
        date: dateTime,
        rating,
        userId: user.id,
      };
      await Candidate.updateOne(
        { _id: candidateId },
        { $push: { remarks: newRemarkDoc } },
      );

      const updated = await Candidate.findById(candidateId)
        .populate([
          { path: 'assignment.interviewerId', select: '_id name email' },
          { path: 'remarks.userId', select: 'name email' },
          { path: 'jobId', select: 'title description' },
        ])
        .lean();
      if (updated) toBroadcast.push(updated as ICandidate);
    } catch (err) {
      logger.error(
        { error: err, candidateId: (candidate as { _id: unknown })._id },
        'Bulk addRemark: failed one candidate',
      );
      failedCount += 1;
    }
  }

  const addRemarkNotificationMeta =
    toBroadcast.length > 0
      ? {
          remarkText: description,
          roles: ['admin', 'hr'],
          validMentionUserIds: params.selectedMentionUserIds,
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
    failedCount,
    candidatesToBroadcast: toBroadcast,
    message: `Added remark to ${toBroadcast.length} candidate(s)`,
    addRemarkNotificationMeta,
  };
}
