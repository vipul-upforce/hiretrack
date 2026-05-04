import { ICandidateHistory, IinfoUpdateLog } from '@/lib/models/history';
import type { ICandidate } from '@/lib/models/candidate';
import { logger } from '@/lib/logger/logger.server';
import { getNextStep } from '@/lib/utils/organization';
import type {
  BulkStatusUpdateParams,
  BulkUpdateContext,
  BulkUpdateResult,
} from '../types';
import { getJobIdString } from '../utils';

export async function runBulkStatusUpdate(
  params: BulkStatusUpdateParams,
  ctx: BulkUpdateContext,
): Promise<BulkUpdateResult> {
  const { candidateIds, status } = params;
  const { user, dateTime, Candidate, History } = ctx;

  const candidates = await Candidate.find({
    _id: { $in: candidateIds },
    isDeleted: { $ne: true },
  })
    .select('_id jobId name status')
    .populate('jobId', 'title')
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

  try {
    await Candidate.updateMany(
      { _id: { $in: ids } },
      { $set: { status }, $currentDate: { 'tracking.updatedAt': true } },
    );

    // Create history entries with logs format (IinfoUpdateLog[]) for each candidate
    const historyBulk = candidates.map((c) => {
      const candidateId = (c._id as { toString: () => string }).toString();
      const oldStatus = (c as ICandidate).status ?? 'Unknown';

      // Create IinfoUpdateLog entry matching normal status update format
      const statusUpdateLog: IinfoUpdateLog = {
        title: 'Updated Status',
        previousValue: oldStatus,
        currentValue: status,
      };

      const historyEntry: ICandidateHistory = {
        dateTime,
        title: 'Updated Status',
        currentInterviewer: null,
        previousInterviewer: null,
        assignmentBy: user.id ?? null,
        note: {
          description: [statusUpdateLog], // Array of IinfoUpdateLog for logs section
          date: dateTime,
          rating: 0,
          userId: user.id ?? null,
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

    const updatedList = await Candidate.find({ _id: { $in: ids } })
      .populate([
        { path: 'assignment.interviewerId', select: '_id name email' },
        { path: 'followUp.userId', select: '_id name email' },
        // { path: 'jobId', select: 'title description' },
      ])
      .lean();

    const statusUpdateCandidates = candidates.map((c) => {
      const candidateId = (c._id as { toString: () => string }).toString();
      const jobId = getJobIdString(c) ?? '';
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
        oldStatus: (c as ICandidate).status ?? 'Unknown',
      };
    });

    let nextStep = 'N/A';
    if (statusUpdateCandidates.length > 0 && user.organizationId) {
      try {
        const firstJobId = statusUpdateCandidates[0]?.jobId ?? null;
        nextStep = await getNextStep(
          firstJobId,
          status,
          user.organizationId as string,
        );
      } catch (err) {
        logger.warn(
          { err },
          'Bulk statusUpdate: failed to get next step from job',
        );
      }
    }

    const statusUpdateNotificationMeta =
      statusUpdateCandidates.length > 0
        ? {
            newStatus: status,
            nextStep,
            statusMessage: params.remark?.trim() || undefined,
            candidates: statusUpdateCandidates,
          }
        : undefined;

    return {
      success: true,
      updatedCount: updatedList.length,
      failedCount: 0,
      candidatesToBroadcast: updatedList as ICandidate[],
      message: `Updated status for ${updatedList.length} candidate(s)`,
      statusUpdateNotificationMeta,
    };
  } catch (err) {
    logger.error({ error: err }, 'Bulk statusUpdate: batch failed');
    return {
      success: false,
      updatedCount: 0,
      failedCount: candidates.length,
      candidatesToBroadcast: [],
      message: 'Status update failed',
    };
  }
}
