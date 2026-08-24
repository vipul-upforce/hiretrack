'use client';

import {
  Droppable,
  Draggable,
  type DroppableProvided,
  type DraggableProvided,
} from '@hello-pangea/dnd';
import { GripVertical, ArrowRightToLine, ArrowLeftFromLine } from 'lucide-react';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Virtuoso } from 'react-virtuoso';
import { useLazyFetchLaneCandidatesQuery } from '@/lib/features/candidate/candidateApi';
import { useToast } from '@/hooks/use-toast';
import { useSSE } from '@/hooks/useSSE';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CandidateCardSkeleton } from '@/components/skeletons/candidate-card-skelton';
import CustomScrollbarLane from '@/components/ui/custom-scrollbar-lane';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import {
  setSelectedCandidates,
  toggleCandidateSelection,
} from '@/lib/redux/selectedCandidatesSlice';
import { useShiftKey, setShiftRangeAnchor } from '@/hooks/useShiftKey';
import logger from '@/lib/logger';
import type { Candidate } from '@/types/candidate';
import { getCandidateLaneKey, getJobId } from '../../utils/candidateAccessors';
import { LaneOptionsMenu } from './lanes-options-menu';
import { CandidateCard } from '../Candidate/candidate-card';
import type {
  CandidateContextType,
  KanbanColumnProps,
  LaneRefetchRequestItem,
} from './types';
import { hasActiveFilter } from '../../utils/candidateViewFilter';
import type { JobViewFilter } from '../../utils/jobViewStorage';
import { LANE_PAGE_SIZE } from '@/lib/constants/lanePagination';

type CursorSortOrder = 'asc' | 'desc';

const DATE_SORT_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'tracking.createdAt',
  'tracking.updatedAt',
  'assignment.assignedAt',
]);
const NUMBER_SORT_FIELDS = new Set([
  'scores.overall',
  'experience',
  'expectedCTC',
  'currentCTC',
  'noticePeriod',
]);

function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.').filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function serializeCursorSortValueForPayload(sortBy: string, sortValue: unknown): string | number | null {
  if (sortValue == null) return null;
  if (DATE_SORT_FIELDS.has(sortBy)) {
    const d = sortValue instanceof Date ? sortValue : new Date(String(sortValue));
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  if (NUMBER_SORT_FIELDS.has(sortBy)) {
    if (typeof sortValue === 'number' && Number.isFinite(sortValue)) return sortValue;
    const n = Number(sortValue);
    return Number.isFinite(n) ? n : null;
  }
  return String(sortValue);
}

function encodeLaneCursor(args: {
  sortBy: string;
  sortOrder: CursorSortOrder;
  lastCandidate: Candidate;
}): string {
  const sortValue = serializeCursorSortValueForPayload(
    args.sortBy,
    getNestedValue(args.lastCandidate, args.sortBy),
  );
  const payload = {
    sortBy: args.sortBy,
    sortOrder: args.sortOrder,
    sortValue,
    id: args.lastCandidate._id,
  };
  return base64UrlEncode(JSON.stringify(payload));
}

const CandidateRow = memo(
  ({
    candidate,
    index,
    isPending,
    context,
    isBulkPlaceholder = false,

    bulkDragCount,
  }: {
    candidate: Candidate;
    index: number;
    isPending: boolean;
    context: CandidateContextType;
    isBulkPlaceholder?: boolean;

    bulkDragCount?: number;
  }) => {
    const handleViewDetails = (candidateToView?: Candidate) => {
      context.setSelectedCandidate(candidateToView || candidate);
      context.setIsDetailsOpen(true);
    };

    const handleDelete = () => {
      context.setSelectedCandidate(candidate);
      context.handleDeleteClick(candidate._id);
    };

    const handleSelect = () => {
      context.setSelectedCandidate(candidate);
    };

    return (
      <div className="pb-2">
        <CandidateCard
          key={candidate._id}
          candidate={candidate}
          index={index}
          refetch={context.refetch}
          onViewDetails={handleViewDetails}
          openRemarks={context.openRemarksFor === candidate._id}
          setOpenRemarksFor={context.setOpenRemarksFor}
          onDeleteClick={handleDelete}
          onEditClick={handleSelect}
          onAssignClick={handleSelect}
          onMarkAsDoneClick={handleSelect}
          onFollowUpClick={handleSelect}
          onAddRemarkClick={handleSelect}
          isPending={isPending}
          onSelectCandidate={context.onSelectCandidate}
          isShiftPressed={context.isShiftPressed}
          onUpdate={context.onUpdate}
          onLaneRefetch={context.onLaneRefetch}
          onLaneRefetchCurrentPage={context.onLaneRefetchCurrentPage}
          onValidateStatusChange={context.onValidateStatusChange}
          onDeferStatusToChecklist={context.onDeferStatusToChecklist}
          onOpenChecklistAfterSave={context.onOpenChecklistAfterSave}
          isBulkPlaceholder={isBulkPlaceholder}
          bulkDragCount={bulkDragCount}
        />
      </div>
    );
  },
);
CandidateRow.displayName = 'CandidateRow';

function renderCandidateItem(index: number, candidate: Candidate, context: CandidateContextType) {
  const isPending = context.pendingMoves.some(
    (pm) => pm.candidateId === candidate._id && pm.targetLaneId === context.laneId,
  );
  const bulk = context.bulkDrag;
  const isBulkPlaceholder =
    !!bulk?.isBulkDrag &&
    bulk.bulkIds.includes(candidate._id) &&
    candidate._id !== bulk.draggedId;
  const bulkDragCount =
    bulk?.isBulkDrag &&
      candidate._id === bulk.draggedId &&
      bulk.bulkIds.length > 1
      ? bulk.bulkIds.length
      : undefined;

  return <CandidateRow candidate={candidate} index={index} isPending={isPending} context={context} isBulkPlaceholder={isBulkPlaceholder} bulkDragCount={bulkDragCount} />;
}

/** Animated dots for "Loading more" indicator (no button, CSS-only) */
const LoadingDots = memo(() => (
  <div className="flex items-center justify-center gap-1 py-3" aria-hidden>
    <span
      className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-[bounce_0.6s_ease-in-out_infinite]"
      style={{ animationDelay: '0ms' }}
    />
    <span
      className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-[bounce_0.6s_ease-in-out_infinite]"
      style={{ animationDelay: '150ms' }}
    />
    <span
      className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-[bounce_0.6s_ease-in-out_infinite]"
      style={{ animationDelay: '300ms' }}
    />
  </div>
));
LoadingDots.displayName = 'LoadingDots';

const LoadingFooterBase = memo(() => {
  const skeletonKeys = useMemo(
    () => Array.from({ length: 1 }, (_, i) => `loading-skeleton-${i}`),
    [],
  );
  return (
    <div className="relative overflow-hidden border-t border-border/40 bg-muted/20 px-2 pb-3 pt-2 animate-in fade-in-50 duration-150">
      <LoadingDots />
      <div className="space-y-2">
        {skeletonKeys.map((key) => (
          <div key={key} className="opacity-95">
            <CandidateCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
});
LoadingFooterBase.displayName = 'LoadingFooterBase';

interface LaneFooterContextValue {
  isLoadingMore: boolean;
}

const LaneFooterContext = React.createContext<LaneFooterContextValue | null>(null);

const LaneLoadingFooter = memo(() => {
  const ctx = React.useContext(LaneFooterContext);
  if (!ctx?.isLoadingMore) return null;
  return <LoadingFooterBase />;
});
LaneLoadingFooter.displayName = 'LaneLoadingFooter';

function normalizeLaneToRefetch(laneToRefetch: KanbanColumnProps['laneToRefetch']): LaneRefetchRequestItem[] {
  if (!laneToRefetch) return [];
  return Array.isArray(laneToRefetch) ? laneToRefetch : [laneToRefetch];
}

function mapSortFieldToApi(field: string): string {
  return (
    {
      createdAt: 'tracking.createdAt',
      lastModified: 'tracking.updatedAt',
      assignmentDate: 'assignment.assignedAt',
      experience: 'experience',
      ctc: 'currentCTC',
      expectedCtc: 'expectedCTC',
      noticePeriod: 'noticePeriod',
      aiScore: 'scores.overall',
      name: 'name',
      email: 'email',
      followupDate: 'followUp.date',
    }[field] || field
  );
}

const KanbanColumnCursor = memo(
  ({
    column,
    index,
    isFileOver,
    setIsFileOver,
    handleFileDrop,
    isDragging,
    handleDeleteLane,
    handleEditLane,
    setLaneToDelete,
    setLaneToEdit,
    refetch,
    setSelectedCandidate,
    setIsDetailsOpen,
    openRemarksFor,
    setOpenRemarksFor,
    handleDeleteClick,
    onConfigureChecklist,
    pendingMoves = [],
    laneConfig,
    laneMapping,
    kanbanVisibleCandidatesRef,
    jobId: jobIdProp,
    laneToRefetch,
    onLaneRefetchDone,
    resetLaneToPage1Id,
    onResetLaneDone,
    onLaneRefetch,
    onLaneRefetchCurrentPage,
    viewState,
    setLaneSort,
    resetAllLanesToPage1Key,
    strictApiOnly,
    bulkDragState,
    onValidateStatusChange,

    onDeferStatusToChecklist,

    onOpenChecklistAfterSave,
  }: KanbanColumnProps) => {
    const dispatch = useAppDispatch();
    const isShiftPressed = useShiftKey();
    const user = useAppSelector((state) => state.auth.user);
    const selectedCandidates = useAppSelector(
      (state) => state.selectedCandidates?.candidates ?? [],
    );
    const { toast } = useToast();
    const pathname = usePathname();
    const jobId = jobIdProp || pathname?.split('/')[3];
    const { candidates: sseCandidates } = useSSE<Candidate>(() => {}, null, jobId);

    const laneIdToName = useMemo(() => {
      if (!laneMapping) return undefined;
      return Object.fromEntries(
        Object.entries(laneMapping).map(([name, id]) => [id, name]),
      );
    }, [laneMapping]);

    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const [scrollParentEl, setScrollParentEl] = useState<HTMLDivElement | null>(null);

    const laneFilter = viewState?.filter as Record<string, unknown> | undefined;
    const laneSortEntry = viewState?.laneSort?.[column.id];
    // IMPORTANT: lane-level sort (from viewState.laneSort) must WIN over backend column.sorting
    // so that cursor payload and subsequent page fetches always use the same sortBy/sortOrder.
    const sortBy =
      laneSortEntry?.sortBy ??
      column.sorting?.sortBy ??
      viewState?.sortBy ??
      'tracking.createdAt';
    let sortOrderFromEntry: CursorSortOrder | undefined;
    if (laneSortEntry?.sortOrder === 1) sortOrderFromEntry = 'asc';
    else if (laneSortEntry?.sortOrder === -1) sortOrderFromEntry = 'desc';
    else sortOrderFromEntry = undefined;
    const sortOrder: CursorSortOrder =
      sortOrderFromEntry ??
      column.sorting?.sortOrder ??
      viewState?.sortOrder ??
      'desc';

    // Send laneSort to backend for consistent per-lane cursor pagination.
    const laneSortParam = {
      [column.id]: {
        sortBy,
        sortOrder: sortOrder === 'asc' ? (1 as const) : (-1 as const),
      },
    };

    const [allCandidates, setAllCandidates] = useState<Candidate[]>(() => column.candidates);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const [isLaneOptionsOpen, setIsLaneOptionsOpen] = useState<boolean>(false);
    const [isLaneOpsOpenFor, setIsLaneOpsOpenFor] = useState<string | null>(null);
    const [hasNextPage, setHasNextPage] = useState<boolean>(() => {
      if (column.pageInfo) return column.pageInfo.hasNextPage;
      const total = column.count ?? 0;
      return total > column.candidates.length;
    });
    const [nextCursor, setNextCursor] = useState<string | null>(() => {
      if (column.pageInfo?.nextCursor !== undefined) return column.pageInfo.nextCursor;
      const last = column.candidates[column.candidates.length - 1];
      return last ? encodeLaneCursor({ sortBy, sortOrder, lastCandidate: last }) : null;
    });

    const hasLoadedMoreRef = useRef<boolean>(false);
    const seenIdsRef = useRef<Set<string>>(
      new Set(column.candidates.map((c) => c._id)),
    );
    // Track candidates removed from this lane due to optimistic moves.
    // This persists even when `column.removedFromLaneIds` is cleared after refetch,
    // preventing stale pagination merges from reintroducing moved candidates
    // (notably on the last loaded page).
    const removedFromLaneIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
      const removed = column.removedFromLaneIds ?? [];
      if (removed.length === 0) return;
      for (const id of removed) removedFromLaneIdsRef.current.add(id);
    }, [column.removedFromLaneIds]);

    useEffect(() => {
      const parentIds = new Set(column.candidates.map((c) => c._id));
      let cleared = false;
      removedFromLaneIdsRef.current.forEach((id) => {
        if (parentIds.has(id)) {
          removedFromLaneIdsRef.current.delete(id);
          cleared = true;
        }
      });
      if (cleared) {
        setAllCandidates((prev) => (prev.length > 0 ? [...prev] : prev));
      }
    }, [column.candidates]);
    const loadingRef = useRef<boolean>(false);
    // Track if this lane has ever had visible candidates since mount (from job-level API).
    // Prevents auto-refetch on initial render when job-level candidates haven't been loaded yet.
    const hasEverHadCandidatesRef = useRef<boolean>(column.candidates.length > 0);
    const fetchPurposeRef = useRef<'append' | 'reset'>('append');
    /** True only while an intentional per-lane reset fetch is in flight. */
    const pendingLaneResetRef = useRef<boolean>(false);
    const laneRefetchPendingRef = useRef<boolean>(false);
    const resetToPage1PendingRef = useRef<boolean>(false);
    const userInteractedRef = useRef<boolean>(false);
    const cleanupScrollerListenersRef = useRef<(() => void) | null>(null);

    const laneFooterContextValue = useMemo(
      () => ({ isLoadingMore }),
      [isLoadingMore],
    );

    const filtersActive = useMemo(
      () =>
        hasActiveFilter(
          viewState?.filter as unknown as JobViewFilter | null | undefined,
        ),
      [viewState?.filter],
    );

    const [triggerFetch, { data: nextPageData, isLoading: isFetching }] =
      useLazyFetchLaneCandidatesQuery();

    // Deterministic mode: render strictly from API response (no local cached pages / SSE overlay).
    useEffect(() => {
      if (!strictApiOnly) return;
      hasLoadedMoreRef.current = false;
      loadingRef.current = false;
      setIsLoadingMore(false);
      fetchPurposeRef.current = 'reset';
      userInteractedRef.current = false;
      setAllCandidates(column.candidates);
      seenIdsRef.current = new Set(column.candidates.map((c) => c._id));
      setHasNextPage(column.pageInfo?.hasNextPage ?? false);
      setNextCursor(column.pageInfo?.nextCursor ?? null);
    }, [
      strictApiOnly,
      column.candidates,
      column.pageInfo?.hasNextPage,
      column.pageInfo?.nextCursor,
    ]);

    // The grouped API response populates `column.pageInfo` after mount.
    // Sync it into local pagination state unless we've already started cursor paging.
    useEffect(() => {
      if (hasLoadedMoreRef.current) return;
      if (!column.pageInfo) return;
      setHasNextPage(column.pageInfo.hasNextPage);
      setNextCursor(column.pageInfo.nextCursor);
    }, [column.pageInfo?.hasNextPage, column.pageInfo?.nextCursor]);

    const attachScrollerListeners = useCallback((el: HTMLDivElement | null) => {
      // Clean up prior listeners if scroller element changes
      cleanupScrollerListenersRef.current?.();
      cleanupScrollerListenersRef.current = null;

      if (!el) return;

      const markInteracted = () => {
        userInteractedRef.current = true;
      };
      el.addEventListener('scroll', markInteracted, { passive: true });
      el.addEventListener('wheel', markInteracted, { passive: true });
      el.addEventListener('touchmove', markInteracted, { passive: true });
      cleanupScrollerListenersRef.current = () => {
        el.removeEventListener('scroll', markInteracted);
        el.removeEventListener('wheel', markInteracted);
        el.removeEventListener('touchmove', markInteracted);
      };
    }, []);

    const handleLaneScrollParentRef = useCallback(
      (div: HTMLDivElement | null) => {
        scrollerRef.current = div;
        setScrollParentEl(div);
        attachScrollerListeners(div);
      },
      [attachScrollerListeners],
    );

    useEffect(
      () => () => {
        cleanupScrollerListenersRef.current?.();
        cleanupScrollerListenersRef.current = null;
      },
      [],
    );

    // Reset to page 1 when job-level filter/sort changes (parent bumps key)
    const prevResetKeyRef = useRef(resetAllLanesToPage1Key ?? 0);
    useEffect(() => {
      const key = resetAllLanesToPage1Key ?? 0;
      if (key === 0 || key === prevResetKeyRef.current) return;
      prevResetKeyRef.current = key;
      hasLoadedMoreRef.current = false;
      loadingRef.current = false;
      setIsLoadingMore(false);
      fetchPurposeRef.current = 'reset';
      userInteractedRef.current = false;
      setAllCandidates(column.candidates);
      seenIdsRef.current = new Set(column.candidates.map((c) => c._id));
      const total = column.count ?? 0;
      setHasNextPage(column.pageInfo?.hasNextPage ?? total > column.candidates.length);
      const last = column.candidates[column.candidates.length - 1];
      setNextCursor(
        column.pageInfo?.nextCursor ??
        (last ? encodeLaneCursor({ sortBy, sortOrder, lastCandidate: last }) : null),
      );
    }, [
      resetAllLanesToPage1Key,
      column.candidates,
      column.count,
      column.pageInfo,
      sortBy,
      sortOrder,
    ]);

    // Merge parent updates (SSE / drag moves) without overwriting loaded pages
    useEffect(() => {
      setAllCandidates((prev) => {
        const parentIds = new Set(column.candidates.map((c) => c._id));

        // 1. Identify "Moved Out" candidates. 
        // A candidate is "Moved Out" if it's in our local list but:
        // - It's in the parent's 'removedFromLaneIds' list
        // - AND it's NOT currently in the parent's candidate list (which would mean it's back)
        const removedSet = new Set(column.removedFromLaneIds ?? []);
        const isRemoved = (id: string) => removedSet.has(id);

        const parentSlice = column.candidates.filter((c) => !isRemoved(c._id));
        const parentIdSet = new Set(parentSlice.map((c) => c._id));

        // Parent only holds page-1 (+ SSE overlays). Preserve cursor-loaded pages
        // whenever the user has scrolled past page 1 (ref or list length signal).
        const preserveLoadedPages =
          hasLoadedMoreRef.current || prev.length > parentSlice.length;

        const tailSlice = preserveLoadedPages
          ? prev.filter(
              (c) => !parentIdSet.has(c._id) && !isRemoved(c._id),
            )
          : prev.filter((c) => {
              const isExplicitlyRemoved = removedSet.has(c._id);
              const isPresentInParent = parentIds.has(c._id);
              if (isExplicitlyRemoved && !isPresentInParent) return false;
              return !isPresentInParent;
            }).filter((c) => !isRemoved(c._id));

        const parentIdsDeduped = new Set(parentSlice.map((c) => c._id));
        const uniqueTail = tailSlice.filter((c) => !parentIdsDeduped.has(c._id));
        const next = [...parentSlice, ...uniqueTail];

        if (uniqueTail.length > 0) {
          hasLoadedMoreRef.current = true;
        }

        // 4. Update references
        seenIdsRef.current = new Set(next.map((c) => c._id));
        if (next.length > 0) {
          hasEverHadCandidatesRef.current = true;
        }

        return next;
      });
    }, [column.candidates, column.removedFromLaneIds]);

    // Apply SSE updates to already-loaded local lane candidates (page 2+) by id.
    // This keeps deep paginated candidates in sync without injecting unseen candidates.
    useEffect(() => {
      if (!sseCandidates.length) return;

      setAllCandidates((prev) => {
        let changed = false;
        const next: Candidate[] = [];

        for (const existing of prev) {
          const incoming = sseCandidates.find((candidate) => candidate._id === existing._id);
          if (!incoming) {
            next.push(existing);
            continue;
          }

          const nextLane = getCandidateLaneKey(incoming, laneIdToName);
          const currentLane = column.id.toLowerCase();

          if (nextLane !== null && nextLane !== currentLane) {
            changed = true;
            seenIdsRef.current.delete(existing._id);
            removedFromLaneIdsRef.current.add(existing._id);
            continue;
          }

          next.push({ ...existing, ...incoming });
          changed = true;
        }

        if (!changed) return prev;
        seenIdsRef.current = new Set(next.map((candidate) => candidate._id));
        return next;
      });
    }, [sseCandidates, column.id, laneIdToName]);

    // When SSE removes all visible candidates from this lane (bulk move) but the lane still has candidates
    // on the server (count > 0) and cursor pagination indicates more data (hasNextPage/nextCursor),
    // automatically refetch page 1 for this lane on Client B so the next slice becomes visible.
    // This avoids the "empty lane UI with non-zero count" issue without relying on offset-based pagination.
    useEffect(() => {
      if (!jobId) return;
      if (filtersActive) {
        // Under filters we rely solely on grouped candidates API, never per-lane resets.
        return;
      }

      const { count: laneCount } = column;
      const laneTotalCount = laneCount ?? 0;
      const hasVisibleCandidates = allCandidates.length > 0;

      const shouldAutoRefetchSourceLane =
        !hasVisibleCandidates &&
        laneTotalCount > 0 &&
        hasEverHadCandidatesRef.current &&
        !laneRefetchPendingRef.current &&
        !loadingRef.current;

      if (!shouldAutoRefetchSourceLane) return;

      logger.info('[CursorLane] auto-refetch page1 (SSE empty-lane recovery)', {
        lane: column.id,
        allCandidatesLength: allCandidates.length,
        laneTotalCount,
        hasVisibleCandidates,
        hasEverHadCandidates: hasEverHadCandidatesRef.current,
        laneRefetchPending: laneRefetchPendingRef.current,
        loadingRef: loadingRef.current,
        columnCount: column.count,
        pageInfoNextCursor: column.pageInfo?.nextCursor,
      });

      // On connected clients, the per-lane cursor cache can get evicted before
      // SSE moved-in candidates appear in the target lane UI.
      // Prefer a grouped (job-level) refetch so the whole lane set is rebuilt.
      loadingRef.current = true;
      setIsLoadingMore(true);
      laneRefetchPendingRef.current = true;

      Promise.resolve(refetch())
        .catch((err) => {
          logger.error('[CursorLane] grouped refetch failed', {
            lane: column.id,
            error: err instanceof Error ? err.message : String(err),
          });
        })
        .finally(() => {
          loadingRef.current = false;
          setIsLoadingMore(false);
          laneRefetchPendingRef.current = false;
          onLaneRefetchDone?.(column.id);
        });
    }, [
      allCandidates.length,
      column.count,
      column.pageInfo,
      column.id,
      jobId,
      triggerFetch,
      refetch,
      laneFilter,
      sortBy,
      sortOrder,
      filtersActive,
    ]);

    /**
     * Local shrink fill strategy (cursor mode):
     * When two slots remain before a full page (page size - 2), load the next cursor page
     * so the lane doesn't show an empty gap while more data exists offscreen.
     */
    const autoAppendNextPageAfterLocalShrinkRef = useRef<string | null>(null);
    useEffect(() => {
      if (!jobId) return;
      if (strictApiOnly) return;
      if (filtersActive) return;
      if (loadingRef.current || isLoadingMore) return;
      if (!hasNextPage) return;
      if (hasLoadedMoreRef.current) return;

      // Fire when two slots remain before a full page (e.g. 18 visible when page size is 20).
      if (allCandidates.length !== LANE_PAGE_SIZE - 2) return;

      const laneTotalCount = column.count ?? 0;
      if (laneTotalCount <= allCandidates.length) return;
      if (!nextCursor) return;

      const sig = `${column.id}:appendAfterShrink:${allCandidates.length}:next:${nextCursor}`;
      if (autoAppendNextPageAfterLocalShrinkRef.current === sig) return;
      autoAppendNextPageAfterLocalShrinkRef.current = sig;

      loadingRef.current = true;
      setIsLoadingMore(true);
      fetchPurposeRef.current = 'append';
      triggerFetch({
        jobId,
        laneName: column.id,
        cursor: nextCursor ?? undefined,
        limit: LANE_PAGE_SIZE,
        filter: laneFilter,
        sortBy,
        sortOrder,
        laneSort: laneSortParam,
      });
    }, [
      jobId,
      strictApiOnly,
      filtersActive,
      allCandidates.length,
      column.count,
      column.id,
      hasNextPage,
      nextCursor,
      isLoadingMore,
      triggerFetch,
      laneFilter,
      sortBy,
      sortOrder,
      laneSortParam,
    ]);

    // Trigger a reset refetch for this lane (status/drag/current page updates)
    useEffect(() => {
      if (!laneToRefetch || !jobId) return;
      const request = normalizeLaneToRefetch(laneToRefetch).find(
        (r) => r.laneId === column.id,
      );
      if (!request) return;

      // When job-level filters are active, avoid issuing extra per-lane API calls.
      // The grouped candidates API (useNormalizedCandidates) is the single source of truth.
      if (filtersActive) {
        logger.info('[CursorLane] skip lane refetch due to active filter', {
          lane: column.id,
        });
        onLaneRefetchDone?.(column.id);
        return;
      }

      // Tags/remark/assign/etc.: keep cursor-loaded pages; SSE + onUpdate patch cards in place.
      if (
        request.refetchCurrentPageOnly === true &&
        hasLoadedMoreRef.current
      ) {
        onLaneRefetchDone?.(column.id);
        return;
      }

      loadingRef.current = true;
      setIsLoadingMore(true);
      hasLoadedMoreRef.current = false;
      fetchPurposeRef.current = 'reset';
      pendingLaneResetRef.current = true;
      laneRefetchPendingRef.current = true;
      triggerFetch({
        jobId,
        laneName: column.id,
        page: 1,
        limit: LANE_PAGE_SIZE,
        filter: laneFilter,
        sortBy,
        sortOrder,
        laneSort: laneSortParam,
      });
    }, [
      laneToRefetch,
      jobId,
      column.id,
      triggerFetch,
      laneFilter,
      sortBy,
      sortOrder,
      filtersActive,
      onLaneRefetchDone,
    ]);

    // Force reset lane to page 1 after migration
    useEffect(() => {
      if (!jobId) return;
      if (resetLaneToPage1Id !== column.id) return;
      if (filtersActive) {
        // Under filters we never do per-lane fetches; grouped API will update lanes.
        return;
      }
      loadingRef.current = true;
      setIsLoadingMore(true);
      hasLoadedMoreRef.current = false;
      fetchPurposeRef.current = 'reset';
      pendingLaneResetRef.current = true;
      resetToPage1PendingRef.current = true;
      triggerFetch({
        jobId,
        laneName: column.id,
        page: 1,
        limit: LANE_PAGE_SIZE,
        filter: laneFilter,
        sortBy,
        sortOrder,
        laneSort: laneSortParam,
      });
    }, [
      resetLaneToPage1Id,
      column.id,
      jobId,
      triggerFetch,
      laneFilter,
      sortBy,
      sortOrder,
      filtersActive,
    ]);

    const handleLoadMore = useCallback(() => {
      if (!jobId) return;
      if (!hasNextPage) return;
      if (loadingRef.current || isLoadingMore) return;
      const scroller = scrollerRef.current;
      if (scroller) {
        // If the lane doesn't overflow, Virtuoso may call endReached immediately on mount.
        // Treat that as a non-user-triggered prefetch and skip.
        const hasOverflow = scroller.scrollHeight > scroller.clientHeight + 1;
        if (!hasOverflow) return;
        // If the user actually scrolled this lane, allow the first load-more.
        if (scroller.scrollTop > 0) userInteractedRef.current = true;
      }
      if (!userInteractedRef.current) return;
      if (allCandidates.length > 0 && !nextCursor) {
        logger.warn('[CursorLane] missing nextCursor; skipping load more', {
          lane: column.id,
          sortBy,
          sortOrder,
        });
        return;
      }

      loadingRef.current = true;
      setIsLoadingMore(true);
      fetchPurposeRef.current = 'append';
      triggerFetch({
        jobId,
        laneName: column.id,
        cursor: nextCursor ?? undefined,
        limit: LANE_PAGE_SIZE,
        filter: laneFilter,
        sortBy,
        sortOrder,
        laneSort: laneSortParam,
      });
    }, [
      jobId,
      hasNextPage,
      isLoadingMore,
      allCandidates.length,
      nextCursor,
      triggerFetch,
      column.id,
      laneFilter,
      sortBy,
      sortOrder,
      filtersActive,
    ]);

    // Merge cursor page results
    useEffect(() => {
      if (!nextPageData?.candidates) return;

      const responseLane = nextPageData.meta?.lane?.toLowerCase();
      if (responseLane && responseLane !== column.id.toLowerCase()) {
        return;
      }

      const incoming = nextPageData.candidates;
      const nextInfo = nextPageData.pageInfo;

      if (
        fetchPurposeRef.current === 'reset' &&
        pendingLaneResetRef.current
      ) {
        pendingLaneResetRef.current = false;
        setAllCandidates(incoming);
        seenIdsRef.current = new Set(incoming.map((c) => c._id));
        setHasNextPage(nextInfo?.hasNextPage ?? nextPageData.pagination?.hasNextPage ?? false);
        setNextCursor(nextInfo?.nextCursor ?? null);
        fetchPurposeRef.current = 'append';
      } else if (fetchPurposeRef.current === 'reset') {
        fetchPurposeRef.current = 'append';
      } else {
        const beforeSize = seenIdsRef.current.size;
        const deduped = incoming.filter((c) => !seenIdsRef.current.has(c._id));
        const dedupedCount = incoming.length - deduped.length;

        if (dedupedCount > 0) {
          logger.info('[CursorLane] cursorDedupe', {
            lane: column.id,
            dedupedCount,
            incomingCount: incoming.length,
          });
        }

        setAllCandidates((prev) => {
          const next = [...prev, ...deduped];
          seenIdsRef.current = new Set(next.map((c) => c._id));
          return next;
        });

        hasLoadedMoreRef.current = hasLoadedMoreRef.current || deduped.length > 0;

        if (nextInfo) {
          setHasNextPage(nextInfo.hasNextPage);
          setNextCursor(nextInfo.nextCursor);
        } else {
          // Back-compat fallback: compute from current list and counts
          const total = column.count ?? nextPageData.pagination?.total ?? 0;
          const currentSize = beforeSize + deduped.length;
          setHasNextPage(total > currentSize);
          const last = deduped.length > 0 ? deduped[deduped.length - 1] : null;
          if (last)
            setNextCursor(encodeLaneCursor({ sortBy, sortOrder, lastCandidate: last }));
        }
      }

      loadingRef.current = false;
      setIsLoadingMore(false);

      // Notify parent only for explicit lane reset/refetch signals
      if (laneRefetchPendingRef.current) {
        laneRefetchPendingRef.current = false;
        onLaneRefetchDone?.(column.id);
      }
      if (resetToPage1PendingRef.current) {
        resetToPage1PendingRef.current = false;
        onResetLaneDone?.(column.id);
      }
    }, [
      nextPageData,
      column.id,
      column.count,
      onLaneRefetchDone,
      onResetLaneDone,
      sortBy,
      sortOrder,
    ]);

    useEffect(() => {
      if (isFetching) {
        setIsLoadingMore(true);
        loadingRef.current = true;
      }
    }, [isFetching]);

    const processedCandidates = useMemo(
      () => {
        const filtered = allCandidates.filter((candidate) => {
          if (removedFromLaneIdsRef.current.has(candidate._id)) return false;
          if (!jobId) return true;
          const candidateJobId = getJobId(candidate)?.toString();
          if (!candidateJobId) return true;
          return candidateJobId === jobId.toString();
        });
        // Defensive: avoid showing duplicate rows when local merges
        // temporarily contain the same candidate multiple times.
        const seen = new Set<string>();
        return filtered.filter((c) => {
          if (seen.has(c._id)) return false;
          seen.add(c._id);
          return true;
        });
      },
      [allCandidates, jobId],
    );

    useEffect(() => {
      const registry = kanbanVisibleCandidatesRef?.current;
      if (!registry) return undefined;

      for (const candidate of processedCandidates) {
        registry.set(candidate._id, candidate);
      }

      return () => {
        for (const candidate of processedCandidates) {
          if (registry.get(candidate._id) === candidate) {
            registry.delete(candidate._id);
          }
        }
      };
    }, [processedCandidates, kanbanVisibleCandidatesRef]);

    const onSelectCandidate = useCallback(
      (candidate: Candidate, candidateIndex: number) => {
        const laneId = column.id;
        const laneIdSet = new Set(processedCandidates.map((c) => c._id));
        const hasSelectionOutsideCurrentLane = selectedCandidates.some(
          (c) => !laneIdSet.has(c._id),
        );

        if (isShiftPressed) {
          const selectedInLane = selectedCandidates.filter((c) =>
            laneIdSet.has(c._id),
          );
          if (hasSelectionOutsideCurrentLane) {
            dispatch(setSelectedCandidates([candidate]));
            setShiftRangeAnchor(laneId, candidateIndex);
            return;
          }
          if (selectedInLane.length === 0) {
            const next = selectedCandidates.some((c) => c._id === candidate._id)
              ? selectedCandidates
              : [...selectedCandidates, candidate];
            dispatch(setSelectedCandidates(next));
            setShiftRangeAnchor(laneId, candidateIndex);
          } else {
            const lastSelected = selectedInLane[selectedInLane.length - 1];
            const lastIndex = processedCandidates.findIndex(
              (c) => c._id === lastSelected._id,
            );
            if (lastIndex === -1) {
              const next = selectedCandidates.some((c) => c._id === candidate._id)
                ? selectedCandidates
                : [...selectedCandidates, candidate];
              dispatch(setSelectedCandidates(next));
              setShiftRangeAnchor(laneId, candidateIndex);
            } else {
              const lo = Math.min(lastIndex, candidateIndex);
              const hi = Math.max(lastIndex, candidateIndex);
              const range = processedCandidates.slice(lo, hi + 1);
              const inLaneIds = selectedInLane.map((c) => c._id);
              const mergedIds = new Set([
                ...inLaneIds,
                ...range.map((c) => c._id),
              ]);
              const mergedInLane = processedCandidates.filter((c) =>
                mergedIds.has(c._id),
              );
              const rest = selectedCandidates.filter((c) => !laneIdSet.has(c._id));
              dispatch(setSelectedCandidates([...rest, ...mergedInLane]));
              setShiftRangeAnchor(laneId, candidateIndex);
            }
          }
        } else {
          if (hasSelectionOutsideCurrentLane) {
            dispatch(setSelectedCandidates([candidate]));
            return;
          }
          dispatch(toggleCandidateSelection({ ...candidate, isSelected: true }));
        }
      },
      [
        isShiftPressed,
        column.id,
        processedCandidates,
        selectedCandidates,
        dispatch,
      ],
    );

    const handleCandidateUpdate = useCallback((updatedCandidate: Candidate) => {
      setAllCandidates((prev) => {
        const idx = prev.findIndex((c) => c._id === updatedCandidate._id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], ...updatedCandidate };
        return next;
      });
    }, []);

    const contextValue = useMemo<CandidateContextType>(
      () => ({
        laneId: column.id,
        pendingMoves,
        refetch,
        openRemarksFor,
        setOpenRemarksFor,
        setSelectedCandidate,
        handleDeleteClick,
        setIsDetailsOpen,
        onUpdate: handleCandidateUpdate,
        onLaneRefetch,
        onLaneRefetchCurrentPage,
        onSelectCandidate,
        isShiftPressed,
        onValidateStatusChange,
        onDeferStatusToChecklist,
        onOpenChecklistAfterSave,
        bulkDrag: bulkDragState,

      }),
      [
        column.id,
        pendingMoves,
        refetch,
        openRemarksFor,
        setOpenRemarksFor,
        setSelectedCandidate,
        handleDeleteClick,
        setIsDetailsOpen,
        handleCandidateUpdate,
        onLaneRefetch,
        onLaneRefetchCurrentPage,
        onSelectCandidate,
        isShiftPressed,
        onValidateStatusChange,
        onDeferStatusToChecklist,
        onOpenChecklistAfterSave,
        bulkDragState,

      ],
    );

    const handleSort = useCallback(
      async (field: string, direction: CursorSortOrder) => {
        try {
          const apiSortField = mapSortFieldToApi(field);
          const sortOrderNum = direction === 'asc' ? 1 : -1;

          // Persist lane sort preference (localStorage / viewState) but DO NOT
          // trigger a job-level candidates refetch; lane sorting is handled
          // exclusively via this lane-scoped cursor API.
          setLaneSort?.(column.id, {
            sortBy: apiSortField,
            sortOrder: sortOrderNum,
          });

          // Reset only this lane's pagination + data
          loadingRef.current = true;
          setIsLoadingMore(true);
          hasLoadedMoreRef.current = false;
          fetchPurposeRef.current = 'reset';
          pendingLaneResetRef.current = true;

          const laneData = await triggerFetch({
            jobId: jobId ?? '',
            laneName: column.id,
            page: 1,
            limit: LANE_PAGE_SIZE,
            filter: laneFilter,
            sortBy: apiSortField,
            sortOrder: direction,
            laneSort: {
              [column.id]: {
                sortBy: apiSortField,
                sortOrder: direction === 'asc' ? (1 as const) : (-1 as const),
              },
            },
          }).unwrap();

          const nextCandidates = laneData?.candidates ?? [];
          setAllCandidates(nextCandidates);
          seenIdsRef.current = new Set(nextCandidates.map((c) => c._id));
          setHasNextPage(
            laneData?.pageInfo?.hasNextPage ??
            laneData?.pagination?.hasNextPage ??
            false,
          );
          setNextCursor(laneData?.pageInfo?.nextCursor ?? null);
        } catch (error) {
          toast({
            title: 'Error',
            description:
              error instanceof Error ? error.message : 'Failed to update sorting',
            variant: 'destructive',
          });
        } finally {
          loadingRef.current = false;
          setIsLoadingMore(false);
        }
      },
      [jobId, column.id, setLaneSort, triggerFetch, laneFilter, toast],
    );

    return (
      <Draggable draggableId={column.id} index={index} isDragDisabled={false}>
        {(provided: DraggableProvided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`min-w-[450px] flex-1 ${index === 0 ? 'pl-0 pr-1' : 'px-1'}`}
            style={{
              ...provided.draggableProps.style,
              userSelect: 'none',
            }}
          >
            <div className="flex h-full w-full min-w-0 max-w-full flex-col rounded-xl border border-gray-200/50 bg-white/70 p-2 shadow-sm dark:border-gray-700/50 dark:bg-black/30">
              <div className="mb-2 flex-shrink-0 px-2 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      role="button"
                      tabIndex={0}
                      {...provided.dragHandleProps}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        provided.dragHandleProps?.onMouseDown?.(e);
                      }}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <GripVertical className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <h3 className="truncate text-sm font-semibold capitalize tracking-wide text-gray-700 dark:text-gray-300">
                      {column.title}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {laneConfig?.incomingChecklist && (
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                role="button"
                                tabIndex={0}
                                className="flex cursor-pointer items-center text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onConfigureChecklist?.(
                                    column.id,
                                    column.title,
                                    'incoming',
                                  );
                                }}
                              >
                                <ArrowRightToLine className="h-3.5 w-3.5" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-black dark:text-gray-100">
                              <p className="text-xs">
                                Incoming checklist: {laneConfig.incomingChecklist.name}
                                {laneConfig.incomingChecklist.isMandatory &&
                                  ' (Mandatory)'}
                                <br />
                                {user?.role !== 'hr' && (
                                  <span className="text-blue-600 dark:text-blue-400">
                                    Click to configure
                                  </span>
                                )}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {laneConfig?.outgoingChecklist && (
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                role="button"
                                tabIndex={0}
                                className="flex cursor-pointer items-center text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onConfigureChecklist?.(
                                    column.id,
                                    column.title,
                                    'outgoing',
                                  );
                                }}
                              >
                                <ArrowLeftFromLine className="h-3.5 w-3.5 scale-x-[-1]" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-black dark:text-gray-100">
                              <p className="text-xs">
                                Outgoing checklist: {laneConfig.outgoingChecklist.name}
                                {laneConfig.outgoingChecklist.isMandatory &&
                                  ' (Mandatory)'}
                                <br />
                                <span className="text-blue-600 dark:text-blue-400">
                                  Click to configure
                                </span>
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <span className="min-w-[24px] rounded-full bg-white px-2 py-1 text-center text-xs font-medium text-gray-500 shadow-sm dark:bg-gray-700 dark:text-gray-400">
                      {column.count ?? processedCandidates.length}
                    </span>
                    <LaneOptionsMenu
                      laneId={column.id}
                      laneName={column.title}
                      onSort={handleSort}
                      handleDeleteLane={handleDeleteLane}
                      setLaneToDelete={setLaneToDelete}
                      setLaneToEdit={setLaneToEdit}
                      sorting={column.sorting}
                      onEdit={handleEditLane}
                      onConfigureChecklist={onConfigureChecklist}
                      isOpen={isLaneOptionsOpen && column.id === isLaneOpsOpenFor}
                      setIsOpen={(open) => {
                        setIsLaneOptionsOpen(open);
                        setIsLaneOpsOpenFor(open ? column.id : null);
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-2 overflow-hidden pr-2">
                <Droppable droppableId={column.id} type="candidate">
                  {(droppableProvided: DroppableProvided) => (
                    <div
                      ref={droppableProvided.innerRef}
                      {...droppableProvided.droppableProps}
                      className="relative h-full"
                      onDragOver={(e) => {
                        if (
                          e.dataTransfer.types.includes('Files') &&
                          column.id === 'applied'
                        ) {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsFileOver(true);
                          e.dataTransfer.dropEffect = 'link';
                        }
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsFileOver(false);
                        e.dataTransfer.dropEffect = 'none';
                      }}
                      onDrop={(e) => {
                        if (e.dataTransfer.types.includes('Files')) {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsFileOver(false);
                          const files = Array.from(e.dataTransfer.files);
                          if (files.length > 0) handleFileDrop(files[0]);
                        }
                      }}
                    >
                      {isFileOver && column.id === 'applied' && (
                        <div className="pointer-events-none absolute z-10 h-full w-full rounded-lg border border-dashed border-gray-500 bg-gray-200/50">
                          <div className="animate-fade-in pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform rounded-md bg-black p-2 text-lg font-semibold text-white shadow-lg">
                            Drop file here!
                          </div>
                        </div>
                      )}

                      <LaneFooterContext.Provider value={laneFooterContextValue}>
                        <CustomScrollbarLane
                          ref={handleLaneScrollParentRef}
                          isDragging={isDragging}
                          className="h-full"
                        >
                          <Virtuoso
                            style={{ height: '100%', scrollbarWidth: 'none' }}
                            data={processedCandidates}
                            increaseViewportBy={{ bottom: 350, top: 350 }}
                            customScrollParent={scrollParentEl ?? undefined}
                            computeItemKey={(_index, candidate) => candidate._id}
                            itemContent={renderCandidateItem}
                            context={contextValue}
                            components={{ Footer: LaneLoadingFooter }}
                            endReached={handleLoadMore}
                          />
                        </CustomScrollbarLane>
                      </LaneFooterContext.Provider>

                      {droppableProvided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          </div>
        )}
      </Draggable>
    );
  },
);

KanbanColumnCursor.displayName = 'KanbanColumnCursor';

export { KanbanColumnCursor };

