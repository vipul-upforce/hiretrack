import { ICandidateHistory, IinfoUpdateLog } from '@/lib/models/history';
import { logger } from '@/lib/logger/logger.server';
import { getLaneIdByName } from '@/lib/services/laneService';
import connectToDatabase ,{ Lane } from '@/lib/mongodb';
import type { ICandidate } from '@/lib/models/candidate';
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
  const { organizationId: userOrgId } = user;

  if (!userOrgId) {
    return {
      success: false,
      updatedCount: 0,
      failedCount: candidateIds.length,
      candidatesToBroadcast: [],
      message: 'Organization ID not found',
    };
  }

  await connectToDatabase();
  if (!Lane) {
    return {
      success: false,
      updatedCount: 0,
      failedCount: candidateIds.length,
      candidatesToBroadcast: [],
      message: 'Lane model not available',
    };
  }

  const candidates = await Candidate.find({
    _id: { $in: candidateIds },
    // isDeleted: { $ne: true },
  })
    .select('_id jobId name status')
    .populate('jobId', 'title')
    .lean();
  logger.info({ candidates ,status}, 'Candidates found in statusUpdate 49');
  if (candidates.length === 0) {
    return {
      success: true,
      updatedCount: 0,
      failedCount: 0,
      candidatesToBroadcast: [],
      message: 'No candidates found',
    };
  }

  try {
    // Convert status (lane name) to ObjectId if it's not already an ObjectId
    let statusObjectId = status;
    let newStatusName = status;
    
    // Check if status is a lane name (not an ObjectId)
    const isLaneName = typeof status === 'string' && !/^[0-9a-fA-F]{24}$/.test(status);
    if (isLaneName) {
      // It's a lane name, convert to ObjectId
      // For bulk updates, we need to handle candidates that might be in different jobs
      // We'll convert for each candidate individually since lanes are job-specific
      newStatusName = status;
    } else {
      // It's already an ObjectId, fetch the lane name
      const lane = await Lane.findById(status).select('name').lean();
      if (lane?.name) {
        newStatusName = lane.name;
      }
      statusObjectId = status;
    }

    // Get old status names for all candidates
    const oldStatusIds = candidates
      .map((c) => {
        const candidateStatus = (c as ICandidate).status;
        if (!candidateStatus) return null;
        if (typeof candidateStatus === 'string') {
          // If it's already a string, it might be a lane name or ObjectId string
          return /^[0-9a-fA-F]{24}$/.test(candidateStatus) ? candidateStatus : null;
        }
        // If it's an ObjectId object, convert to string
        return candidateStatus.toString();
      })
      .filter((id): id is string => id !== null);

    // Fetch old lane names in bulk
    const oldLanes = oldStatusIds.length > 0
      ? await Lane.find({ _id: { $in: oldStatusIds } })
          .select('_id name')
          .lean()
      : [];
    
    const oldLaneMap = new Map(
      oldLanes.map((lane) => [
        lane._id.toString(),
        lane.name,
      ]),
    );

    // Process candidates and convert status to ObjectId for each
    // Group candidates by jobId to batch lane lookups
    const candidatesByJobId = new Map<string | null, typeof candidates>();
    for (const c of candidates) {
      const jobId = getJobIdString(c);
      if (!candidatesByJobId.has(jobId)) {
        candidatesByJobId.set(jobId, []);
      }
      candidatesByJobId.get(jobId)!.push(c);
    }

    // Convert lane name to ObjectId per job (if status is a lane name)
    const jobLaneMap = new Map<string | null, string>();
    if (isLaneName) {
      // Status is a lane name, convert to ObjectId for each unique jobId
      const jobIds = Array.from(candidatesByJobId.keys());
      const laneLookups = await Promise.all(
        jobIds.map(async (jobId) => {
          const laneId = await getLaneIdByName(
            userOrgId,
            jobId,
            status,
          );
          return { jobId, laneId };
        }),
      );
      for (const { jobId, laneId } of laneLookups) {
        if (laneId) {
          jobLaneMap.set(jobId, laneId.toString());
        }
      }
    }

    const candidateUpdates = candidates
      .map((c) => {
        const candidateId = (c._id as { toString: () => string }).toString();
        const jobId = getJobIdString(c);
        
        let candidateStatusObjectId = statusObjectId;
        let candidateNewStatusName = newStatusName;

        // If status is a lane name, use the converted ObjectId for this job
        if (isLaneName) {
          const laneIdForJob = jobLaneMap.get(jobId);
          if (!laneIdForJob) {
            logger.warn(
              { candidateId, jobId, status },
              'Lane not found for candidate, skipping',
            );
            return null;
          }
          candidateStatusObjectId = laneIdForJob;
          candidateNewStatusName = status;
        }

        // Get old status name
        const candidateOldStatus = (c as ICandidate).status;
        let oldStatusName = 'Unknown';
        if (candidateOldStatus) {
          if (typeof candidateOldStatus === 'string') {
            if (/^[0-9a-fA-F]{24}$/.test(candidateOldStatus)) {
              // It's an ObjectId string
              oldStatusName = oldLaneMap.get(candidateOldStatus) || candidateOldStatus;
            } else {
              // It's already a lane name
              oldStatusName = candidateOldStatus;
            }
          } else {
            // It's an ObjectId object
            const oldStatusId = candidateOldStatus.toString();
            oldStatusName = oldLaneMap.get(oldStatusId) || oldStatusId;
          }
        }

        return {
          candidateId,
          statusObjectId: candidateStatusObjectId,
          oldStatusName,
          newStatusName: candidateNewStatusName,
          jobId,
        };
      })
      .filter(
        (
          update,
        ): update is {
          candidateId: string;
          statusObjectId: string;
          oldStatusName: string;
          newStatusName: string;
          jobId: string | null;
        } => update !== null,
      );

    if (candidateUpdates.length === 0) {
      return {
        success: false,
        updatedCount: 0,
        failedCount: candidates.length,
        candidatesToBroadcast: [],
        message: 'No valid candidates to update (lane not found)',
      };
    }

    // Update candidates with ObjectIds
    const updateCandidatesMap = new Map<string, string>();
    for (const update of candidateUpdates) {
      updateCandidatesMap.set(update.candidateId, update.statusObjectId);
    }

    // Batch update candidates
    const updatePromises = Array.from(updateCandidatesMap.entries()).map(
      ([candidateId, statusObjId]) =>
        Candidate.updateOne(
          { _id: candidateId },
          { $set: { status: statusObjId }, $currentDate: { 'tracking.updatedAt': true } },
        ),
    );
    await Promise.all(updatePromises);

    // Create history entries with lane names
    const historyBulk = candidateUpdates
      .filter((update) => update.jobId)
      .map((update) => {
        const statusUpdateLog: IinfoUpdateLog = {
          title: 'Updated Status',
          previousValue: update.oldStatusName,
          currentValue: update.newStatusName,
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
          filter: { candidateId: update.candidateId },
          update: { $push: { history: historyEntry } },
          upsert: true as const,
        },
      };
    });

    if (historyBulk.length > 0) {
      await History.bulkWrite(historyBulk);
    }

    const updatedList = await Candidate.find({
      _id: { $in: candidateUpdates.map((u) => u.candidateId) },
    })
      .populate([
        { path: 'assignment.interviewerId', select: '_id name email' },
        { path: 'followUp.userId', select: '_id name email' },
        { path: 'jobId', select: 'title description' },
        { path: 'status', select: 'name' },
      ])
      .lean();

    // Map status names to candidates for consistent response
    // Create a map of candidateId -> newStatusName
    const statusNameMap = new Map(
      candidateUpdates.map((update) => [update.candidateId, update.newStatusName]),
    );
    logger.info({ statusNameMap }, 'Status name map 300');
    // Map of candidateId -> previous (old) status name (lowercased) so SSE clients
    // can compute accurate lane count deltas without guessing.
    const previousStatusNameMap = new Map(
      candidateUpdates.map((update) => [
        update.candidateId,
        typeof update.oldStatusName === 'string'
          ? update.oldStatusName.toLowerCase()
          : String(update.oldStatusName ?? '').toLowerCase(),
      ]),
    );

    // Update the status field in updatedList to use the lane name and attach
    // previousStatusFromSSE so Client B can apply lane deltas correctly.
    // Prefer populated status.name (what was actually written to DB) over statusNameMap
    // so response/SSE always reflect actual DB state.
    const updatedListWithStatusNames = updatedList.map((candidate) => {
      const candidateId = (candidate._id as { toString: () => string }).toString();
      const statusName = statusNameMap.get(candidateId) || newStatusName;
      const previousStatusFromSSE = previousStatusNameMap.get(candidateId);

      return {
        ...candidate,
        status: statusName,
        previousStatusFromSSE,
      };
    });

    const statusUpdateCandidates = candidateUpdates.map((update) => {
      const candidate = candidates.find(
        (c) => (c._id as { toString: () => string }).toString() === update.candidateId,
      );
      const jobId = update.jobId ?? '';
      const jobTitle =
        candidate?.jobId != null &&
        typeof candidate.jobId === 'object' &&
        'title' in (candidate.jobId as object)
          ? String((candidate.jobId as { title?: string }).title ?? 'Job')
          : 'Job';
      return {
        candidateId: update.candidateId,
        candidateName: (candidate as ICandidate)?.name ?? 'Candidate',
        jobId,
        jobTitle,
        oldStatus: update.oldStatusName,
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
            newStatus: newStatusName,
            nextStep,
            statusMessage: params.remark?.trim() || undefined,
            candidates: statusUpdateCandidates,
          }
        : undefined;

    return {
      success: true,
      updatedCount: updatedList.length,
      failedCount: candidates.length - updatedList.length,
      candidatesToBroadcast: updatedListWithStatusNames as unknown as ICandidate[],
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
