/**
 * Fingerprints for SSE candidates to detect filter-list membership changes
 * (assignment, remarks, follow-up, archive) that require a grouped kanban refetch
 * when the client has active view filters.
 */

import type { Candidate } from '@/types/candidate';
import { isAssigned } from './candidateAccessors';
import { normalizeJobId } from './candidateNormalizer';
import type { JobViewFilter } from './jobViewStorage';
import { hasActiveFilter } from './candidateViewFilter';

function candidateAffectsJob(
  candidateJobId: string,
  currentJobId: string,
): boolean {
  return Boolean(candidateJobId && currentJobId && candidateJobId === currentJobId);
}

/**
 * Stable fingerprint of filter-relevant fields for one candidate.
 * Only includes dimensions that match currently active filter flags.
 */
export function buildFilterListFingerprint(
  candidate: Candidate,
  filter: JobViewFilter | undefined | null,
): string | null {
  if (!filter || !hasActiveFilter(filter) || !candidate._id) return null;

  const parts: string[] = [candidate._id];

  if (filter.assigned === true || filter.notAssigned === true) {
    parts.push(isAssigned(candidate) ? 'a1' : 'a0');
  }
  if (filter.withRemarks === true || filter.withoutRemarks === true) {
    const remarksCount =
      candidate.remarksCount != null ? String(candidate.remarksCount) : '';
    const remarksLen = Array.isArray(candidate.remarks)
      ? String(candidate.remarks.length)
      : '';
    const historyLen = Array.isArray(candidate.history)
      ? String(candidate.history.length)
      : '';
    parts.push(`r:${remarksCount}:${remarksLen}:${historyLen}`);
  }
  if (filter.toFollowUp === true) {
    parts.push(candidate.followUp?.note ? 'f1' : 'f0');
  }
  if (filter.archived === true) {
    parts.push(candidate.isDeleted ? 'd1' : 'd0');
  }
  if (filter.topCandidates === true) {
    const overall = candidate.scores?.overall;
    parts.push(overall != null ? String(overall) : '');
  }

  // Text/date filters cannot be evaluated reliably from partial SSE — any same-job
  // candidate touch may change search/date membership; use a coarse marker.
  if (filter.search && String(filter.search).trim()) {
    parts.push('search-active');
  }
  if (
    filter.appliedThisWeek === true ||
    filter.appliedToday === true ||
    filter.appliedIn15Days === true
  ) {
    const created = candidate.tracking?.createdAt;
    parts.push(created != null ? String(created) : '');
  }

  return parts.join('|');
}

export function isFilterListMembershipChange(
  previousFingerprint: string | undefined,
  nextFingerprint: string,
): boolean {
  if (previousFingerprint === undefined) return false;
  return previousFingerprint !== nextFingerprint;
}

export function buildFilterListFingerprintForJob(
  candidate: Candidate,
  currentJobId: string,
  filter: JobViewFilter | undefined | null,
): string | null {
  const jobIdStr = String(currentJobId ?? '');
  if (!jobIdStr) return null;
  const candidateJobId = String(normalizeJobId(candidate.jobId) ?? '');
  if (!candidateAffectsJob(candidateJobId, jobIdStr)) return null;
  return buildFilterListFingerprint(candidate, filter);
}
