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
  const ids = validCandidates.map((c) => c._id.toString());

  // Fetch previous jobs in batch
  const previousJobIds = [
    ...new Set(
      validCandidates
        .map((c) => c.jobId?.toString())
        .filter(Boolean) as string[],
    ),
  ];
  const previousJobsMap = new Map<string, { title?: string } | null>();
  if (previousJobIds.length > 0) {
    const previousJobs = await Job.find({ _id: { $in: previousJobIds } })
      .select('_id title')
      .lean();
    previousJobs.forEach((job) => {
      previousJobsMap.set(job._id.toString(), job);
    });
  }

  try {
    // Batch update: set jobId, status, and assignedToJobDate for all candidates
    await Candidate.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          jobId,
          status: lane,
          'tracking.assignedToJobDate': new Date().toISOString(),
        },
      },
    );

    // Update duplicate candidates (if needed)
    if (DuplicateCandidate && organizationId) {
      const duplicateUpdates = validCandidates
        .filter((c) => c.email && c._id)
        .map((c) => ({
          updateOne: {
            filter: {
              email: c.email!.toLowerCase(),
              orgId: organizationId,
              'duplicates.candidateId': c._id,
            },
            update: { $set: { 'duplicates.$.jobId': jobId ?? null } },
          },
        }));

      if (duplicateUpdates.length > 0) {
        await DuplicateCandidate.bulkWrite(duplicateUpdates).catch((err) => {
          logger.error(
            { error: err },
            'Bulk moveJob: duplicate update batch failed',
          );
        });
      }
    }

    // Update old history documents (move jobId reference)
    const oldHistoryUpdates = validCandidates
      .filter((c) => c.jobId?.toString())
      .map((c) => ({
        updateOne: {
          filter: {
            candidateId: c._id.toString(),
            jobId: c.jobId!.toString(),
          },
          update: { $set: { jobId } },
        },
      }));

    if (oldHistoryUpdates.length > 0) {
      await History.bulkWrite(oldHistoryUpdates).catch((err) => {
        logger.error({ error: err }, 'Bulk moveJob: old history update failed');
      });
    }

    // Build new history entries
    const historyBulk = validCandidates.map((c) => {
      const candidateId = c._id.toString();
      const previousJobId = c.jobId?.toString() ?? null;
      const previousJob = previousJobId
        ? previousJobsMap.get(previousJobId)
        : null;

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

      return {
        updateOne: {
          filter: { jobId, candidateId },
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
        { path: 'jobId', select: 'title description' },
      ])
      .lean();

    const toBroadcast = updatedList.map((c) => ({
      ...c,
      jobId: {
        _id: jobId,
        title: targetJob.title,
        description: (targetJob as { description?: string }).description,
      },
    }));

    return {
      success: true,
      updatedCount: toBroadcast.length,
      failedCount: 0,
      candidatesToBroadcast:
        toBroadcast as BulkUpdateResult['candidatesToBroadcast'],
      message: `Moved ${toBroadcast.length} candidate(s) to job`,
      meta: { jobTitle: targetJob.title, toJobId: jobId },
    };
  } catch (err) {
    logger.error({ error: err }, 'Bulk moveJob: batch failed');
    return {
      success: false,
      updatedCount: 0,
      failedCount: validCandidates.length,
      candidatesToBroadcast: [],
      message: 'Move job failed',
    };
  }
}
