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

  const unassignments: Array<{
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    previousInterviewerId: string;
    previousInterviewerName: string;
  }> = [];

  for (const candidate of candidates) {
    try {
      const candidateId = (candidate._id as { toString: () => string }).toString();
      const jobId = getJobIdString(candidate);
      const prev = candidate.assignment?.interviewerId;
      const previousInterviewerId =
        prev != null && typeof prev === 'object' && '_id' in prev
          ? (prev as { _id: unknown })._id
          : prev;
      const prevInterviewerName =
        prev != null && typeof prev === 'object' && 'name' in (prev as object)
          ? String((prev as { name?: string }).name ?? 'Interviewer')
          : 'Interviewer';
      const jobTitle =
        candidate.jobId != null && typeof candidate.jobId === 'object' && 'title' in (candidate.jobId as object)
          ? String((candidate.jobId as { title?: string }).title ?? 'Job')
          : 'Job';

      const historyEntry: ICandidateHistory = {
        dateTime,
        title: 'Unassigned',
        currentInterviewer: null,
        previousInterviewer: previousInterviewerId as string | null,
        assignmentBy: user.id ?? null,
        note: { description: '', date: '', rating: 0, userId: null },
        attachments: [],
      };

      await Candidate.updateOne({ _id: candidateId }, { $set: { assignment: null } });
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
        unassignments.push({
          candidateId,
          candidateName: (candidate as ICandidate).name ?? 'Candidate',
          jobId,
          jobTitle,
          previousInterviewerId: String(previousInterviewerId),
          previousInterviewerName: prevInterviewerName,
        });
      }
    } catch (err) {
      logger.error(
        { error: err, candidateId: (candidate as { _id: unknown })._id },
        'Bulk unassign: failed one candidate',
      );
      failedCount += 1;
    }
  }

  return {
    success: true,
    updatedCount: toBroadcast.length,
    failedCount,
    skippedCount,
    candidatesToBroadcast: toBroadcast,
    message: `Unassigned ${toBroadcast.length} candidate(s)`,
    unassignNotificationMeta:
      unassignments.length > 0 ? { unassignments } : undefined,
  };
}
