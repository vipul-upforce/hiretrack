/**
 * Hook to read/write job board view state (filters + sorting) from localStorage.
 * Used to pass filter and sort as query params to GET /api/jobs/[id]/candidates.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  getJobViewState,
  setJobViewState,
  type JobViewState,
  type JobViewFilter,
  type LaneSortEntry,
} from '../utils/jobViewStorage';

export function useJobViewState(jobId: string | undefined) {
  const [viewState, setViewStateInternal] = useState<JobViewState>(() =>
    jobId ? getJobViewState(jobId) : getJobViewState(''),
  );

  // Sync from localStorage when jobId changes or on mount (e.g. another tab updated)
  useEffect(() => {
    if (!jobId) return;
    setViewStateInternal(getJobViewState(jobId));
  }, [jobId]);

  const setViewState = useCallback(
    (update: Partial<JobViewState> | ((prev: JobViewState) => Partial<JobViewState>)) => {
      if (!jobId) return;

      setViewStateInternal((prev) => {
        const patch = typeof update === 'function' ? update(prev) : update;
        const next: JobViewState = {
          filter: { ...prev.filter, ...patch.filter },
          sortBy: patch.sortBy ?? prev.sortBy,
          sortOrder: patch.sortOrder ?? prev.sortOrder,
          laneSort: patch.laneSort !== undefined ? patch.laneSort : prev.laneSort,
        };

        // Persist the exact same state to localStorage so that:
       
        // are always in lockstep with localStorage.
        setJobViewState(jobId, next);

        return next;
      });
    },
    [jobId],
  );

  const setFilter = useCallback(
    (filter: Partial<JobViewFilter>) => {
      setViewState({ filter });
    },
    [setViewState],
  );

  const setLaneSort = useCallback(
    (laneName: string, entry: LaneSortEntry | null) => {
      setViewState((prev) => {
        const next = { ...prev.laneSort };
        if (entry) next[laneName] = entry;
        else delete next[laneName];
        return { laneSort: next };
      });
    },
    [setViewState],
  );

  const setGlobalSort = useCallback(
    (sortBy: string, sortOrder: 'asc' | 'desc') => {
      setViewState({ sortBy, sortOrder });
    },
    [setViewState],
  );

  return {
    viewState,
    setViewState,
    setFilter,
    setLaneSort,
    setGlobalSort,
  };
}
