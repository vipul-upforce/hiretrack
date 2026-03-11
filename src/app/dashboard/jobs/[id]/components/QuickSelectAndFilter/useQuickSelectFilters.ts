'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Candidate } from '@/types/candidate';
import { getInterviewerName, isAssigned } from '../../utils/candidateAccessors';

export interface FilterState {
  search: string;
  logicalOperator: 'AND' | 'OR';
  topCandidates: boolean;
  appliedThisWeek: boolean;
  appliedToday: boolean;
  appliedIn15Days: boolean;
  toFollowUp: boolean;
  assigned: boolean;
  notAssigned: boolean;
  withRemarks: boolean;
  withoutRemarks: boolean;
}

const INITIAL_FILTERS: FilterState = {
  search: '',
  logicalOperator: 'AND',
  topCandidates: false,
  appliedThisWeek: false,
  appliedToday: false,
  appliedIn15Days: false,
  toFollowUp: false,
  assigned: false,
  notAssigned: false,
  withRemarks: false,
  withoutRemarks: false,
};

const FILTER_DEFINITIONS: Array<{
  key: keyof FilterState;
  filter: (candidate: Candidate) => boolean;
}> = [
  {
    key: 'topCandidates',
    filter: (candidate: Candidate) =>
      !!(candidate.scores?.overall && candidate.scores.overall >= 7),
  },
  {
    key: 'appliedThisWeek',
    filter: (candidate: Candidate) => {
      if (!candidate.tracking?.createdAt) return false;
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return new Date(candidate.tracking.createdAt) >= oneWeekAgo;
    },
  },
  {
    key: 'appliedToday',
    filter: (candidate: Candidate) => {
      if (!candidate.tracking?.createdAt) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const created = new Date(candidate.tracking.createdAt);
      return created >= today && created < tomorrow;
    },
  },
  {
    key: 'appliedIn15Days',
    filter: (candidate: Candidate) => {
      if (!candidate.tracking?.createdAt) return false;
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      return new Date(candidate.tracking.createdAt) >= fifteenDaysAgo;
    },
  },
  {
    key: 'toFollowUp',
    filter: (candidate: Candidate) =>
      !!(candidate.followUp && candidate.followUp.note),
  },
  { key: 'assigned', filter: (candidate: Candidate) => isAssigned(candidate) },
  {
    key: 'notAssigned',
    filter: (candidate: Candidate) => !isAssigned(candidate),
  },
  {
    key: 'withRemarks',
    filter: (candidate: Candidate) =>
      !!(candidate.remarksCount && candidate.remarksCount > 0),
  },
  {
    key: 'withoutRemarks',
    filter: (candidate: Candidate) =>
      !candidate.remarksCount || candidate.remarksCount === 0,
  },
];

export function useQuickSelectFilters(
  candidates: Candidate[],
  showArchived: boolean,
  onFilterChange: (filterConditions: FilterState) => void,
  onShowArchivedChange: (show: boolean) => void,
) {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  const filteredCandidates = useMemo(() => {
    let filtered = candidates.filter((c) =>
      showArchived ? c.isDeleted : !c.isDeleted,
    );

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (candidate) =>
          candidate.name.toLowerCase().includes(searchLower) ||
          candidate.skills.some((s) => s.toLowerCase().includes(searchLower)) ||
          candidate.experience.toString().includes(searchLower) ||
          getInterviewerName(candidate)?.toLowerCase().includes(searchLower) ||
          candidate.location.toLowerCase().includes(searchLower),
      );
    }

    const activeFilters = FILTER_DEFINITIONS.filter(
      (def) => filters[def.key] === true,
    );
    if (activeFilters.length > 0) {
      if (filters.logicalOperator === 'AND') {
        filtered = filtered.filter((c) =>
          activeFilters.every(({ filter }) => filter(c)),
        );
      } else {
        filtered = filtered.filter((c) =>
          activeFilters.some(({ filter }) => filter(c)),
        );
      }
    }

    return filtered;
  }, [candidates, filters, showArchived]);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleFilterToggle = useCallback((filterKey: keyof FilterState) => {
    setFilters((prev) => ({ ...prev, [filterKey]: !prev[filterKey] }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({ ...INITIAL_FILTERS });
    onShowArchivedChange(false);
  }, [onShowArchivedChange]);

  const activeFiltersCount = useMemo(
    () =>
      (Object.keys(filters) as Array<keyof FilterState>).filter(
        (key) =>
          key !== 'search' &&
          key !== 'logicalOperator' &&
          filters[key] === true,
      ).length,
    [filters],
  );

  return {
    filters,
    setFilters,
    filteredCandidates,
    handleFilterToggle,
    clearAllFilters,
    activeFiltersCount,
  };
}
