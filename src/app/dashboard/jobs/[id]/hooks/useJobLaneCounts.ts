/**
 * Server-authoritative lane counts for the job kanban.
 * Refetches on membership-changing SSE for this job (debounced) so counts stay
 * correct per-client filter without client-side +1/-1 delta bookkeeping.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFetchJobLaneCountsQuery } from '@/lib/features/candidate/candidateApi';
import type { JobViewState } from '../utils/jobViewStorage';

const COUNTS_REFETCH_DEBOUNCE_MS = 400;

interface UseJobLaneCountsProps {
  jobId: string;
  viewState?: JobViewState;
  enabled?: boolean;
  /** Membership-changing SSE events for this job; triggers debounced counts refetch. */
  countInvalidationSig?: string;
}

function buildCountsQueryArg(jobId: string, viewState?: JobViewState) {
  const rawFilter = viewState?.filter as Record<string, unknown> | undefined;
  const hasAnyActiveFilter = Boolean(
    rawFilter &&
      (Boolean(rawFilter.search && String(rawFilter.search).trim()) ||
        rawFilter.topCandidates === true ||
        rawFilter.appliedThisWeek === true ||
        rawFilter.appliedToday === true ||
        rawFilter.appliedIn15Days === true ||
        rawFilter.toFollowUp === true ||
        rawFilter.assigned === true ||
        rawFilter.notAssigned === true ||
        rawFilter.withRemarks === true ||
        rawFilter.withoutRemarks === true ||
        rawFilter.archived === true),
  );
  const filter = hasAnyActiveFilter ? rawFilter : undefined;

  const defaultSortBy = 'tracking.createdAt';
  const defaultSortOrder = 'desc';
  const sortBy =
    viewState?.sortBy && viewState.sortBy !== defaultSortBy
      ? viewState.sortBy
      : undefined;
  const sortOrder =
    viewState?.sortOrder && viewState.sortOrder !== defaultSortOrder
      ? viewState.sortOrder
      : undefined;

  return { jobId, filter, sortBy, sortOrder };
}

export function useJobLaneCounts({
  jobId,
  viewState,
  enabled = true,
  countInvalidationSig = '',
}: UseJobLaneCountsProps) {
  const queryArg = useMemo(
    () => buildCountsQueryArg(jobId, viewState),
    [jobId, viewState?.filter, viewState?.sortBy, viewState?.sortOrder],
  );

  const { data, refetch, isFetching } = useFetchJobLaneCountsQuery(queryArg, {
    skip: !enabled,
  });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevInvalidationSigRef = useRef(countInvalidationSig);

  useEffect(() => {
    if (!enabled) return;
    if (countInvalidationSig === prevInvalidationSigRef.current) return;
    prevInvalidationSigRef.current = countInvalidationSig;
    if (!countInvalidationSig) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      void refetch();
    }, COUNTS_REFETCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [countInvalidationSig, enabled, refetch]);

  const laneCountsByKey = useMemo(() => {
    const map: Record<string, number> = {};
    if (!data?.lanes) return map;
    Object.entries(data.lanes).forEach(([lane, laneData]) => {
      map[lane.toLowerCase()] = laneData.count ?? 0;
    });
    return map;
  }, [data?.lanes]);

  return {
    laneCountsByKey,
    countsMeta: data?.meta,
    refetchCounts: refetch,
    isCountsFetching: isFetching,
  };
}
