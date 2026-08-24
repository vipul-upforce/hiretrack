import { ICandidateHistory } from '@/lib/models/history';
import type { ICandidate } from '@/lib/models/candidate';
import { logger } from '@/lib/logger/logger.server';
import connectToDatabase, { Lane } from '@/lib/mongodb';
import { getJobAppliedLaneId } from '@/lib/services/laneService';
import type {
  BulkMoveJobParams,
  BulkUpdateContext,
  BulkUpdateResult,
} from '../types';
import { transformCandidatesWithStatusNames } from '../utils';

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

  const appliedLaneId = organizationId
    ? await getJobAppliedLaneId(organizationId, jobId)
    : null;
  if (!appliedLaneId) {
    return {
      success: false,
      updatedCount: 0,
      failedCount: validCandidates.length,
      candidatesToBroadcast: [],
      message:
        'Applied lane not found for target job. Please ensure default lanes are set up.',
    };
  }
  const ids = validCandidates.map((c) => c._id.toString());
  const previousJobIdByCandidateId = new Map<string, string | null>(
    validCandidates.map((c) => [c._id.toString(), c.jobId?.toString() ?? null]),
  );

  // Resolve previous status (lane) to name so clients can decrement the correct lane
  // when the candidate was not loaded due to different sorting (e.g. Client A desc, Client B asc).
  const previousStatusByCandidateId = new Map<string, string>();
  const statusIds = validCandidates
    .map((c) => {
      const s = (c as ICandidate).status;
      if (!s) return null;
      if (typeof s === 'string') return /^[0-9a-fA-F]{24}$/.test(s) ? s : null;
      if (typeof s === 'object' && s !== null && '_id' in s)
        return String((s as { _id?: unknown })._id ?? '');
      return null;
    })
    .filter((id): id is string => id !== null);
  const uniqueStatusIds = [...new Set(statusIds)];
  let previousStatusNameByStatusId = new Map<string, string>();
  if (uniqueStatusIds.length > 0) {
    await connectToDatabase();
    if (Lane) {
      const lanes = await Lane.find({ _id: { $in: uniqueStatusIds } })
        .select('_id name')
        .lean();
      if (lanes.length > 0) {
        previousStatusNameByStatusId = new Map(
          lanes.map((l) => [l._id.toString(), (l.name ?? '').toLowerCase()]),
        );
      }
    }
  }
  for (const c of validCandidates) {
    const cid = c._id.toString();
    const s = (c as ICandidate).status as unknown;
    let statusId: string | null = null;
    if (typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s)) statusId = s;
    else if (typeof s === 'object' && s !== null && '_id' in (s as object))
      statusId = String((s as { _id?: unknown })._id ?? '');
    if (statusId) {
      const name = previousStatusNameByStatusId.get(statusId);
      if (name) previousStatusByCandidateId.set(cid, name);
    } else if (typeof s === 'string' && String(s).trim())
      previousStatusByCandidateId.set(cid, String(s).toLowerCase());
    else if (s && typeof s === 'object' && 'name' in (s as { name?: unknown })) {
      const n = (s as { name?: string }).name;
      if (n) previousStatusByCandidateId.set(cid, String(n).toLowerCase());
    }
  }

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
          status: appliedLaneId,
          'tracking.assignedToJobDate': new Date().toISOString(),
          'tracking.updatedAt': new Date(dateTime),
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

    // Update old history documents (move jobId reference) - no longer needed; history is keyed by candidateId only

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
        { path: 'status', select: 'name' },
      ])
      .lean();

    const transformedCandidates = await transformCandidatesWithStatusNames(
      updatedList as ICandidate[],
    );
    const toBroadcast = transformedCandidates.map((c) => {
      const cid =
        (c as { _id?: unknown })._id?.toString?.() ??
        String((c as { _id?: unknown })._id ?? '');
      return {
        ...c,
        jobId: {
          _id: jobId,
          title: targetJob.title,
          description: (targetJob as { description?: string }).description,
        },
        // Per-candidate prior jobId so clients can apply correct jobSwitchIn/out deltas
        // even when candidates are not on the current page (sorting/pagination differences).
        previousJobIdFromSSE: previousJobIdByCandidateId.get(cid),
        // Previous lane name on the source job so the source-job client can decrement the correct
        // lane count when the candidate was not loaded (e.g. different sort: Client A desc, Client B asc).
        previousStatusFromSSE: previousStatusByCandidateId.get(cid),
      };
    });

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
