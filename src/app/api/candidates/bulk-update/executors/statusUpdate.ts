import { ICandidateHistory } from '@/lib/models/history';
import type { ICandidate } from '@/lib/models/candidate';
import type { BulkStatusUpdateParams, BulkUpdateContext, BulkUpdateResult } from '../types';
import { getJobIdString } from '../utils';
import { logger } from '@/lib/logger/logger.server';

export async function runBulkStatusUpdate(
  params: BulkStatusUpdateParams,
  ctx: BulkUpdateContext,
): Promise<BulkUpdateResult> {
  const { candidateIds, status } = params;
  const { user, dateTime, Candidate, History } = ctx;
  const toBroadcast: ICandidate[] = [];
  let failedCount = 0;

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
    return {
      success: true,
      updatedCount: 0,
      failedCount: 0,
      candidatesToBroadcast: [],
      message: 'No candidates found',
    };
  }

  const historyEntry: ICandidateHistory = {
    dateTime,
    title: 'Status Updated',
    currentInterviewer: null,
    previousInterviewer: null,
    assignmentBy: user.id ?? null,
    note: {
      description: `Status changed to ${status}`,
      date: dateTime,
      rating: 0,
      userId: user.id ?? null,
    },
    attachments: [],
  };

  const statusUpdateCandidates: Array<{
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    oldStatus: string;
  }> = [];

  for (const candidate of candidates) {
    try {
      const candidateId = (candidate._id as { toString: () => string }).toString();
      const jobId = getJobIdString(candidate);
      const oldStatus = (candidate as ICandidate).status ?? 'Unknown';
      const jobTitle =
        candidate.jobId != null &&
        typeof candidate.jobId === 'object' &&
        'title' in (candidate.jobId as object)
          ? String((candidate.jobId as { title?: string }).title ?? 'Job')
          : 'Job';

      await Candidate.updateOne(
        { _id: candidateId },
        { $set: { status }, $currentDate: { 'tracking.updatedAt': true } },
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
        toBroadcast.push(updated as ICandidate);
        statusUpdateCandidates.push({
          candidateId,
          candidateName: (candidate as ICandidate).name ?? 'Candidate',
          jobId: jobId ?? '',
          jobTitle,
          oldStatus,
        });
      }
    } catch (err) {
      logger.error({ error: err, candidateId: (candidate as { _id: unknown })._id }, 'Bulk statusUpdate: failed one candidate');
      failedCount += 1;
    }
  }

  const statusUpdateNotificationMeta =
    statusUpdateCandidates.length > 0
      ? {
          newStatus: status,
          candidates: statusUpdateCandidates,
        }
      : undefined;

  return {
    success: true,
    updatedCount: toBroadcast.length,
    failedCount,
    candidatesToBroadcast: toBroadcast,
    message: `Updated status for ${toBroadcast.length} candidate(s)`,
    statusUpdateNotificationMeta,
  };
}
