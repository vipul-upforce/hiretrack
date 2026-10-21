'use client';

/* eslint-disable max-lines */
import {
  Droppable,
  Draggable,
  type DroppableProvided,
  type DraggableProvided,
} from '@hello-pangea/dnd';
import {
  GripVertical,
  ArrowRightToLine,
  ArrowLeftFromLine,
} from 'lucide-react';
import { Candidate } from '@/types/candidate';
import React, { useState, useMemo, memo, useCallback, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Virtuoso } from 'react-virtuoso';
import { useLazyFetchLaneCandidatesQuery } from '@/lib/features/candidate/candidateApi';
import { useToast } from '@/hooks/use-toast';
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
import { getJobId } from '../../utils/candidateAccessors';
import { LaneOptionsMenu } from './lanes-options-menu';
import { CandidateCard } from '../Candidate/candidate-card';
import { CandidateContextType, KanbanColumnProps } from './types';
import { hasActiveFilter } from '../../utils/candidateViewFilter';
import type { JobViewFilter } from '../../utils/jobViewStorage';
import { LANE_PAGE_SIZE } from '@/lib/constants/lanePagination';

// --- 2. Extract CandidateRow (Pure Component) ---
const CandidateRow = memo(
  ({
    candidate,
    index,
    isPending,
    context,
  }: {
    candidate: Candidate;
    index: number;
    isPending: boolean;
    context: CandidateContextType;
  }) => {
    // Helper handlers using context
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
          onValidateStatusChange={context.onValidateStatusChange}
          onDeferStatusToChecklist={context.onDeferStatusToChecklist}
          onOpenChecklistAfterSave={context.onOpenChecklistAfterSave}
          onUpdate={context.onUpdate}
          onLaneRefetch={context.onLaneRefetch}
          onLaneRefetchCurrentPage={context.onLaneRefetchCurrentPage}
        />
      </div>
    );
  },
);
CandidateRow.displayName = 'CandidateRow';

// --- 3. Define Item Content Function OUTSIDE Component ---
// This function is static and never recreated. It receives `context` as the 3rd arg.
function renderCandidateItem(
  index: number,
  candidate: Candidate,
  context: CandidateContextType,
) {
  const isPending = context.pendingMoves.some(
    (pm) =>
      pm.candidateId === candidate._id && pm.targetLaneId === context.laneId,
  );

  return (
    <CandidateRow
      candidate={candidate}
      index={index}
      isPending={isPending}
      context={context}
    />
  );
}

// Footer component for loading skeletons during pagination
// Only shows when loading more pages (not for empty lanes)
// Note: This will be wrapped to receive laneCount from context
const LoadingFooterBase = memo(() => {
  // Generate stable keys for skeleton items
  const skeletonKeys = useMemo(
    () => Array.from({ length: 2 }, (_, i) => `loading-skeleton-${i}`),
    [],
  );

  return (
    <div className="space-y-2 p-2">
      {skeletonKeys.map((key) => (
        <CandidateCardSkeleton key={key} />
      ))}
    </div>
  );
});
LoadingFooterBase.displayName = 'LoadingFooterBase';

interface LaneFooterPropsRef {
  isLoadingMore: boolean;
  shouldShowLoadingFooter: boolean;
}

const LaneFooterContext = React.createContext<
  React.MutableRefObject<LaneFooterPropsRef | null>
>({ current: null });

function LaneFooterInner() {
  const ref = React.useContext(LaneFooterContext);
  if (!ref?.current) return null;
  const { shouldShowLoadingFooter } = ref.current;
  if (shouldShowLoadingFooter) {
    return <LoadingFooterBase />;
  }
  return null;
}
const LaneFooter = memo(LaneFooterInner);
LaneFooter.displayName = 'LaneFooter';

const KanbanColumn = memo(
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
        onValidateStatusChange,
        onDeferStatusToChecklist,
        onOpenChecklistAfterSave,
        laneMapping: _laneMapping,
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
    strictApiOnly: _strictApiOnly,
  }: KanbanColumnProps) => {
    const dispatch = useAppDispatch();
    const isShiftPressed = useShiftKey();
    const [isLaneOptionsOpen, setIsLaneOptionsOpen] = useState<boolean>(false);
    const [isLaneOpsOpenFor, setIsLaneOpsOpenFor] = useState<string | null>(
      null,
    );
    const user = useAppSelector((state) => state.auth.user);
    const selectedCandidates = useAppSelector((state) => state.selectedCandidates?.candidates ?? []); const { toast } = useToast();

    const pathname = usePathname();
    const jobId = jobIdProp || pathname?.split('/')[3];

    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const laneFooterPropsRef = useRef<LaneFooterPropsRef | null>(null);

    // Build filter + sort for this lane (for triggerFetch)
    const laneFilter = viewState?.filter as Record<string, unknown> | undefined;
    const laneSortEntry = viewState?.laneSort?.[column.id];
    const sortBy =
      column.sorting?.sortBy ??
      laneSortEntry?.sortBy ??
      viewState?.sortBy ??
      'tracking.createdAt';
    let sortOrderFromEntry: 'asc' | 'desc' | undefined;
    if (laneSortEntry?.sortOrder === 1) sortOrderFromEntry = 'asc';
    else if (laneSortEntry?.sortOrder === -1) sortOrderFromEntry = 'desc';
    else sortOrderFromEntry = undefined;
    const sortOrder =
      column.sorting?.sortOrder ??
      sortOrderFromEntry ??
      viewState?.sortOrder ??
      'desc';

    // Send laneSort to backend for consistent per-lane pagination.
    const laneSortParam = {
      [column.id]: {
        sortBy,
        sortOrder: sortOrder === 'asc' ? (1 as const) : (-1 as const),
      },
    };

    const [currentPage, setCurrentPage] = useState(1);
    const [allCandidates, setAllCandidates] = useState<Candidate[]>(
      () => column.candidates,
    );
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [requestedPage, setRequestedPage] = useState<number | null>(null);
    const loadingRef = useRef(false);
    const loadedPagesRef = useRef<Set<number>>(new Set([1]));
    const previousColumnCandidatesRef = useRef<string>(
      column.candidates.map((c) => c._id).join(','),
    );
    const previousFiltersRef = useRef<string>((column.filters || []).join('|'));
    const previousSortingRef = useRef<string>(
      column.sorting
        ? `${column.sorting.sortBy}|${column.sorting.sortOrder}`
        : '',
    );
    // Authoritative list of candidate IDs removed from this lane due to optimistic
    // drag/bulk moves. We keep filtering against it even after the prop is cleared,
    // to avoid stale pagination merges reintroducing moved candidates (especially
    // on the last loaded page).
    const removedFromLaneIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
      const removed = column.removedFromLaneIds ?? [];
      if (removed.length === 0) return;
      for (const id of removed) removedFromLaneIdsRef.current.add(id);
    }, [column.removedFromLaneIds]);

    useEffect(() => {
      const parentIds = new Set(column.candidates.map((c) => c._id));
      // If the server has reintroduced an id into this lane, allow it to render again.
      removedFromLaneIdsRef.current.forEach((id) => {
        if (parentIds.has(id)) removedFromLaneIdsRef.current.delete(id);
      });
    }, [column.candidates]);
    const isInitialMountRef = useRef(true);
    const processingPageRef = useRef<number | null>(null);
    // Store requested page in ref to prevent query cancellation when state updates
    const requestedPageRef = useRef<number | null>(null);
    // Track if we're updating allCandidates to prevent ref sync race conditions
    const isUpdatingRef = useRef(false);
    // Store the last fetched pagination data to determine hasNextPage after sorting
    const lastPaginationDataRef = useRef<{
      hasNextPage?: boolean;
      totalPages?: number;
    } | null>(null);
    // When set to this column.id, the next page-1 fetch result should replace allCandidates (migration destination)
    const migrationResetPendingRef = useRef<string | null>(null);
    // Prevent triggering migration fetch more than once per reset signal
    const migrationFetchTriggeredRef = useRef<string | null>(null);
    // After full refetch we reset to page 1; ignore any nextPageData for page > 1 (stale from before reset)
    const ignoreStalePagesAfterResetRef = useRef(false);
    // Timestamp of last reset-to-page-1; merge effect ignores page>1 if within this window (ms)
    const resetToPage1AtRef = useRef<number>(0);
    const IGNORE_STALE_PAGE_MS = 800;
    // True after we reset to page 1; cleared when we intentionally request page 2+. Prevents merging cached page 2+ from before reset.
    const onlyPage1LoadedRef = useRef(false);
    // When set to column.id, we're waiting for page 1 API response from lane refetch (drag/drop). Merge effect will apply it.
    const laneRefetchPage1PendingRef = useRef<string | null>(null);
    // When set, we're refetching only this page (tags, remark, etc.); merge effect replaces only that slice.
    const currentPageRefetchPendingRef = useRef<number | null>(null);
    // After filter/sort change we reset to page 1; next column.candidates update should full-replace
    const justResetForFilterSortRef = useRef(false);
    const prevResetAllLanesKeyRef = useRef(resetAllLanesToPage1Key ?? 0);

    // When filter/sort is applied or cleared (parent bumps resetAllLanesToPage1Key), reset to page 1
    useEffect(() => {
      const key = resetAllLanesToPage1Key ?? 0;
      if (key === 0 || key === prevResetAllLanesKeyRef.current) return;
      prevResetAllLanesKeyRef.current = key;
      justResetForFilterSortRef.current = true;
      loadedPagesRef.current.clear();
      loadedPagesRef.current.add(1);
      setCurrentPage(1);
      setRequestedPage(null);
      requestedPageRef.current = null;
      loadingRef.current = false;
      setIsLoadingMore(false);
      processingPageRef.current = null;
      onlyPage1LoadedRef.current = true;
      ignoreStalePagesAfterResetRef.current = true;
      resetToPage1AtRef.current = Date.now();
      setTimeout(() => {
        ignoreStalePagesAfterResetRef.current = false;
      }, IGNORE_STALE_PAGE_MS);
      // Keep previousColumnCandidatesRef as-is so first effect detects when NEW data arrives (different IDs)
      previousFiltersRef.current = (column.filters || []).join('|');
      previousSortingRef.current = column.sorting
        ? `${column.sorting.sortBy}|${column.sorting.sortOrder}`
        : '';
      setAllCandidates(column.candidates);
    }, [
      resetAllLanesToPage1Key,
      column.candidates,
      column.filters,
      column.sorting,
    ]);






    // Update allCandidates when column.candidates changes (from initial load, SSE, or drag operations)
    // CRITICAL: Must handle additions, removals, AND updates to keep data fresh
    // Skip on initial mount since we initialize with column.candidates
    useEffect(() => {
      // 0. Honor explicit removedFromLaneIds from same-client drag, even when parent slice size didn't change
      const explicitRemoved = column.removedFromLaneIds ?? [];
      if (explicitRemoved.length > 0) {
        const removedSet = new Set(explicitRemoved);
        // Always filter and short-circuit: removedFromLaneIds is authoritative for this operation.
        // This prevents stale merge logic (especially when user is on the last loaded page)
        // from re-introducing moved candidates back into the source lane cache.
        setAllCandidates((prev) => prev.filter((c) => !removedSet.has(c._id)));
        return;
      }

      const loadedPagesCount = loadedPagesRef.current.size;
      const parentHasFewer = allCandidates.length > column.candidates.length;

      // When we have page 2+ loaded and parent has fewer candidates, either:
      // (1) Parent only has page 1 — skip full replace to avoid losing page 2+.
      // (2) Parent shrank due to move (bulk or single) — remove only the moved-out ids so we don't show duplicates.
      if (loadedPagesCount > 1 && parentHasFewer) {
        // Explicit moved-out ids from same-client bulk/single drag (set in useCandidate).
        const removedFromLaneIds = column.removedFromLaneIds ?? [];
        if (removedFromLaneIds.length > 0) {
          const removedSet = new Set(removedFromLaneIds);
          const hasAnyToRemove = allCandidates.some((c) => removedSet.has(c._id));
          if (hasAnyToRemove) {
            setAllCandidates((prev) =>
              prev.filter((c) => !removedSet.has(c._id)),
            );
            previousColumnCandidatesRef.current = column.candidates
              .map((c) => c._id)
              .sort()
              .join(',');
            return;
          }
        }

        const parentIds = new Set(column.candidates.map((c) => c._id));
        const prevIds = new Set(allCandidates.map((c) => c._id));
        const idsOnlyInPrev = allCandidates
          .filter((c) => !parentIds.has(c._id))
          .map((c) => c._id);
        const parentIsSubsetOfPrev = column.candidates.every((c) =>
          prevIds.has(c._id),
        );

        if (parentIsSubsetOfPrev && idsOnlyInPrev.length > 0) {
          // Shrink is due to removals (e.g. bulk drag): remove only those ids; keep page 2+ that still belong here.
          setAllCandidates((prev) =>
            prev.filter((c) => !idsOnlyInPrev.includes(c._id)),
          );
          previousColumnCandidatesRef.current = column.candidates
            .map((c) => c._id)
            .sort()
            .join(',');
          return;
        }

        logger.info('[ClientB_Lane] sync effect skip: have more loaded than parent', {
          lane: column.id,
          loadedPagesCount,
          allCandidatesLength: allCandidates.length,
          columnCandidatesLength: column.candidates.length,
        });
        return;
      }

      // After filter/sort reset: only full-replace when refetch has arrived (IDs changed)
      if (justResetForFilterSortRef.current) {
        const currentIds = column.candidates
          .map((c) => c._id)
          .sort()
          .join(',');
        if (currentIds === previousColumnCandidatesRef.current) return; // Still old data
        previousColumnCandidatesRef.current = currentIds;
        setAllCandidates(column.candidates);
        justResetForFilterSortRef.current = false;
        return;
      }
      // Skip on initial mount unless we have no candidates (parent may have loaded after we mounted)
      if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
        if (allCandidates.length === 0 && column.candidates.length > 0) {
          setAllCandidates(column.candidates);
        }
        return;
      }

      const currentIds = column.candidates
        .map((c) => c._id)
        .sort()
        .join(',');
      const idsChangedHere = currentIds !== previousColumnCandidatesRef.current;

      // Check if data changed even when IDs are the same (e.g., evaluation, SSE detail updates)
      const dataChanged =
        !idsChangedHere &&
        column.candidates.length > 0 &&
        column.candidates.some((newCandidate) => {
          const oldCandidate = allCandidates.find(
            (c) => c._id === newCandidate._id,
          );
          if (!oldCandidate) return false;
          return (
            JSON.stringify(oldCandidate.scores) !==
            JSON.stringify(newCandidate.scores) ||
            oldCandidate.name !== newCandidate.name ||
            oldCandidate.email !== newCandidate.email ||
            (oldCandidate.contact ?? '') !== (newCandidate.contact ?? '') ||
            (oldCandidate.location ?? '') !== (newCandidate.location ?? '') ||
            JSON.stringify(oldCandidate.followUp) !==
            JSON.stringify(newCandidate.followUp) ||
            (Array.isArray(oldCandidate.remarks)
              ? oldCandidate.remarks.length
              : 0) !==
            (Array.isArray(newCandidate.remarks)
              ? newCandidate.remarks.length
              : 0) ||
            (oldCandidate.remarksCount ?? 0) !==
            (newCandidate.remarksCount ?? 0) ||
            (Array.isArray(oldCandidate.tags)
              ? oldCandidate.tags.length
              : 0) !==
            (Array.isArray(newCandidate.tags)
              ? newCandidate.tags.length
              : 0) ||
            JSON.stringify(oldCandidate.assignment) !==
            JSON.stringify(newCandidate.assignment)
          );
        });

      // Update if IDs changed OR data changed
      if (idsChangedHere || dataChanged) {


        // Mark that we're updating to prevent ref sync from interfering
        isUpdatingRef.current = true;

        if (dataChanged) {

          // Update candidates with fresh data
          setAllCandidates((prev) => {
            const freshMap = new Map(column.candidates.map((c) => [c._id, c]));
            return prev.map(
              (candidate) => freshMap.get(candidate._id) || candidate,
            );
          });
          // Update ref after state update
          if (idsChangedHere) {
            previousColumnCandidatesRef.current = currentIds;
          }
          return; // Exit early, don't process further
        }

        setAllCandidates((prev) => {
          const parentCandidateIds = new Set(
            column.candidates.map((c) => c._id),
          );
          const prevCandidateIds = new Set(prev.map((c) => c._id));
          const removedFromLaneSet = new Set(
            column.removedFromLaneIds ?? [],
          );

          // Don't wipe to page 1 when we have more loaded (e.g. 6 from parent, 11 in prev after SSE + page 2).
          // Only remove movers and merge fresh data; preserve page 2+.
          if (
            prev.length > column.candidates.length &&
            column.candidates.every((c) => prevCandidateIds.has(c._id))
          ) {
            const rawMovedOut = prev
              .filter(
                (c) =>
                  removedFromLaneSet.has(c._id) &&
                  !parentCandidateIds.has(c._id),
              )
              .map((c) => c._id);
            // Cap removals: if multiple match, assume single SSE move => 1
            const cap =
              rawMovedOut.length > 1 ? 1 : rawMovedOut.length;
            const movedOutIds = new Set(rawMovedOut.slice(0, cap));
            const afterRemoval =
              movedOutIds.size > 0
                ? prev.filter((c) => !movedOutIds.has(c._id))
                : prev;
            const freshMapSubset = new Map(
              column.candidates.map((c) => [c._id, c]),
            );
            const updated = afterRemoval.map(
              (c) => freshMapSubset.get(c._id) ?? c,
            );
            const newFromParentSubset = column.candidates.filter(
              (c) => !prevCandidateIds.has(c._id),
            );
            return [...updated, ...newFromParentSubset];
          }

          // Only remove candidates that actually moved OUT of this column: in prev, not in parent.
          const rawMovedOutIds = prev
            .filter(
              (c) =>
                removedFromLaneSet.has(c._id) &&
                !parentCandidateIds.has(c._id),
            )
            .map((c) => c._id);
          const deltaCap = rawMovedOutIds.length > 1 ? 1 : rawMovedOutIds.length;
          const movedOutOfThisColumnIds = new Set(
            rawMovedOutIds.slice(0, deltaCap),
          );
          const candidatesAfterLaneRemoval =
            movedOutOfThisColumnIds.size > 0
              ? prev.filter((c) => !movedOutOfThisColumnIds.has(c._id))
              : prev;

          // Check if candidates were removed (drag operation or page 1 update)
          // This happens when a candidate ID exists in prev but not in column.candidates
          // Use candidatesAfterLaneRemoval (already filtered by removedFromLaneIds) as the base
          const prevAfterRemovalIds = new Set(candidatesAfterLaneRemoval.map((c) => c._id));
          const removedCandidateIds = Array.from(prevAfterRemovalIds).filter(
            (id) => !parentCandidateIds.has(id),
          );

          if (removedCandidateIds.length > 0) {
            const freshMap = new Map(column.candidates.map((c) => [c._id, c]));
            const newFromParent = column.candidates.filter(
              (c) => !prevCandidateIds.has(c._id),
            );

            // SSE move-out: we removed only actual movers (movedOutOfThisColumnIds). Keep page 2+; merge with parent.
            if (movedOutOfThisColumnIds.size > 0) {
              const updated = candidatesAfterLaneRemoval.map(
                (c) => freshMap.get(c._id) ?? c,
              );
              return [...updated, ...newFromParent];
            }

            // No SSE move: use parent vs prev to decide kept (drag or full refetch)
            const kept = candidatesAfterLaneRemoval
              .filter(
                (c) =>
                  (parentCandidateIds.has(c._id) ||
                    !removedCandidateIds.includes(c._id)) &&
                  !movedOutOfThisColumnIds.has(c._id),
              )
              .map((c) => freshMap.get(c._id) ?? c);

            // Small delta (1–2): drag-out or page 1 update
            const removedCount = removedCandidateIds.length;
            if (removedCount <= 2) {
              const result = [...kept, ...newFromParent].filter(
                (c) => !movedOutOfThisColumnIds.has(c._id),
              );
              const prevIds = new Set(prev.map((c) => c._id));
              const resultIds = new Set(result.map((c) => c._id));
              const idsChanged = prevIds.size !== resultIds.size ||
                result.some((c) => !prevIds.has(c._id)) ||
                prev.some((c) => !resultIds.has(c._id));
              if (idsChanged || result.length !== prev.length) {
                return result;
              }
              return [...result];
            }

            // Large delta: parent likely sent only page 1; we have page 2+ in prev — merge and overlay
            const overlapWithParent = column.candidates.filter((c) =>
              prevCandidateIds.has(c._id),
            ).length;
            const isParentSubset =
              column.candidates.length > 0 &&
              overlapWithParent === column.candidates.length;

            if (isParentSubset) {
              const totalCount = column.count ?? 0;
              const parentIsPage1Only =
                totalCount > column.candidates.length &&
                prev.length > column.candidates.length;
              if (parentIsPage1Only) {
                // Remove only candidates that left this lane (SSE move). Keep page 2+ that still belong here.
                const keptAfterRemoval = movedOutOfThisColumnIds.size > 0
                  ? prev.filter((c) => !movedOutOfThisColumnIds.has(c._id))
                  : prev;
                return keptAfterRemoval.map((c) => freshMap.get(c._id) ?? c);
              }
              return prev
                .filter((c) => freshMap.has(c._id))
                .map((c) => freshMap.get(c._id) ?? c);
            }

            return [...kept, ...newFromParent];
          }

          // CRITICAL: If we had movers (movedOutOfThisColumnIds), remove only those and merge with parent.
          if (movedOutOfThisColumnIds.size > 0) {
            const candidatesStillInLane = prev.filter(
              (c) => !movedOutOfThisColumnIds.has(c._id),
            );
            if (candidatesStillInLane.length < prev.length) {
              const freshMapInner = new Map(
                column.candidates.map((c) => [c._id, c]),
              );
              const updated = candidatesStillInLane.map(
                (c) => freshMapInner.get(c._id) ?? c,
              );
              const newFromParentInner = column.candidates.filter(
                (c) => !prevCandidateIds.has(c._id),
              );
              return [...updated, ...newFromParentInner];
            }
          }

          // Detect if this is a full refetch (column.candidates has only page 1 but we had page 2+ before)
          // This happens when RTK Query refetches and returns only page 1
          // Also detect lane migrations (completely different set of candidates)
          const prevIdSet = new Set(prev.map((c) => c._id));
          const newIds = new Set(column.candidates.map((c) => c._id));
          const overlapCount = column.candidates.filter((c) =>
            prevIdSet.has(c._id),
          ).length;

          // Detect new candidates added (IDs that exist in new data but not in prev)
          const newCandidateIds = Array.from(newIds).filter(
            (id) => !prevIdSet.has(id),
          );
          const hasNewCandidates = newCandidateIds.length > 0;

          // Migration detection: Any size lane with 0 overlap OR empty lane getting new candidates
          const isLaneMigration =
            (prev.length > 0 &&
              column.candidates.length > 0 &&
              overlapCount === 0) || // No overlap = migration
            (prev.length === 0 && column.candidates.length > 0); // Empty lane receiving candidates

          // Full refetch: parent sent only page 1 and we had page 2+ (no subset-merge case)
          const isFullRefetch =
            column.candidates.length > 0 &&
            prev.length > column.candidates.length &&
            column.candidates.filter((c) => prevIdSet.has(c._id)).length <
            column.candidates.length;

          // If new candidates added (e.g. SSE move into this lane), reset to page 1 and show full list so moved candidate is visible
          if (hasNewCandidates && !isLaneMigration) {
            // Client B: already have page 2+ loaded (e.g. we merged 11); do NOT overwrite or clear loadedPagesRef
            if (prev.length > column.candidates.length) {
              logger.info('[ClientB_Lane] hasNewCandidates skip: already have more loaded', {
                lane: column.id,
                prevLength: prev.length,
                columnLength: column.candidates.length,
              });
              return prev;
            }
            // Reset to page 1 - moved candidate is shown as "overflow" on page 1
            // Don't mark page 2 as loaded even if we have 6 items; let normal pagination fetch page 2
            setCurrentPage(1);
            loadedPagesRef.current.clear();
            loadedPagesRef.current.add(1);
            setRequestedPage(null);
            requestedPageRef.current = null;

            // Clear any stale processing state that might cause page skipping
            processingPageRef.current = null;

            // Set flag to ignore stale cached pages, but clear it quickly so intentional page 2 requests work
            onlyPage1LoadedRef.current = true;
            ignoreStalePagesAfterResetRef.current = true;
            resetToPage1AtRef.current = Date.now();
            setTimeout(() => {
              ignoreStalePagesAfterResetRef.current = false;
              // Clear onlyPage1LoadedRef after a short delay so intentional page 2+ requests can proceed
              // This prevents stale cached pages from being processed, but allows fresh requests
            }, 200); // Shorter window than full refetch (200ms vs 800ms) since SSE updates are immediate

            // CRITICAL: Return column.candidates which should include movedIntoLane candidates from SSE
            // This ensures the moved candidate appears in the UI
            return column.candidates;
          }

          // Fallback: If column.candidates has more items than prev but hasNewCandidates didn't trigger,
          // it might be because the candidate was already in prev from a previous state.
          // In this case, ensure we show column.candidates (which has the correct merged state)
          if (
            !hasNewCandidates &&
            !isLaneMigration &&
            !isFullRefetch &&
            column.candidates.length > prev.length &&
            column.candidates.length > 0
          ) {

            // Use column.candidates which includes the moved candidate from movedIntoLane
            return column.candidates;
          }

          if (isFullRefetch || isLaneMigration) {
            // When parent has partial data (count > candidates), never shrink: might be racing with
            // merge effect (we have stale prev=6 but merge just set 11). Keep page 2+ and merge column in.
            const totalCountForLane = column.count ?? 0;
            if (
              totalCountForLane > column.candidates.length &&
              prev.length > column.candidates.length
            ) {
              const freshMap = new Map(column.candidates.map((c) => [c._id, c]));
              const updated = prev.map((c) => freshMap.get(c._id) ?? c);
              const newFromColumn = column.candidates.filter(
                (c) => !prev.some((p) => p._id === c._id),
              );
              return [...updated, ...newFromColumn];
            }

            // Mark page 2+ as "not loaded"
            loadedPagesRef.current.clear();
            loadedPagesRef.current.add(1);
            setCurrentPage(1);
            setRequestedPage(null);
            requestedPageRef.current = null;
            loadingRef.current = false;
            onlyPage1LoadedRef.current = true;
            // Ignore any nextPageData for page > 1 and avoid triggering fetch with old requestedPage (stale from before reset)
            ignoreStalePagesAfterResetRef.current = true;
            resetToPage1AtRef.current = Date.now();
            setTimeout(() => {
              ignoreStalePagesAfterResetRef.current = false;
            }, IGNORE_STALE_PAGE_MS);

            // Always reset to page 1 and show only fresh page 1 data.
            // Previously we kept page 2+ and did not reset currentPage, so the list stayed
            // scrolled to e.g. page 4 and showed stale candidates (old page 4 slice).
            // Now we show only page 1; user can scroll to load more.
            return column.candidates;
          }

          // Create a map for quick lookup of fresh candidate data
          const freshCandidatesMap = new Map(
            column.candidates.map((c) => [c._id, c]),
          );

          // Update existing candidates with fresh data, preserve pagination
          const updated = prev.map((candidate) => {
            const freshData = freshCandidatesMap.get(candidate._id);
            if (freshData) {
              // This candidate exists in both - update with fresh data
              return { ...candidate, ...freshData };
            }
            // Candidate only in prev (page 2+) - keep it
            return candidate;
          });

          // Add any completely new candidates (SSE additions)
          const existingIds = new Set(prev.map((c) => c._id));
          const newCandidates = column.candidates.filter(
            (c) => !existingIds.has(c._id),
          );

          if (newCandidates.length > 0) {
            // Add new candidates at the end
            return [...updated, ...newCandidates];
          }

          // Check if any data actually changed
          const hasChanges = updated.some((c, i) => c !== prev[i]);
          if (!hasChanges) {
            return prev; // Return same reference to prevent re-render
          }

          return updated;
        });

        // Clear updating flag after state update completes
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
      }
    }, [column.candidates, column.count, column.removedFromLaneIds, currentPage]);

    // Sync previousColumnCandidatesRef with actual allCandidates state after updates
    // Use isUpdatingRef to prevent race conditions during updates
    useEffect(() => {
      // Don't update ref if we're currently updating (prevents race condition)
      if (isUpdatingRef.current) return;

      const currentIds = allCandidates
        .map((c) => c._id)
        .sort()
        .join(',');
      if (currentIds !== previousColumnCandidatesRef.current) {
        previousColumnCandidatesRef.current = currentIds;
      }
    }, [allCandidates]);



    // Reset lane data when API filter or sorting changes (API-only source of truth)
    useEffect(() => {
      const currentFiltersSig = (column.filters || []).join('|');
      const currentSortingSig = column.sorting
        ? `${column.sorting.sortBy}|${column.sorting.sortOrder}`
        : '';

      const filtersChanged = currentFiltersSig !== previousFiltersRef.current;
      const sortingChanged = currentSortingSig !== previousSortingRef.current;

      if (!filtersChanged && !sortingChanged) return;

      previousFiltersRef.current = currentFiltersSig;
      previousSortingRef.current = currentSortingSig;

      // Reset pagination and load first page from API response
      loadedPagesRef.current.clear();
      loadedPagesRef.current.add(1);
      setCurrentPage(1);
      setRequestedPage(null);
      requestedPageRef.current = null;
      loadingRef.current = false;
      setIsLoadingMore(false);
      processingPageRef.current = null;
      onlyPage1LoadedRef.current = true;

      setAllCandidates(column.candidates);
    }, [column.filters, column.sorting, column.candidates]);

    // Use lazy query for manual control - prevents RTK Query from auto-canceling
    // Lazy queries give us full control over when to trigger, avoiding cancellation issues
    const [triggerFetch, { data: nextPageData, isLoading: isFetching }] =
      useLazyFetchLaneCandidatesQuery();

    // Cursor for cursor-based pagination under SSE moves.
    // We keep the current page-based UI state machine, but for page 2+ we pass `cursor`
    // so backend can page stably (no gaps/overlaps) while still echoing `pagination.page`.
    const nextCursorRef = useRef<string | null>(null);
    const encodeCursorPayload = useCallback(
      (payload: {
        sortBy: string;
        sortOrder: 'asc' | 'desc';
        sortValue: unknown;
        id: string;
      }) => {
        const json = JSON.stringify({
          sortBy: payload.sortBy,
          sortOrder: payload.sortOrder,
          sortValue:
            typeof payload.sortValue === 'number'
              ? payload.sortValue
              : String(payload.sortValue ?? ''),
          id: payload.id,
        });
        const base64 = btoa(unescape(encodeURIComponent(json)));
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      },
      [],
    );
    const getNestedValue = useCallback((obj: unknown, path: string): unknown => {
      if (!obj || typeof obj !== 'object') return undefined;
      const parts = path.split('.');
      let cur: unknown = obj;
      for (const p of parts) {
        if (!cur || typeof cur !== 'object') return undefined;
        cur = (cur as Record<string, unknown>)[p];
      }
      return cur;
    }, []);

    // Initialize cursor from the current page-1 boundary.
    // If SSE appended movedIntoLane (5+1=6), use the 5th item (index 4) as cursor boundary.
    useEffect(() => {
      const limit = LANE_PAGE_SIZE;
      if (!column.candidates?.length) return;
      if (loadedPagesRef.current.size !== 1) return;
      if (nextCursorRef.current) return;
      const boundaryIdx = Math.min(limit, column.candidates.length) - 1;
      if (boundaryIdx < 0) return;
      const boundary = column.candidates[boundaryIdx];
      if (!boundary?._id) return;
      nextCursorRef.current = encodeCursorPayload({
        sortBy,
        sortOrder,
        sortValue: getNestedValue(boundary, sortBy),
        id: boundary._id,
      });
    }, [column.candidates, sortBy, sortOrder, encodeCursorPayload, getNestedValue]);

    // When a candidate moves OUT of this lane via SSE, page 1 can temporarily shrink (5 -> 4).
    // If we then paginate with backend page semantics (skip=(page-1)*limit), we can end up with a permanent gap
    // (e.g., load 14/15 and can't fetch a "page 4" because totalPages is still 3).
    // Fix (without offset params): if this lane only has page 1 loaded and a SSE move-out made page 1 < limit,
    // refetch page 1 once so backend returns the correct first 5 items.
    const autoFillPage1AfterSseMoveOutRef = useRef<string | null>(null);
    useEffect(() => {
      const limit = LANE_PAGE_SIZE;
      const removedIds = column.removedFromLaneIds ?? [];
      const page1Count = column.candidates.length;
      const onlyPage1Loaded = loadedPagesRef.current.size === 1;
      if (!jobId) return;
      if (!onlyPage1Loaded) return;
      if (removedIds.length === 0) return;
      if (!(page1Count > 0 && page1Count < limit)) return;
      // Signature prevents repeated refetches for the same state.
      const sig = `${column.id}:${page1Count}:${removedIds.join(',')}`;
      if (autoFillPage1AfterSseMoveOutRef.current === sig) return;
      autoFillPage1AfterSseMoveOutRef.current = sig;

      laneRefetchPage1PendingRef.current = column.id;
      ignoreStalePagesAfterResetRef.current = true;
      resetToPage1AtRef.current = Date.now();
      onlyPage1LoadedRef.current = true;
      loadingRef.current = true;
      setIsLoadingMore(true);
      triggerFetch({
        jobId: jobId || '',
        laneName: column.id,
        page: 1,
        limit,
        filter: laneFilter,
        sortBy,
        sortOrder,
        laneSort: laneSortParam,
      });
    }, [
      jobId,
      column.id,
      column.candidates.length,
      column.removedFromLaneIds,
      triggerFetch,
      laneFilter,
      sortBy,
      sortOrder,
    ]);

    // Get hasNextPage from pagination metadata (from last fetched page)
    // Falls back to column.hasMore if pagination data not available yet
    // Also check lastPaginationDataRef for cases after sorting
    // CRITICAL: Also check if count > loaded candidates to ensure pagination works after SSE updates
    // Priority: pagination totalPages check > count-based check > fresh pagination metadata > stale pagination metadata > column.hasMore
    const totalCount = column.count ?? 0;

    // Page size used by lane pagination API. Keep this consistent with triggerFetch(limit: LANE_PAGE_SIZE).
    // Note: page 1 may temporarily show > limit due to SSE "movedIntoLane" overlay.
    const pageSize =
      nextPageData?.pagination?.limit ??
      LANE_PAGE_SIZE;

    // Get pagination metadata (prefer fresh, fallback to stale)
    const paginationHasNextPage =
      nextPageData?.pagination?.hasNextPage ??
      lastPaginationDataRef.current?.hasNextPage;
    const paginationTotalPages =
      nextPageData?.pagination?.totalPages ??
      lastPaginationDataRef.current?.totalPages;

    // Calculate current page based on loaded pages
    const loadedPagesArray = Array.from(loadedPagesRef.current);
    const maxLoadedPage = loadedPagesArray.length > 0 ? Math.max(...loadedPagesArray) : 0;
    const currentPageFromLoaded = maxLoadedPage || currentPage;

    // IMPORTANT: Use API-loaded estimate for pagination gating (not `allCandidates.length`).
    // `allCandidates` can include SSE-only overlay items on page 1 (5+1 => 6), but the backend still paginates by `limit`.
    // If we use the UI length, we can incorrectly decide "no more pages" and never request page 2+.
    const apiLoadedCountEstimate =
      Math.max(0, currentPageFromLoaded) * pageSize;
    const loadedCandidateCountForPagination = Math.min(
      allCandidates.length,
      apiLoadedCountEstimate,
    );

    // CRITICAL: Check if we've already loaded all available pages from API
    // If totalPages is known and we've loaded all pages, don't request more
    const hasLoadedAllPages =
      paginationTotalPages !== undefined &&
      currentPageFromLoaded >= paginationTotalPages;

    // Count-based check: only if we haven't loaded all API pages
    const hasMoreBasedOnCount =
      !hasLoadedAllPages && totalCount > loadedCandidateCountForPagination;

    // CRITICAL: After SSE, count can exceed what API totalPages suggested (e.g. 11 loaded, count 15).
    // Prefer count-based more: if column.count > loaded, allow load more even when API said all pages loaded.
    const hasMoreByCountOnly = totalCount > loadedCandidateCountForPagination;
    const hasNextPage =
      hasMoreByCountOnly || // Count says more exist (SSE may have added; don't trust stale totalPages)
      (!hasLoadedAllPages &&
        (hasMoreBasedOnCount ||
          (paginationHasNextPage ?? column.hasMore ?? false)));

    // Handler for "load next page" — used by Virtuoso endReached (scroll)
    const handleLoadMore = useCallback(() => {
      // When filters are active, do not auto-load more per-lane data.
      // The grouped candidates API already returns lane data with the current filter,
      // and additional per-lane page-1 calls on filter change are wasteful.
      const filtersActive = hasActiveFilter(
        viewState?.filter as JobViewFilter | undefined | null,
      );
      if (filtersActive) {
        logger.info('[ClientB_Lane] handleLoadMore bail: filters active', {
          lane: column.id,
        });
        return;
      }
      const loadedPages = Array.from(loadedPagesRef.current);
      const nextPageToLoad =
        loadedPages.length > 0 ? Math.max(...loadedPages) + 1 : 1;
      const laneTotal = column.count ?? 0;
      const loaded = allCandidates.length;

      logger.info('[ClientB_Lane] handleLoadMore called', {
        lane: column.id,
        nextPageToLoad,
        laneTotal,
        loaded,
        loadedPages,
      });

      // IMPORTANT: after SSE moves, page 1 can temporarily show 5 + N(SSE) items.
      // Do not bail based on `count <= loaded` here; it can incorrectly block page 2+.
      // We rely on `hasNextPage` which is computed using API-loaded estimate + hasMore metadata.
      if (!hasNextPage) {
        logger.info('[ClientB_Lane] handleLoadMore bail: hasNextPage false', {
          lane: column.id,
          laneTotal,
          loaded,
        });
        return;
      }
      const totalPages =
        nextPageData?.pagination?.totalPages ??
        lastPaginationDataRef.current?.totalPages;
      if (totalPages !== undefined && nextPageToLoad > totalPages) {
        logger.info('[ClientB_Lane] handleLoadMore bail: nextPageToLoad > totalPages', {
          lane: column.id,
          nextPageToLoad,
          totalPages,
          laneTotal,
          loaded,
        });
        return;
      }
      const alreadyHavePage = loadedPagesRef.current.has(nextPageToLoad);
      if (
        isLoadingMore ||
        loadingRef.current ||
        alreadyHavePage ||
        processingPageRef.current === nextPageToLoad ||
        requestedPage !== null ||
        !jobId
      ) {
        logger.info('[ClientB_Lane] handleLoadMore bail: busy or already requested', {
          lane: column.id,
          isLoadingMore,
          loadingRef: loadingRef.current,
          hasNextPageAlready: alreadyHavePage,
          processingPage: processingPageRef.current,
          requestedPage,
          jobId: jobId ?? null,
        });
        return;
      }
      logger.info('[ClientB_Lane] handleLoadMore setRequestedPage', {
        lane: column.id,
        nextPageToLoad,
      });
      setRequestedPage(nextPageToLoad);
    }, [
      hasNextPage,
      column.count,
      allCandidates.length,
      isLoadingMore,
      requestedPage,
      jobId,
      nextPageData?.pagination?.totalPages,
    ]);

    // Trigger fetch when requestedPage changes and conditions are met
    useEffect(() => {
      // Do not trigger page 1 (or null) when we just reset; allow page 2+ so "Load more" button works after SSE
      if (
        ignoreStalePagesAfterResetRef.current &&
        (requestedPage === null || requestedPage <= 1)
      ) {
        logger.info('[ClientB_Lane] trigger effect skip: ignoreStalePagesAfterReset', {
          lane: column.id,
          requestedPage,
        });
        return;
      }
      // Only fetch if:
      // 1. hasNextPage is true (from pagination metadata or column.hasMore)
      // 2. We have a requested page (user scrolled to bottom)
      // 3. That page hasn't been loaded yet
      // 4. We're not currently loading or processing

      const hasPage = requestedPage !== null;
      const notLoaded = hasPage && !loadedPagesRef.current.has(requestedPage!);
      const notLoading = !loadingRef.current;
      const notProcessing =
        !hasPage || processingPageRef.current !== requestedPage;
      const hasJob = !!jobId;

      // Use notLoaded (not pageGtCurrent): after merging page 2 we set currentPage=2, so requesting page 2 again would wrongly fail. We only fetch when we don't have this page yet.
      const shouldFetch =
        hasNextPage &&
        hasPage &&
        notLoaded &&
        notLoading &&
        notProcessing &&
        hasJob;

      if (!shouldFetch && hasPage) {
        logger.info('[ClientB_Lane] trigger effect skip: shouldFetch false', {
          lane: column.id,
          requestedPage,
          hasNextPage,
          currentPage,
          notLoaded,
          notLoading,
          notProcessing,
          hasJob,
        });
      }

      if (shouldFetch) {
        if (requestedPage !== null && requestedPage > 1) {
          onlyPage1LoadedRef.current = false;
        }
        const limit = LANE_PAGE_SIZE;
        logger.info('[ClientB_Lane] trigger effect triggerFetch', {
          lane: column.id,
          requestedPage,
          jobId: jobId ?? '',
        });
        // Mark as loading immediately
        loadingRef.current = true;
        setIsLoadingMore(true);
        // Trigger the fetch with params - lazy query won't cancel on re-render
        triggerFetch({
          jobId: jobId || '',
          laneName: column.id,
          page: requestedPage!,
          limit,
          cursor: requestedPage! > 1 ? nextCursorRef.current ?? undefined : undefined,
          filter: laneFilter,
          sortBy,
          sortOrder,
          laneSort: laneSortParam,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      requestedPage,
      hasNextPage,
      column.id,
      currentPage,
      jobId,
      // triggerFetch is stable from RTK Query and doesn't need to be in deps
    ]);

    // When this lane is the migration destination, fetch page 1 from API so UI shows migrated candidates
    // (column.candidates from parent may still be stale when the flag is set)
    useEffect(() => {
      if (resetLaneToPage1Id !== column.id) {
        if (migrationFetchTriggeredRef.current === column.id)
          migrationFetchTriggeredRef.current = null;
        return;
      }
      if (!jobId) return;
      if (migrationFetchTriggeredRef.current === column.id) return; // Already triggered
      migrationFetchTriggeredRef.current = column.id;
      onlyPage1LoadedRef.current = true;

      setCurrentPage(1);
      loadedPagesRef.current.clear();
      loadedPagesRef.current.add(1);
      setRequestedPage(null);
      requestedPageRef.current = null;
      loadingRef.current = true;
      setIsLoadingMore(true);
      migrationResetPendingRef.current = column.id;
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
    ]);

    // Merge next page candidates when fetched
    useEffect(() => {
      if (!nextPageData?.candidates) {
        return;
      }

      const pageToLoad = nextPageData.pagination?.page ?? 1;

      logger.info('[ClientB_Lane] nextPageData received', {
        lane: column.id,
        pageToLoad,
        candidateCount: nextPageData.candidates.length,
      });

      // Ignore stale nextPageData for page 2+ that arrives right after we reset to page 1 (status change / full refetch)
      const withinResetWindow =
        Date.now() - resetToPage1AtRef.current < IGNORE_STALE_PAGE_MS;
      if (
        pageToLoad > 1 &&
        (ignoreStalePagesAfterResetRef.current || withinResetWindow)
      ) {
        logger.info('[ClientB_Lane] nextPageData skip: stale/reset window', {
          lane: column.id,
          pageToLoad,
          ignoreStale: ignoreStalePagesAfterResetRef.current,
          withinResetWindow,
        });
        ignoreStalePagesAfterResetRef.current = false;
        return;
      }
      // After reset we only have page 1; any page 2+ result we didn't request is from cache (before reset). Skip it.
      if (pageToLoad > 1 && onlyPage1LoadedRef.current) {
        logger.info('[ClientB_Lane] nextPageData skip: onlyPage1LoadedRef', {
          lane: column.id,
          pageToLoad,
        });
        loadingRef.current = false;
        setIsLoadingMore(false);
        setRequestedPage(null);
        requestedPageRef.current = null;
        return;
      }
      if (ignoreStalePagesAfterResetRef.current && pageToLoad === 1) {
        ignoreStalePagesAfterResetRef.current = false;
      }

      // Migration destination: replace allCandidates with fresh page 1 from API
      if (migrationResetPendingRef.current === column.id && pageToLoad === 1) {

        loadedPagesRef.current.clear();
        loadedPagesRef.current.add(1);
        processingPageRef.current = null;
        migrationResetPendingRef.current = null;
        migrationFetchTriggeredRef.current = null;
        onlyPage1LoadedRef.current = true;
        lastPaginationDataRef.current = nextPageData.pagination
          ? {
            hasNextPage: nextPageData.pagination.hasNextPage,
            totalPages: nextPageData.pagination.totalPages,
          }
          : null;
        previousColumnCandidatesRef.current = nextPageData.candidates
          .map((c) => c._id)
          .sort()
          .join(',');
        setAllCandidates(nextPageData.candidates);
        setCurrentPage(1);
        setRequestedPage(null);
        requestedPageRef.current = null;
        loadingRef.current = false;
        setIsLoadingMore(false);
        onResetLaneDone?.(column.id);
        return;
      }

      // Lane refetch (e.g. after drag): we explicitly requested page 1 for this lane; apply response as source of truth
      if (
        laneRefetchPage1PendingRef.current === column.id &&
        pageToLoad === 1
      ) {
        const count = nextPageData.candidates?.length ?? 0;
        logger.info('[ClientB_Lane] nextPageData received for lane refetch', {
          lane: column.id,
          pageToLoad,
          candidateCount: count,
        });
        loadedPagesRef.current.clear();
        loadedPagesRef.current.add(1);
        processingPageRef.current = null;
        laneRefetchPage1PendingRef.current = null;
        onlyPage1LoadedRef.current = true;
        lastPaginationDataRef.current = nextPageData.pagination
          ? {
            hasNextPage: nextPageData.pagination.hasNextPage,
            totalPages: nextPageData.pagination.totalPages,
          }
          : null;
        previousColumnCandidatesRef.current = (nextPageData.candidates ?? [])
          .map((c) => c._id)
          .sort()
          .join(',');
        setAllCandidates(nextPageData.candidates ?? []);
        setCurrentPage(1);
        setRequestedPage(null);
        requestedPageRef.current = null;
        loadingRef.current = false;
        setIsLoadingMore(false);
        onLaneRefetchDone?.(column.id);
        return;
      }

      // Refetch current page only (tags, remark, delete, edit, etc.): replace only that slice
      if (currentPageRefetchPendingRef.current === pageToLoad) {
        const limit = nextPageData.pagination?.limit ?? LANE_PAGE_SIZE;
        const start = (pageToLoad - 1) * limit;
        const end = pageToLoad * limit;
        setAllCandidates((prev) => [
          ...prev.slice(0, start),
          ...nextPageData.candidates,
          ...prev.slice(end),
        ]);
        currentPageRefetchPendingRef.current = null;
        loadingRef.current = false;
        setIsLoadingMore(false);
        if (nextPageData.pagination) {
          lastPaginationDataRef.current = {
            hasNextPage: nextPageData.pagination.hasNextPage,
            totalPages: nextPageData.pagination.totalPages,
          };
        }
        onLaneRefetchDone?.(column.id);
        return;
      }

      if (nextPageData.candidates.length === 0) {
        // If API returns an empty page, clear "loading/requested" flags so the lane doesn't get stuck.
        loadingRef.current = false;
        setIsLoadingMore(false);
        processingPageRef.current = null;
        setRequestedPage(null);
        requestedPageRef.current = null;
        if (nextPageData.pagination) {
          lastPaginationDataRef.current = {
            hasNextPage: nextPageData.pagination.hasNextPage,
            totalPages: nextPageData.pagination.totalPages,
          };
        }
        return;
      }

      // Only merge the immediate next page (e.g. page 2 when on page 1). Stale data can be page 5 when we're on page 1.
      // CRITICAL: Also check loadedPagesRef to ensure we're loading pages sequentially
      const loadedPagesArrayForMerge = Array.from(loadedPagesRef.current);
      const maxLoadedPageForMerge =
        loadedPagesArrayForMerge.length > 0
          ? Math.max(...loadedPagesArrayForMerge)
          : 0;
      const expectedNextPageForMerge = maxLoadedPageForMerge + 1;
      // CRITICAL: Use maxLoadedPageForMerge instead of currentPage to ensure sequential loading
      // This prevents skipping pages when currentPage state is stale
      if (pageToLoad !== expectedNextPageForMerge) {
        logger.info('[ClientB_Lane] nextPageData skip: page mismatch (stale)', {
          lane: column.id,
          pageToLoad,
          expectedNextPageForMerge,
        });
        return;
      }

      // Guard: Only process if we haven't loaded this page yet AND not currently processing
      if (
        loadedPagesRef.current.has(pageToLoad) ||
        processingPageRef.current === pageToLoad
      ) {
        logger.info('[ClientB_Lane] nextPageData skip: already loaded or processing', {
          lane: column.id,
          pageToLoad,
        });
        return; // Already processed or currently processing
      }

      // Mark as processing immediately to prevent duplicate processing
      processingPageRef.current = pageToLoad;
      loadedPagesRef.current.add(pageToLoad);

      logger.info('[ClientB_Lane] nextPageData merging into allCandidates', {
        lane: column.id,
        pageToLoad,
        newCandidatesCount: nextPageData.candidates.length,
      });

      // Use functional updates to prevent stale closures
      setAllCandidates((prev) => {
        const existingIds = new Set(prev.map((c) => c._id));
        const freshCandidateIds = new Set(
          nextPageData.candidates.map((c) => c._id),
        );

        // Check for overlap - some fresh candidates might already exist (stale data)
        const hasOverlap = nextPageData.candidates.some((c) =>
          existingIds.has(c._id),
        );

        if (hasOverlap) {
          // Replace overlapping candidates with fresh data
          // NOTE: We already validated `pageToLoad === expectedNextPageForMerge` before this effect runs.
          // Do NOT re-validate using loadedPagesRef here: loadedPagesRef already includes `pageToLoad`
          // (we add it before setAllCandidates), so any "expected next page" computed from it will be
          // `pageToLoad + 1` and will incorrectly roll back page accounting, causing repeated fetches.

          // Remove old candidates that are in the fresh data
          const withoutStale = prev.filter(
            (c) => !freshCandidateIds.has(c._id),
          );
          // Add all fresh candidates
          return [...withoutStale, ...nextPageData.candidates];
        }

        // No overlap - just append new candidates
        const newCandidates = nextPageData.candidates.filter(
          (c) => !existingIds.has(c._id),
        );

        // Only update if there are new candidates
        if (newCandidates.length === 0) {
          processingPageRef.current = null;
          return prev; // Return same reference
        }

        return [...prev, ...newCandidates];
      });

      // Clear processing flag and update state
      processingPageRef.current = null;
      setCurrentPage((prev) => (prev < pageToLoad ? pageToLoad : prev));
      // Clear requestedPage and ref AFTER updating currentPage
      setRequestedPage(null);
      requestedPageRef.current = null;
      loadingRef.current = false;
      setIsLoadingMore(false);

      // Update last pagination data ref
      if (nextPageData.pagination) {
        lastPaginationDataRef.current = {
          hasNextPage: nextPageData.pagination.hasNextPage,
        };
      }
      // Update cursor for the next page (cursor pagination mode)
      if (nextPageData.pageInfo?.nextCursor) {
        nextCursorRef.current = nextPageData.pageInfo.nextCursor;
      }
    }, [nextPageData]); // Only depend on nextPageData

    // Handle loading state - only update when fetching state changes
    useEffect(() => {
      if (isFetching) {
        setIsLoadingMore(true);
        loadingRef.current = true;
      }
    }, [isFetching]); // Only depend on isFetching to prevent loops

    // Lane-specific refetch: status/drag = page 1 + reset; other actions = current page only (replace slice)
    useEffect(() => {
      if (!laneToRefetch || !jobId) return;

      const refetchRequests = Array.isArray(laneToRefetch)
        ? laneToRefetch
        : [laneToRefetch];
      const request = refetchRequests.find((req) => req.laneId === column.id);
      if (!request) return;

      const isCurrentPageOnly = request.refetchCurrentPageOnly === true;
      const pageToFetch = isCurrentPageOnly ? currentPage : 1;

      if (isCurrentPageOnly) {
        // Refetch only current page; merge effect will replace that slice
        currentPageRefetchPendingRef.current = pageToFetch;
        loadingRef.current = true;
        setIsLoadingMore(true);
        triggerFetch({
          jobId,
          laneName: column.id,
          page: pageToFetch,
          limit: LANE_PAGE_SIZE,
          filter: laneFilter,
          sortBy,
          sortOrder,
          laneSort: laneSortParam,
        });
        return;
      }

      // Status/drag: reset this lane to page 1 and refetch page 1
      ignoreStalePagesAfterResetRef.current = true;
      resetToPage1AtRef.current = Date.now();
      onlyPage1LoadedRef.current = true;
      laneRefetchPage1PendingRef.current = column.id;
      setTimeout(() => {
        ignoreStalePagesAfterResetRef.current = false;
      }, IGNORE_STALE_PAGE_MS);
      loadingRef.current = true;
      setIsLoadingMore(true);
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
      column.id,
      jobId,
      currentPage,
      triggerFetch,
      laneFilter,
      sortBy,
      sortOrder,
    ]);

    // --- 4. Create Memoized Context ---
    // Create onUpdate handler for CandidateCard mutations
    // This manually updates the allCandidates state (same logic as laneToRefetch)
    const handleCandidateUpdate = useCallback(
      (updatedCandidate: Candidate) => {
        // Update allCandidates state directly (same as laneToRefetch logic)
        setAllCandidates((prev) => {
          const candidateIdx = prev.findIndex(
            (c) => c._id === updatedCandidate._id,
          );

          if (candidateIdx !== -1) {
            // Candidate exists - update it
            const updated = [...prev];
            updated[candidateIdx] = {
              ...updated[candidateIdx],
              ...updatedCandidate,
            };

            return updated;
          }


          return prev;
        });
      },
      [column.id],
    );


    // Map frontend sort field names to backend API field names
    const mapSortFieldToApi = (field: string): string =>
      ({
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
      })[field] || field;

    // Process candidates - use API-sorted candidates as-is (no client-side sorting)
    // Candidates are already sorted by the API based on column.sorting
    const processedCandidates = useMemo(
      () => {
        const filtered = allCandidates.filter((candidate) => {
          // Filter out candidates removed from this lane due to optimistic moves.
          if (removedFromLaneIdsRef.current.has(candidate._id)) return false;
          // Lane API is already job-scoped. Keep candidates with missing jobId
          // so partial payloads (e.g. after lane rename) do not empty the lane UI.
          if (!jobId) return true;
          const candidateJobId = getJobId(candidate)?.toString();
          if (!candidateJobId) return true;
          return candidateJobId === jobId.toString();
        });
        // Defensive: avoid showing duplicate rows when local pagination/SSE merges
        // temporarily contain the same candidate twice.
        const seen = new Set<string>();
        return filtered.filter((c) => {
          if (seen.has(c._id)) return false;
          seen.add(c._id);
          return true;
        });
      },
      [allCandidates, jobId],
    );
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
          // Shift-range is lane-scoped: if existing selection is from another lane,
          // reset selection to the clicked candidate and start a new range anchor.
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
              const next = selectedCandidates.some(
                (c) => c._id === candidate._id,
              )
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
              // Same-lane only: do not merge in candidates from other lanes
              dispatch(setSelectedCandidates(mergedInLane));
              setShiftRangeAnchor(laneId, candidateIndex);
            }
          }
        } else {
          // Plain click selection is also lane-scoped:
          // selecting a card in another lane replaces prior lane selection.
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

    // This object bundles all the dynamic props needed by the list items
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
      }),
      [
        column.id,
        pendingMoves,
        refetch,
        handleCandidateUpdate,
        openRemarksFor,
        setOpenRemarksFor,
        setSelectedCandidate,
        handleDeleteClick,
        setIsDetailsOpen,
        onLaneRefetch,
        onLaneRefetchCurrentPage,
        onSelectCandidate,
        isShiftPressed,
        onValidateStatusChange,
        onDeferStatusToChecklist,
        onOpenChecklistAfterSave,
      ],
    );
    // Handle sort change: persist to localStorage and refetch this lane
    const handleSort = useCallback(
      async (field: string, direction: 'asc' | 'desc') => {


        try {
          const apiSortField = mapSortFieldToApi(field);
          const sortOrderNum = direction === 'asc' ? 1 : -1;

          setLaneSort?.(column.id, {
            sortBy: apiSortField,
            sortOrder: sortOrderNum,
          });

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

          if (laneData?.candidates) {
            loadedPagesRef.current.clear();
            loadedPagesRef.current.add(1);
            setCurrentPage(1);
            setRequestedPage(null);
            requestedPageRef.current = null;
            loadingRef.current = false;
            setIsLoadingMore(false);
            processingPageRef.current = null;
            setAllCandidates(laneData.candidates);
          }

        } catch (error) {
          toast({
            title: 'Error',
            description:
              error instanceof Error
                ? error.message
                : 'Failed to update sorting',
            variant: 'destructive',
          });
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
                                Incoming checklist:{' '}
                                {laneConfig.incomingChecklist.name}
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
                                Outgoing checklist:{' '}
                                {laneConfig.outgoingChecklist.name}
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
                      isOpen={
                        isLaneOptionsOpen && column.id === isLaneOpsOpenFor
                      }
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

                      {/* Footer: skeleton loading when fetching more pages */}
                      {(() => {
                        const shouldShowLoadingFooter = isLoadingMore;

                        laneFooterPropsRef.current = {
                          isLoadingMore,
                          shouldShowLoadingFooter,
                        };

                        return (
                          <LaneFooterContext.Provider value={laneFooterPropsRef}>
                            <CustomScrollbarLane
                              isDragging={isDragging}
                              className="h-full"
                              scrollerRef={scrollerRef}
                            >
                              {/* --- 5. Pass Context to Virtuoso --- */}
                              <Virtuoso
                                style={{ height: '100%', scrollbarWidth: 'none' }}
                                data={processedCandidates}
                                increaseViewportBy={{ bottom: 350, top: 350 }}
                                scrollerRef={(el) => {
                                  if (el) scrollerRef.current = el as HTMLDivElement;
                                }}
                                computeItemKey={(_index, candidate) => candidate._id}
                                itemContent={renderCandidateItem}
                                context={contextValue}
                                components={{
                                  Footer: LaneFooter,
                                }}
                                endReached={handleLoadMore}
                              />
                            </CustomScrollbarLane>
                          </LaneFooterContext.Provider>
                        );
                      })()}

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
export { KanbanColumn };
