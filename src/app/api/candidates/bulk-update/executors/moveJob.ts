import { ICandidateHistory } from '@/lib/models/history';
import { logger } from '@/lib/logger/logger.server';
import type {
  BulkMoveJobParams,
  BulkUpdateContext,
  BulkUpdateResult,
} from '../types';

export async function runBulkMoveJob(
  params: BulkMoveJobParams,
  ctx: BulkUpdateContext,
): Promise<BulkUpdateResult> {
  const { candidateIds, jobId } = params;
  const { user, dateTime, Candidate, History, Job, DuplicateCandidate } = ctx;
  const { organizationId } = user;

  const targetJob = await Job.findById(jobId);
  if (!targetJob) {
    return {
      success: false,
      updatedCount: 0,
      failedCount: 0,
      candidatesToBroadcast: [],
      message: 'Target job not found',
    };
  }

  const candidates = await Candidate.find({ _id: { $in: candidateIds } });
  const validCandidates = candidates.filter(
    (c) => c.jobId?.toString() !== jobId,
  );

  if (validCandidates.length === 0) {
    return {
      success: true,
      updatedCount: 0,
      failedCount: 0,
      candidatesToBroadcast: [],
      message: 'No valid candidates to move',
    };
  }

  const lane = 'applied';
  const toBroadcast: Record<string, unknown>[] = [];
  let failedCount = 0;

  for (const candidate of validCandidates) {
    try {
      const candidateId = candidate._id.toString();
      const previousJobId = candidate.jobId?.toString() ?? null;
      const previousJob = previousJobId
        ? await Job.findById(previousJobId)
        : null;

      await Candidate.findByIdAndUpdate(candidateId, {
        jobId,
        status: lane,
        $set: { 'tracking.assignedToJobDate': new Date().toISOString() },
      });

      if (
        candidate.email &&
        organizationId &&
        candidate._id &&
        DuplicateCandidate
      ) {
        try {
          await DuplicateCandidate.findOneAndUpdate(
            {
              email: candidate.email.toLowerCase(),
              orgId: organizationId,
              'duplicates.candidateId': candidate._id,
            },
            { $set: { 'duplicates.$.jobId': jobId ?? null } },
            { new: true },
          );
        } catch (err) {
          logger.error(
            { err, candidateId },
            'Bulk moveJob: duplicate update failed',
          );
        }
      }

      if (previousJobId) {
        const existing = await History.findOne({
          candidateId,
          jobId: previousJobId,
        });
        if (existing) {
          await History.findOneAndUpdate(
            { candidateId, jobId: previousJobId },
            { $set: { jobId } },
          );
        }
      }

      const historyEntry: ICandidateHistory = {
        dateTime,
        title: 'Assigned to Job',
        note: {
          description: `Candidate moved from ${previousJob?.title ?? 'No previous job'} to ${targetJob.title}`,
          date: new Date().toISOString(),
          rating: 0,
          userId: user.id,
        },
        attachments: [],
        currentInterviewer: null,
        previousInterviewer: null,
        assignmentBy: user.id,
      };

      await History.findOneAndUpdate(
        { jobId, candidateId },
        { $push: { history: historyEntry } },
        { upsert: true },
      );

      const updated = await Candidate.findById(candidateId).populate([
        { path: 'assignment.interviewerId', select: '_id name email' },
        { path: 'remarks.userId', select: 'name email' },
        { path: 'jobId', select: 'title description' },
      ]);
      if (updated) {
        const obj = updated.toObject();
        toBroadcast.push({
          ...obj,
          jobId: {
            _id: jobId,
            title: targetJob.title,
            description: (targetJob as { description?: string }).description,
          },
        });
      }
    } catch (err) {
      logger.error(
        { err, candidateId: candidate._id },
        'Bulk moveJob: failed one candidate',
      );
      failedCount += 1;
    }
  }

  return {
    success: true,
    updatedCount: toBroadcast.length,
    failedCount,
    candidatesToBroadcast:
      toBroadcast as BulkUpdateResult['candidatesToBroadcast'],
    message: `Moved ${toBroadcast.length} candidate(s) to job`,
    meta: { jobTitle: targetJob.title, toJobId: jobId },
  };
}
