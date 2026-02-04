import { ICandidateHistory } from '@/lib/models/history';
import type { ICandidate } from '@/lib/models/candidate';
import type { BulkAddFollowUpParams, BulkUpdateContext, BulkUpdateResult } from '../types';
import { getJobIdString } from '../utils';
import { logger } from '@/lib/logger/logger.server';

export async function runBulkAddFollowUp(
  params: BulkAddFollowUpParams,
  ctx: BulkUpdateContext,
): Promise<BulkUpdateResult> {
  const { candidateIds, note, date } = params;
  const { user, dateTime, Candidate, History } = ctx;
  const toBroadcast: ICandidate[] = [];
  let failedCount = 0;

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

  for (const candidate of candidates) {
    try {
      const candidateId = (candidate._id as { toString: () => string }).toString();
      const jobId = getJobIdString(candidate);

      await Candidate.updateOne(
        { _id: candidateId },
        { $set: { followUp: followUpPayload } },
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
          { path: 'followUp.userId', select: '_id name email' },
          { path: 'jobId', select: 'title description' },
        ])
        .lean();
      if (updated) toBroadcast.push(updated as ICandidate);
    } catch (err) {
      logger.error({ error: err, candidateId: (candidate as { _id: unknown })._id }, 'Bulk addFollowUp: failed one candidate');
      failedCount += 1;
    }
  }

  return {
    success: true,
    updatedCount: toBroadcast.length,
    failedCount,
    candidatesToBroadcast: toBroadcast,
    message: `Added follow-up to ${toBroadcast.length} candidate(s)`,
  };
}
