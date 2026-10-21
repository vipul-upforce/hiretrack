import type { ICandidate } from '@/lib/models/candidate';
import connectToDatabase, { Lane } from '@/lib/mongodb';

/**
 * Normalize jobId from candidate document (populated or raw).
 */
export function getJobIdString(candidate: { jobId?: unknown }): string | null {
  if (!candidate.jobId) return null;
  if (typeof candidate.jobId === 'string') return candidate.jobId;
  const obj = candidate.jobId as { _id?: unknown };
  if (obj?._id != null) {
    return typeof obj._id === 'string' ? obj._id : String(obj._id);
  }
  return null;
}

/**
 * Transforms candidates to replace status ObjectIds with status names (lane names).
 * This ensures consistent response format across all bulk update operations.
 */
export async function transformCandidatesWithStatusNames(
  candidates: ICandidate[],
): Promise<ICandidate[]> {
  if (candidates.length === 0) {
    return candidates;
  }

  await connectToDatabase();
  if (!Lane) {
    return candidates;
  }

  // Extract all unique status ObjectIds
  const statusIds = candidates
    .map((c) => {
      const candidateStatus = c.status;
      if (!candidateStatus) return null;
      if (typeof candidateStatus === 'string') {
        // Check if it's an ObjectId string or already a lane name
        return /^[0-9a-fA-F]{24}$/.test(candidateStatus) ? candidateStatus : null;
      }
      if (candidateStatus && typeof candidateStatus === 'object' && '_id' in candidateStatus) {
        return (candidateStatus as { _id?: unknown })._id?.toString() ?? null;
      }
      return null;
    })
    .filter((id): id is string => id !== null);
  if (statusIds.length === 0) {
    // No ObjectIds to convert, return as-is
    return candidates;
  }
  // Fetch all lane names in bulk
  const lanes = await Lane.find({ _id: { $in: statusIds } })
    .select('_id name')
    .lean();

  // Create a map: laneId -> laneName
  const laneMap = new Map(
    lanes.map((lane) => [lane._id.toString(), lane.name]),
  );

  // Transform candidates: replace status ObjectId with lane name
  return candidates.map((candidate) => {
    const candidateStatus = candidate.status;
    let statusName: string | null = null;

    if (candidateStatus) {
      if (typeof candidateStatus === 'string') {
        if (/^[0-9a-fA-F]{24}$/.test(candidateStatus)) {
          // It's an ObjectId string, look up the lane name
          statusName = laneMap.get(candidateStatus) || candidateStatus;
        } else {
          // It's already a lane name
          statusName = candidateStatus;
        }
      } else if (
        typeof candidateStatus === 'object' &&
        candidateStatus !== null &&
        'name' in candidateStatus
      ) {
        // Status is populated, use the name directly
        statusName = String((candidateStatus as { name?: string }).name ?? '');
      } else {
        // It's an ObjectId object, convert to string and look up
        const statusId = candidateStatus.toString();
        statusName = laneMap.get(statusId) || statusId;
      }
    }
    return {
      ...candidate,
      status: statusName || candidateStatus,
    } as ICandidate;
  });
}
