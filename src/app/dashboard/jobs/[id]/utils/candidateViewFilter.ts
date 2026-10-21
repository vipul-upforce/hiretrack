/**
 * Revalidates a candidate against the current client's job view filter.
 * Used so SSE-updated candidates are only shown when they match this client's
 * filters (e.g. Client 2 with strict filters should not show a candidate
 * moved by Client 1 if that candidate doesn't match Client 2's filter).
 */

import type { Candidate } from '@/types/candidate';
import type { JobViewFilter, JobViewState } from './jobViewStorage';
import { getInterviewerName, isAssigned } from './candidateAccessors';

/**
 * Returns true if the view has custom sort (global or per-lane) so lane count should come from API only.
 * Avoids count mismatch when switching sorts: cached sort showed baseCount+delta, new sort refetch shows different baseCount.
 */
export function hasActiveSort(viewState: JobViewState | undefined | null): boolean {
  if (!viewState) return false;
  const defaultSortBy = 'tracking.createdAt';
  const defaultSortOrder = 'desc';
  if (viewState.sortBy && viewState.sortBy !== defaultSortBy) return true;
  if (viewState.sortOrder && viewState.sortOrder !== defaultSortOrder) return true;
  if (viewState.laneSort && Object.keys(viewState.laneSort).length > 0) return true;
  return false;
}

/**
 * Returns true if the view filter has any active condition (search or any boolean filter true).
 */
export function hasActiveFilter(filter: JobViewFilter | undefined | null): boolean {
  if (!filter) return false;
  if (filter.search && String(filter.search).trim()) return true;
  return (
    filter.topCandidates === true ||
    filter.appliedThisWeek === true ||
    filter.appliedToday === true ||
    filter.appliedIn15Days === true ||
    filter.toFollowUp === true ||
    filter.assigned === true ||
    filter.notAssigned === true ||
    filter.withRemarks === true ||
    filter.withoutRemarks === true ||
    filter.archived === true
  );
}

/**
 * Returns true if the candidate matches the given job view filter.
 * Mirrors the logic used in QuickSelectAndFilter and the candidates API.
 * Strict: if we cannot evaluate a condition (missing data), we exclude the candidate
 * so that Client 2 never shows candidates that don't match its filter (SSE payloads may be partial).
 */
export function candidateMatchesJobViewFilter(
  candidate: Candidate,
  filter: JobViewFilter | undefined | null,
): boolean {
  if (!filter) return true;

  // Archived: when filter.archived is true, show only archived; otherwise show only non-archived
  if (filter.archived === true) {
    if (!candidate.isDeleted) return false;
  } else if (candidate.isDeleted) {
    return false;
  }

  // Text search
  if (filter.search && String(filter.search).trim()) {
    const searchLower = String(filter.search).trim().toLowerCase();
    const matchesSearch =
      (candidate.name ?? '').toLowerCase().includes(searchLower) ||
      (candidate.skills ?? []).some((skill) =>
        String(skill).toLowerCase().includes(searchLower),
      ) ||
      String(candidate.experience ?? '').includes(searchLower) ||
      getInterviewerName(candidate)?.toLowerCase().includes(searchLower) ||
      (candidate.location ?? '').toLowerCase().includes(searchLower);
    if (!matchesSearch) return false;
  }

  // Active filters: strict – missing data for a condition means exclude (don't show non-matching from SSE)
  const activeFilters: Array<{ key: keyof JobViewFilter; test: (c: Candidate) => boolean }> = [];

  if (filter.topCandidates === true) {
    activeFilters.push({
      key: 'topCandidates',
      test: (c) => Boolean(c.scores?.overall != null && c.scores.overall >= 7),
    });
  }
  if (filter.appliedThisWeek === true) {
    activeFilters.push({
      key: 'appliedThisWeek',
      test: (c) => {
        if (c.tracking?.createdAt == null) return false;
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return new Date(c.tracking.createdAt) >= oneWeekAgo;
      },
    });
  }
  if (filter.appliedToday === true) {
    activeFilters.push({
      key: 'appliedToday',
      test: (c) => {
        if (c.tracking?.createdAt == null) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return (
          new Date(c.tracking.createdAt) >= today &&
          new Date(c.tracking.createdAt) < tomorrow
        );
      },
    });
  }
  if (filter.appliedIn15Days === true) {
    activeFilters.push({
      key: 'appliedIn15Days',
      test: (c) => {
        if (c.tracking?.createdAt == null) return false;
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        return new Date(c.tracking.createdAt) >= fifteenDaysAgo;
      },
    });
  }
  if (filter.toFollowUp === true) {
    activeFilters.push({
      key: 'toFollowUp',
      test: (c) => Boolean(c.followUp && c.followUp.note),
    });
  }
  if (filter.assigned === true) {
    activeFilters.push({ key: 'assigned', test: (c) => isAssigned(c) });
  }
  if (filter.notAssigned === true) {
    activeFilters.push({ key: 'notAssigned', test: (c) => !isAssigned(c) });
  }
  if (filter.withRemarks === true) {
    activeFilters.push({
      key: 'withRemarks',
      test: (c) => {
        // Require positive evidence; explicitly exclude when we know there are no remarks
        if (c.remarksCount === 0) return false;
        if (Array.isArray(c.remarks) && c.remarks.length === 0) return false;
        if (c.remarksCount != null && c.remarksCount > 0) return true;
        if (Array.isArray(c.remarks) && c.remarks.length > 0) return true;
        return Array.isArray(c.history) && c.history.length > 0;
      },
    });
  }
  if (filter.withoutRemarks === true) {
    activeFilters.push({
      key: 'withoutRemarks',
      test: (c) => {
        // Strict: only return true when we have positive evidence there are no remarks.
        // This avoids Client B incorrectly "passing" withoutRemarks for partial SSE payloads
        // (missing remarksCount/remarks/history) and then injecting unseen candidates into the lane.
        if (c.remarksCount != null) return c.remarksCount === 0;
        if (Array.isArray(c.remarks)) return c.remarks.length === 0;
        // SSE history payloads sometimes include history; treat empty history as evidence of no remarks.
        if (Array.isArray(c.history)) return c.history.length === 0;
        return false;
      },
    });
  }

  if (activeFilters.length === 0) return true;

  const operator = filter.logicalOperator === 'OR' ? 'OR' : 'AND';
  if (operator === 'AND') {
    return activeFilters.every(({ test }) => test(candidate));
  }
  return activeFilters.some(({ test }) => test(candidate));
}

/**
 * True when an SSE update should inject a candidate that is not on the current API page
 * because filter membership flipped from hidden → visible (e.g. assign while "assigned" filter on).
 */
export function candidateBecameVisibleForFilter(
  merged: Candidate,
  filter: JobViewFilter | undefined | null,
  passesFilterBeforeEffective: boolean | undefined,
  previousSnapshot: Candidate | undefined,
): boolean {
  if (!hasActiveFilter(filter)) return false;
  const nowPasses = candidateMatchesJobViewFilter(merged, filter);
  if (!nowPasses) return false;
  if (passesFilterBeforeEffective === false) return true;
  if (previousSnapshot != null) {
    const beforePasses = candidateMatchesJobViewFilter(previousSnapshot, filter);
    if (!beforePasses) return true;
  }
  return false;
}

/**
 * True when assignment-related filter membership flipped (assign / unassign).
 * Requires a prior snapshot so we do not inject unseen paginated rows.
 */
export function didAssignmentFilterMembershipFlip(
  filter: JobViewFilter | undefined | null,
  previousSnapshot: Candidate | undefined,
  merged: Candidate,
): boolean {
  if (!filter || previousSnapshot == null) return false;
  if (filter.assigned === true) {
    return (
      !candidateMatchesJobViewFilter(previousSnapshot, filter) &&
      candidateMatchesJobViewFilter(merged, filter)
    );
  }
  if (filter.notAssigned === true) {
    return (
      candidateMatchesJobViewFilter(previousSnapshot, filter) &&
      !candidateMatchesJobViewFilter(merged, filter)
    );
  }
  return false;
}
