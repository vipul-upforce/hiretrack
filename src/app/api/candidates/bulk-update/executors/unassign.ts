import { ICandidateHistory } from '@/lib/models/history';
import type { ICandidate } from '@/lib/models/candidate';
import { logger } from '@/lib/logger/logger.server';
import { getNextStep } from '@/lib/utils/organization';
import { Schema } from 'mongoose';
import type {
  BulkUnassignParams,
  BulkUpdateContext,
  BulkUpdateResult,
} from '../types';
import { getJobIdString, transformCandidatesWithStatusNames } from '../utils';

export async function runBulkUnassign(
  params: BulkUnassignParams,
  ctx: BulkUpdateContext,
): Promise<BulkUpdateResult> {
  const { candidateIds, remark } = params;
  const { user, dateTime, Candidate, History } = ctx;
  const toBroadcast: ICandidate[] = [];

  const candidates = await Candidate.find({
    _id: { $in: candidateIds },
    // isDeleted: { $ne: true },
    'assignment.interviewerId': { $exists: true, $ne: null },
  })
    .populate([
      { path: 'assignment.interviewerId', select: '_id name email' },
      { path: 'followUp.userId', select: '_id name email' },
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

  const ids = candidates.map((c) =>
    (c._id as { toString: () => string }).toString(),
  );

  try {
    // Batch update: set assignment to null for all candidates
    await Candidate.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          assignment: null,
          'tracking.updatedAt': new Date(dateTime),
        },
      },
    );

    // Build history bulk operations
    const historyBulk = candidates.map((c) => {
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
        previousInterviewer:
          previousInterviewerId as Schema.Types.ObjectId | null,
        assignmentBy: user.id ?? null,
        note: {
          description: remark ?? '',
          date: '',
          rating: 0,
          userId: null,
          isPrivate: !!remark, // Hide remark from interviewer when combined
        },
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
        { path: 'followUp.userId', select: '_id name email' },
        { path: 'jobId', select: 'title description' },
        { path: 'status', select: 'name' },
      ])
      .lean();

    const transformedCandidates = await transformCandidatesWithStatusNames(
      updatedList as ICandidate[],
    );
    toBroadcast.push(...transformedCandidates);

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
        c.jobId != null &&
        typeof c.jobId === 'object' &&
        'title' in (c.jobId as object)
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

    // Get next status from job lanes (next step after current status)
    let nextStep = 'N/A';
    if (user.organizationId && candidates.length > 0) {
      try {
        const firstCandidate = candidates[0] as ICandidate;
        const jobId = getJobIdString(firstCandidate);
        const currentStatus = firstCandidate.status ?? '';
        nextStep = await getNextStep(
          jobId,
          currentStatus,
          user.organizationId as string,
        );
      } catch (err) {
        logger.warn({ err }, 'Bulk unassign: failed to get next step from job');
      }
    }

    return {
      success: true,
      updatedCount: toBroadcast.length,
      failedCount: 0,
      skippedCount,
      candidatesToBroadcast: toBroadcast,
      message: `Unassigned ${toBroadcast.length} candidate(s)`,
      unassignNotificationMeta:
        unassignments.length > 0
          ? {
              unassignments,
              feedback: remark ?? 'N/A',
              nextStep,
            }
          : undefined,
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
