/**
 * Build membership fingerprints for SSE candidates to detect lane-count changes.
 * Only events that can change visible kanban totals (status, archive, job switch).
 */

import { Candidate } from '@/types/candidate';
import { getCandidateStatusLabel } from './candidateAccessors';
import { normalizeJobId } from './candidateNormalizer';

export type SseCandidateWithMeta = Candidate & {
  previousStatusFromSSE?: string;
  previousIsDeletedFromSSE?: boolean;
  previousJobIdFromSSE?: string;
};

export type SseRemovedCandidate = {
  id: string;
  status: string;
  candidate?: Candidate;
};

function resolveLaneStatus(
  status: unknown,
  laneIdToName?: Record<string, string>,
): string {
  if (typeof status === 'string') {
    const lower = status.toLowerCase();
    if (laneIdToName && /^[0-9a-f]{24}$/i.test(lower)) {
      return (laneIdToName[lower] ?? lower).toLowerCase();
    }
    return lower;
  }
  if (status && typeof status === 'object' && 'name' in status) {
    const name = (status as { name?: unknown }).name;
    if (typeof name === 'string' && name.trim()) {
      return name.toLowerCase();
    }
  }
  return 'applied';
}

function candidateAffectsJob(
  candidateJobId: string,
  previousJobId: string,
  currentJobId: string,
): boolean {
  return (
    candidateJobId === currentJobId || previousJobId === currentJobId
  );
}

/**
 * Stable fingerprint of count-relevant membership for one SSE candidate on a job page.
 * Returns null when the update cannot affect this job's lane totals.
 */
export function buildMembershipFingerprint(
  candidate: SseCandidateWithMeta,
  currentJobId: string,
  laneIdToName?: Record<string, string>,
): string | null {
  const jobIdStr = String(currentJobId ?? '');
  if (!jobIdStr || !candidate._id) return null;

  const candidateJobId = String(normalizeJobId(candidate.jobId) ?? '');
  const previousJobId =
    candidate.previousJobIdFromSSE != null
      ? String(candidate.previousJobIdFromSSE)
      : '';

  if (!candidateAffectsJob(candidateJobId, previousJobId, jobIdStr)) {
    return null;
  }

  const status = resolveLaneStatus(candidate.status, laneIdToName);
  const previousStatus = candidate.previousStatusFromSSE
    ? resolveLaneStatus(candidate.previousStatusFromSSE, laneIdToName)
    : '';
  const isDeleted = Boolean(candidate.isDeleted);
  const previousIsDeleted =
    candidate.previousIsDeletedFromSSE !== undefined
      ? String(candidate.previousIsDeletedFromSSE)
      : '';

  return [
    candidate._id,
    candidateJobId,
    previousJobId,
    status,
    previousStatus,
    isDeleted ? '1' : '0',
    previousIsDeleted,
  ].join('|');
}

/**
 * Whether a fingerprint transition represents a count-affecting membership change.
 */
export function isCountMembershipChange(
  previousFingerprint: string | undefined,
  nextFingerprint: string,
): boolean {
  // After initial seed, a never-tracked id is a new membership event for this job.
  if (previousFingerprint === undefined) return true;
  if (previousFingerprint === nextFingerprint) return false;

  const prevParts = previousFingerprint.split('|');
  const nextParts = nextFingerprint.split('|');
  // [id, jobId, prevJobId, status, prevStatus, isDeleted, prevIsDeleted]
  const statusChanged = prevParts[3] !== nextParts[3];
  const deletedChanged = prevParts[5] !== nextParts[5];
  const jobChanged =
    prevParts[1] !== nextParts[1] || prevParts[2] !== nextParts[2];
  const prevStatusSignalChanged = prevParts[4] !== nextParts[4];
  const prevDeletedSignalChanged = prevParts[6] !== nextParts[6];

  return (
    statusChanged ||
    deletedChanged ||
    jobChanged ||
    prevStatusSignalChanged ||
    prevDeletedSignalChanged
  );
}

export function buildRemovalFingerprint(
  removed: SseRemovedCandidate,
  currentJobId: string,
): string | null {
  const jobIdStr = String(currentJobId ?? '');
  if (!jobIdStr || !removed.id) return null;

  const candidateJobId = removed.candidate
    ? String(normalizeJobId(removed.candidate.jobId) ?? '')
    : '';
  if (!candidateJobId || candidateJobId !== jobIdStr) return null;

  return `rm:${removed.id}:${removed.status}`;
}
