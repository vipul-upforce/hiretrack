'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useFetchCandidatesTableQuery } from '@/lib/features/candidate/candidateApi';
import { Candidate } from '@/types/candidate';
import { CandidateTableFilters } from './CandidateTableFilters';
import { CandidateTableContent } from './CandidateTableContent';
import { CandidatePagination } from './CandidatePagination';
import { CandidateTableSkeleton } from './CandidateTableSkeleton';
import { useSSE } from '@/hooks/useSSE';
import { DuplicateCandidatesDialog } from '../Dialogs/DuplicateCandidatesDialog';
import { useDebounce } from '@/hooks/useDebounce';
import { FilterState } from '../../types/filter.types';

interface JobCandidatesTableProps {
  onCandidateClick: (candidate: Candidate) => void;
  onActionClick: (candidate: Candidate, action: any) => void;
  onEditClick: (candidate: Candidate) => void;
  onArchiveClick: (candidateId: string) => void;
  onDownloadCV: (candidate: Candidate) => void;
  onDownloadProfile: (candidate: Candidate) => void;
  onDataUpdate?: (candidates: Candidate[]) => void;
  onRefetchReady?: (refetch: () => Promise<unknown>) => void;
}

const INITIAL_FILTERS: FilterState = {
  search: '',
  logicalOperator: 'AND',
  status: 'all',
  sortBy: 'dateTime',
  sortOrder: 'desc',
  topCandidates: false,
  appliedThisWeek: false,
  appliedToday: false,
  appliedIn15Days: false,
  toFollowUp: false,
  assigned: false,
  notAssigned: false,
  withRemarks: false,
  withoutRemarks: false,
  isArchived: false,
};

export function JobCandidatesTable({
  onCandidateClick,
  onActionClick,
  onEditClick,
  onArchiveClick,
  onDownloadCV,
  onDownloadProfile,
  onDataUpdate,
  onRefetchReady,
}: JobCandidatesTableProps) {
  const params = useParams();
  const id = params?.id as string;
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selectedCandidateForSSE, setSelectedCandidateForSSE] = useState<Candidate | null>(null);
  const pageCacheRef = useRef<Map<string, Map<number, Candidate[]>>>(new Map());
  const [cacheTick, setCacheTick] = useState(0);

  // Debounced search term
  const debouncedSearch = useDebounce(filters.search, 500);

  // Duplicate Dialog State
  const [candidateToViewDuplicates, setCandidateToViewDuplicates] = useState<Candidate | null>(null);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);

  const normalizedStatus = filters.status === 'all' ? undefined : filters.status;
  const queryKey = useMemo(() => {
    return JSON.stringify({
      jobId: id,
      limit,
      search: debouncedSearch,
      logicalOperator: filters.logicalOperator,
      status: normalizedStatus,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      topCandidates: filters.topCandidates,
      appliedThisWeek: filters.appliedThisWeek,
      appliedToday: filters.appliedToday,
      appliedIn15Days: filters.appliedIn15Days,
      toFollowUp: filters.toFollowUp,
      assigned: filters.assigned,
      notAssigned: filters.notAssigned,
      withRemarks: filters.withRemarks,
      withoutRemarks: filters.withoutRemarks,
      isArchived: filters.isArchived,
    });
  }, [id, limit, debouncedSearch, filters, normalizedStatus]);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useFetchCandidatesTableQuery({
    jobId: id,
    page,
    limit,
    ...filters,
    search: debouncedSearch,
    status: normalizedStatus,
  });

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    name: true,
    status: true,
    location: false,
    appliedDate: false,
    skills: true,
    currentCTC: true,
    expectedCTC: true,
    noticePeriod: false,
    aiScore: true,
    followUp: true,
  });

  const { candidates: sseCandidates } = useSSE(
    setSelectedCandidateForSSE,
    selectedCandidateForSSE,
    id
  );

  useEffect(() => {
    const base = data?.candidates;
    if (!Array.isArray(base)) return;
    if (data?.page !== page || data?.limit !== limit) return;

    const existing = pageCacheRef.current.get(queryKey) ?? new Map<number, Candidate[]>();
    existing.set(page, base);
    pageCacheRef.current.set(queryKey, existing);
    setCacheTick((t) => t + 1);
  }, [data?.candidates, data?.page, data?.limit, page, limit, queryKey]);

  const displayCandidates = useMemo(() => {
    const base = data?.candidates ?? [];
    const updates = sseCandidates ?? [];

    if (base.length === 0 && updates.length === 0) return [];

    const getJobId = (candidate: Candidate) =>
      typeof candidate.jobId === 'object' ? candidate.jobId?._id : candidate.jobId;

    const perQueryPages = pageCacheRef.current.get(queryKey);
    let maxContiguousPage = 0;
    if (perQueryPages) {
      while (perQueryPages.has(maxContiguousPage + 1)) {
        maxContiguousPage += 1;
      }
    }
    let canSliceFromCache = Boolean(perQueryPages) && maxContiguousPage >= page;
    const hasCurrentPageData =
      data?.page === page && data?.limit === limit && Array.isArray(data?.candidates);

    // When we just fetched the next page, the cache update effect hasn't run yet.
    // If we already have contiguous pages up to `page - 1`, treat the current `base`
    // as page data so SSE-driven reordering can be reflected immediately.
    if (
      !canSliceFromCache &&
      hasCurrentPageData &&
      perQueryPages &&
      maxContiguousPage === page - 1
    ) {
      canSliceFromCache = true;
    }

    const cacheCandidates: Candidate[] = [];
    if (canSliceFromCache && perQueryPages) {
      const effectiveMaxPage = Math.max(maxContiguousPage, page);
      for (let p = 1; p <= effectiveMaxPage; p += 1) {
        if (p === page && maxContiguousPage === page - 1 && hasCurrentPageData) {
          cacheCandidates.push(...base);
          continue;
        }
        const candidates = perQueryPages.get(p);
        if (candidates) cacheCandidates.push(...candidates);
      }
    } else {
      // Without a contiguous cache up to the current page, rely on the current page's API response
      // to avoid temporarily showing another page’s cached rows.
      cacheCandidates.push(...base);
    }

    const mergedMap = new Map<string, Candidate>();
    cacheCandidates.forEach((candidate) => mergedMap.set(candidate._id, candidate));

    updates.forEach((update) => {
      const updateJobId = getJobId(update);
      if (updateJobId && updateJobId !== id) return;

      const existing = mergedMap.get(update._id);
      mergedMap.set(update._id, existing ? { ...existing, ...update } : update);
    });

    const merged = Array.from(mergedMap.values());

    const matchesSearch = (candidate: Candidate, term: string) => {
      const q = term.trim().toLowerCase();
      if (!q) return true;
      const inSkills = (candidate.skills || []).some((s) =>
        s?.toLowerCase().includes(q),
      );
      return (
        candidate.name?.toLowerCase().includes(q) ||
        candidate.email?.toLowerCase().includes(q) ||
        candidate.location?.toLowerCase().includes(q) ||
        inSkills
      );
    };

    const matchesStatus = (candidate: Candidate) => {
      if (!filters.status || filters.status === 'all') return true;
      return String(candidate.status) === String(filters.status);
    };

    const matchesArchived = (candidate: Candidate) => {
      if (filters.isArchived) {
        return candidate.isDeleted === true;
      }
      return candidate.isDeleted === false || candidate.isDeleted === undefined;
    };

    const withinAppliedToday = (candidate: Candidate) => {
      if (!filters.appliedToday) return true;
      const createdAt = candidate.tracking?.createdAt;
      if (!createdAt) return false;
      const date = new Date(createdAt);
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return date >= start;
    };

    const withinAppliedThisWeek = (candidate: Candidate) => {
      if (!filters.appliedThisWeek) return true;
      const createdAt = candidate.tracking?.createdAt;
      if (!createdAt) return false;
      const date = new Date(createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    };

    const withinAppliedIn15Days = (candidate: Candidate) => {
      if (!filters.appliedIn15Days) return true;
      const createdAt = candidate.tracking?.createdAt;
      if (!createdAt) return false;
      const date = new Date(createdAt);
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      return date >= fifteenDaysAgo;
    };

    const matchesTopCandidates = (candidate: Candidate) => {
      if (!filters.topCandidates) return true;
      return (candidate.scores?.overall ?? 0) >= 7;
    };

    const matchesFollowUp = (candidate: Candidate) => {
      if (!filters.toFollowUp) return true;
      return Boolean(candidate.followUp?.note || candidate.followUp?.date);
    };

    const matchesAssignment = (candidate: Candidate) => {
      if (filters.assigned) {
        return Boolean(candidate.assignment?.interviewerId);
      }
      if (filters.notAssigned) {
        return !candidate.assignment || !candidate.assignment.interviewerId;
      }
      return true;
    };

    const matchesRemarks = (candidate: Candidate) => {
      if (filters.withRemarks) {
        return Array.isArray(candidate.remarks) ? candidate.remarks.length > 0 : (candidate.remarksCount ?? 0) > 0;
      }
      if (filters.withoutRemarks) {
        const count = Array.isArray(candidate.remarks)
          ? candidate.remarks.length
          : candidate.remarksCount ?? 0;
        return count === 0;
      }
      return true;
    };

    const filtered = merged.filter((candidate) => {
      if (!matchesArchived(candidate)) return false;
      if (!matchesSearch(candidate, debouncedSearch)) return false;
      if (!matchesStatus(candidate)) return false;
      if (!matchesTopCandidates(candidate)) return false;
      if (!withinAppliedToday(candidate)) return false;
      if (!withinAppliedThisWeek(candidate)) return false;
      if (!withinAppliedIn15Days(candidate)) return false;
      if (!matchesFollowUp(candidate)) return false;
      if (!matchesAssignment(candidate)) return false;
      if (!matchesRemarks(candidate)) return false;
      return true;
    });

    const getDateValue = (value?: string | Date | null) => {
      if (!value) return null;
      const d = value instanceof Date ? value : new Date(value);
      const t = d.getTime();
      return Number.isNaN(t) ? null : t;
    };

    const sortBy = filters.sortBy;
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return (
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) *
          sortOrder
        );
      }

      if (sortBy === 'scores.overall') {
        return (
          ((a.scores?.overall ?? 0) - (b.scores?.overall ?? 0)) * sortOrder
        );
      }

      if (sortBy === 'followUp.date') {
        const aTime = getDateValue(a.followUp?.date);
        const bTime = getDateValue(b.followUp?.date);

        // Always push missing follow-up dates to the bottom.
        if (aTime === null && bTime === null) return 0;
        if (aTime === null) return 1;
        if (bTime === null) return -1;
        return (
          (aTime - bTime) *
          sortOrder
        );
      }

      if (sortBy === 'tracking.updatedAt') {
        return (
          ((getDateValue(a.tracking?.updatedAt ?? a.updatedAt) ?? 0) -
            (getDateValue(b.tracking?.updatedAt ?? b.updatedAt) ?? 0)) *
          sortOrder
        );
      }

      // Default: applied date (dateTime)
      return (
        ((getDateValue(a.tracking?.createdAt ?? a.createdAt) ?? 0) -
          (getDateValue(b.tracking?.createdAt ?? b.createdAt) ?? 0)) *
        sortOrder
      );
    });

    if (canSliceFromCache) {
      const start = (page - 1) * limit;
      const end = start + limit;
      return sorted.slice(start, end);
    }

    // Fallback: until we have a contiguous cache up to `page`, show only up to `limit`
    // items based on the current page dataset (plus any SSE patches).
    return sorted.slice(0, limit);
  }, [
    data?.candidates,
    data?.page,
    data?.limit,
    sseCandidates,
    id,
    debouncedSearch,
    filters,
    page,
    limit,
    queryKey,
    cacheTick,
  ]);

  // Sync merged candidates with parent for dialogs
  useEffect(() => {
    if (onDataUpdate && displayCandidates.length > 0) {
      onDataUpdate(displayCandidates);
    }
  }, [displayCandidates, onDataUpdate]);

  useEffect(() => {
    if (onRefetchReady) {
      onRefetchReady(refetch);
    }
  }, [onRefetchReady, refetch]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    if (
      newFilters.status !== filters.status ||
      newFilters.search !== filters.search ||
      newFilters.isArchived !== filters.isArchived
    ) {
      setPage(1);
    }
  };

  const handleClearFilters = () => {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  };

  const handleOpenDuplicates = (candidate: Candidate) => {
    setCandidateToViewDuplicates(candidate);
    setIsDuplicateDialogOpen(true);
  };

  const showSkeleton = isLoading || (isFetching && displayCandidates.length === 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0">
        <CandidateTableFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          visibleColumns={visibleColumns}
          onColumnToggle={setVisibleColumns}
          totalCount={data?.total || 0}
          filteredCount={data?.total || 0}
        />
      </div>

      <div className="flex-1 min-h-0 relative mt-2">
        {showSkeleton ? (
          <CandidateTableSkeleton visibleColumns={visibleColumns} />
        ) : (
          <CandidateTableContent
            candidates={displayCandidates}
            isLoading={isFetching}
            visibleColumns={visibleColumns}
            onCandidateClick={onCandidateClick}
            onActionClick={onActionClick}
            onEditClick={onEditClick}
            onArchiveClick={onArchiveClick}
            onDownloadCV={onDownloadCV}
            onDownloadProfile={onDownloadProfile}
            onOpenDuplicateDialog={handleOpenDuplicates}
          />
        )}
      </div>

      <div className="flex-shrink-0 py-4 bg-white dark:bg-black border-t dark:border-gray-800">
        <CandidatePagination
          currentPage={page}
          totalPages={data?.totalPages || 1}
          totalItems={data?.total || 0}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
          disabled={isFetching}
        />
      </div>

      {candidateToViewDuplicates && (
        <DuplicateCandidatesDialog
          candidate={candidateToViewDuplicates}
          isOpen={isDuplicateDialogOpen}
          onOpenChange={setIsDuplicateDialogOpen}
          onViewDetails={(dup) => {
            setIsDuplicateDialogOpen(false);
            onCandidateClick(dup);
          }}
        />
      )}
    </div>
  );
}
