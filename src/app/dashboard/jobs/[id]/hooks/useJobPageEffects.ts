import { useEffect, useRef, Dispatch, SetStateAction } from 'react';
import logger from '@/lib/logger';
import { Candidate, CandidateColumn, CandidateStatus } from '@/types/candidate';
import DndSyncLock from '@/lib/dndlock';
import type { JobViewState } from '../utils/jobViewStorage';
import {
  candidateMatchesJobViewFilter,
  hasActiveFilter,
} from '../utils/candidateViewFilter';
import {
  resolveLaneSortConfig,
  sortCandidatesForLane,
} from '../utils/candidateLaneSort';
import type { PendingStatusMove } from '../types/pendingStatusMove';

interface UseJobPageEffectsParams {
  // Candidate state
  tempSelectedCandidate: Candidate | null;
  selectedCandidate: Candidate | null;
  setSelectedCandidate: (candidate: Candidate | null) => void;

  /** Current client's view state (filters + sort) from jobViewStorage; used to revalidate SSE candidates so they only show when they match this client's filters. */
  viewState?: JobViewState | null;
  /** When same client moves a candidate, treat them as in this lane so they are removed from source (avoids duplicate in both lanes until refetch/SSE). */
  pendingStatusMove?: PendingStatusMove | null;

  // NEW: Lane counts and metadata from API
  laneCounts?: {
    [laneName: string]: {
      candidates: Candidate[];
      count: number;
      hasMore: boolean;
      page: number;
      totalPages: number;
      pageInfo?: {
        hasNextPage: boolean;
        nextCursor: string | null;
      };
      sorting?: {
        sortBy: string;
        sortOrder: 'asc' | 'desc';
      };
      filters?: string[];
    };
  };
  /** Merged candidates (API + SSE) for overlay so columns show live updates */
  mergedCandidates?: Candidate[];
  /** Server-authoritative per-lane counts (filter-aware); keyed by lowercase lane name. */
  serverLaneCounts?: Record<string, number>;
  /** Candidate IDs that moved OUT of each lane (from SSE status changes). */
  movedOutByLane?: Record<string, string[]>;
  laneMetadata?: {
    jobId: string;
    useCustomLanes: boolean;
    availableLanes: string[];
    totalCandidates: number;
  };

  // Lane state
  updatedLanes: string[] | undefined;
  jobLanes: { lanes: Array<{ name: string; _id: string }> } | undefined;
  lanes: { lanes: string[] } | undefined;
  refetch: () => void;

  // Column state
  setColumns: Dispatch<SetStateAction<CandidateColumn[]>>;

  // Dialog state
  isDialogOpen: boolean;
  setDroppedFileData: Dispatch<SetStateAction<File | null>>;
  isLaneEditOpen: boolean;
  laneToEdit: string | null;
  setLaneToEdit: Dispatch<SetStateAction<string | null>>;
  initialLaneToEdit: string | null;
  setInitialLaneToEdit: Dispatch<SetStateAction<string | null>>;
}

/**
 * Custom hook to manage all side effects for the job progress page.
 * Consolidates candidate syncing, lane updates, filtering, and column management.
 *
 * @param params - All necessary state and setters for side effect management
 */
export function useJobPageEffects({
  tempSelectedCandidate,
  selectedCandidate,
  setSelectedCandidate,
  viewState,
  pendingStatusMove,
  laneCounts,
  mergedCandidates,
  serverLaneCounts,
  movedOutByLane,
  laneMetadata,
  updatedLanes,
  jobLanes,
  refetch,
  setColumns,
  isDialogOpen,
  setDroppedFileData,
  isLaneEditOpen,
  laneToEdit,
  setLaneToEdit,
  initialLaneToEdit,
  setInitialLaneToEdit,
}: UseJobPageEffectsParams): void {
  const prevLanesSigRef = useRef<string>('');
  /**
   * Prevent lane reorder "flicker" from candidate refetches.
   * But on initial hydration (or when `updatedLanes` changes from SSE), we must
   * treat backend lane order as source-of-truth.
   */
  const hasHydratedLanesRef = useRef(false);

  // Effect 1: Sync temp selected candidate with state; use merged when available so SSE updates show
  useEffect(() => {
    if (!tempSelectedCandidate) return;
    const merged =
      mergedCandidates?.find((c) => c._id === tempSelectedCandidate._id) ??
      tempSelectedCandidate;
    if (merged._id !== selectedCandidate?._id) {
      setSelectedCandidate(merged);
    } else if (merged !== selectedCandidate) {
      setSelectedCandidate(merged);
    }
  }, [
    tempSelectedCandidate,
    selectedCandidate,
    setSelectedCandidate,
    mergedCandidates,
  ]);

  // Effect 2: Refetch candidates when lanes changed from SSE
  useEffect(() => {
    if (!updatedLanes || updatedLanes.length === 0) return;

    const sig = updatedLanes.join('|');
    if (sig === prevLanesSigRef.current) return;
    prevLanesSigRef.current = sig;

    refetch();
  }, [updatedLanes, refetch]);

  // Effect 3: Clear dropped file data when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      setDroppedFileData(null);
    }
  }, [isDialogOpen, setDroppedFileData]);

  // Effect 4: Convert API's grouped structure to columns and apply client-side filters
  useEffect(() => {
    const isDndUpdating =
      typeof document !== 'undefined' &&
      document.body.classList.contains('dnd-updating');

    // THIS IS THE SHIELD: If the lock is active, completely skip rebuilding columns
    if (isDndUpdating || DndSyncLock.checkIsLocked()) {
      return;
    }
    // Skip column updates during drag to prevent flicker.
    // TEMP (Phase 1): if dnd-updating is set at all, never let this effect run;
    // we'll relax this later once we confirm it's the source of snap-back.
    // const isDndUpdating =
    //   typeof document !== 'undefined' &&
    //   document.body.classList.contains('dnd-updating');

    // Convert API's grouped structure to columns and overlay merged (SSE) data.
    // IMPORTANT: preserve the existing column order (including user drag-reorder)
    // unless we are hydrating the lane order for the first time or we received
    // an explicit lane order update from SSE.
    if (!laneCounts) {
      return;
    }

    const hydrationPass = !hasHydratedLanesRef.current;

    const laneCountsByKey = Object.fromEntries(
      Object.entries(laneCounts).map(([key, value]) => [
        key.toLowerCase(),
        value,
      ]),
    );

    const mergedById = new Map<string, Candidate>();
    if (mergedCandidates?.length) {
      mergedCandidates.forEach((c) => mergedById.set(c._id, c));
    }

    // laneMapping from API meta is laneName -> laneObjectId. Invert so SSE updates that carry ObjectId
    // can still be placed into the correct lane by name.
    const laneIdToName: Record<string, string> = {};
    const laneMapping = (
      laneMetadata as unknown as { laneMapping?: Record<string, string> }
    )?.laneMapping;
    if (laneMapping && typeof laneMapping === 'object') {
      Object.entries(laneMapping).forEach(([laneName, laneId]) => {
        if (laneId && typeof laneId === 'string') {
          laneIdToName[laneId] = laneName;
        }
      });
    }

    // Single source of truth: each candidate belongs to exactly one lane (merged status, lowercased)
    const candidateToLane = new Map<string, string>();
    const getLaneFromCandidate = (c: Candidate): string => {
      const raw = c.status ?? 'applied';
      if (typeof raw === 'string') {
        const mapped = laneIdToName[raw];
        return (mapped ?? raw).toLowerCase();
      }
      if (raw && typeof raw === 'object' && 'name' in raw) {
        const n = (raw as { name?: string }).name;
        return n ? String(n).toLowerCase() : 'applied';
      }
      if (raw && typeof raw === 'object' && '_id' in raw) {
        const id = (raw as { _id?: unknown })._id;
        const mapped = id != null ? laneIdToName[String(id)] : undefined;
        if (mapped) return mapped.toLowerCase();
      }
      return 'applied';
    };
    mergedCandidates?.forEach((c) => {
      const s = getLaneFromCandidate(c);
      if (s) candidateToLane.set(c._id, s);
    });
    // Optimistic move: when same client moved a candidate, treat as in new lane so they are removed from source (no duplicate in both lanes)
    if (pendingStatusMove?.candidateId && pendingStatusMove?.status) {
      candidateToLane.set(
        pendingStatusMove.candidateId,
        pendingStatusMove.status.toLowerCase(),
      );
    }

    setColumns((prevColumns) => {
      // Derive desired lane order:
      // 1. During initial hydration or when SSE indicates the lane order changed,
      //    use backend lane order as source-of-truth.
      // 2. Otherwise, keep existing column order (including drag-reordered lanes)
      //    to avoid lane reorder flicker on candidate/page refetches.
      // 3. Append any new lanes from backend that don't exist locally.
      const existingOrder = prevColumns.map((col) => col.id as string);

      const backendLaneNamesRaw: string[] =
        laneMetadata?.availableLanes ??
        (jobLanes?.lanes
          ? jobLanes.lanes.map(
              (lane: { name: string; _id: string }) => lane.name,
            )
          : []);

      const backendLaneNames = backendLaneNamesRaw.map((laneName) =>
        laneName.toLowerCase(),
      );

      const existingSig = existingOrder.join('|');
      const updatedSig = updatedLanes?.join('|') ?? '';
      const shouldUseBackendOrder =
        hydrationPass || (updatedSig !== '' && updatedSig !== existingSig);

      const finalOrder: string[] = shouldUseBackendOrder
        ? backendLaneNames
        : [
            ...existingOrder,
            ...backendLaneNames.filter((l) => !existingOrder.includes(l)),
          ];

      const viewFilter = viewState?.filter;
      const filtersActive = Boolean(viewFilter && hasActiveFilter(viewFilter));

      const nextColumns: CandidateColumn[] = finalOrder.map((laneId) => {
        const prevCol =
          prevColumns.find((c) => c.id === laneId) ??
          ({
            id: laneId as CandidateStatus,
            title: laneId,
            candidates: [],
          } as CandidateColumn);

        const laneKey = laneId.toLowerCase();
        const laneData = laneCountsByKey[laneKey];
        const apiCandidates = laneData?.candidates || [];
        const apiCandidatesFiltered = apiCandidates.filter((c) => {
          const mappedLane = candidateToLane.get(c._id);
          return mappedLane === undefined || mappedLane === laneKey;
        });
        const apiIds = new Set(apiCandidatesFiltered.map((c) => c._id));

        // Overlay merged data when present, but keep API candidates as fallback.
        // Drop stale API rows when optimistic/SSE mapping says the candidate moved elsewhere.
        let overlaidCandidates = apiCandidatesFiltered.map(
          (c) => mergedById.get(c._id) ?? c,
        );

        // Candidates that moved into this lane via SSE/optimistic move but aren't on current API page
        const movedIntoLaneIds = new Set<string>();
        let movedIntoLane: Candidate[] = [];
        for (const c of mergedCandidates ?? []) {
          if (candidateToLane.get(c._id) === laneKey && !apiIds.has(c._id)) {
            movedIntoLane.push(c);
            movedIntoLaneIds.add(c._id);
          }
        }
        // Actor tab: pendingStatusMove may map a candidate here before grouped API / SSE catch up.
        if (
          pendingStatusMove?.candidateId &&
          candidateToLane.get(pendingStatusMove.candidateId) === laneKey &&
          !apiIds.has(pendingStatusMove.candidateId) &&
          !movedIntoLaneIds.has(pendingStatusMove.candidateId)
        ) {
          const pendingCandidate =
            mergedById.get(pendingStatusMove.candidateId) ??
            pendingStatusMove.candidateSnapshot ??
            prevColumns
              .flatMap((col) => col.candidates)
              .find((c) => c._id === pendingStatusMove.candidateId);
          if (pendingCandidate) {
            movedIntoLane.push({
              ...pendingCandidate,
              status: pendingStatusMove.status,
            });
            movedIntoLaneIds.add(pendingStatusMove.candidateId);
          }
        }

        for (const [candidateId, mappedLane] of candidateToLane.entries()) {
          if (
            mappedLane !== laneKey ||
            apiIds.has(candidateId) ||
            movedIntoLaneIds.has(candidateId)
          ) {
            continue;
          }
          const candidate =
            mergedById.get(candidateId) ??
            (pendingStatusMove?.candidateId === candidateId
              ? pendingStatusMove.candidateSnapshot
              : undefined) ??
            prevCol.candidates.find((c) => c._id === candidateId) ??
            prevColumns
              .flatMap((col) => col.candidates)
              .find((c) => c._id === candidateId);
          if (candidate) {
            movedIntoLane.push({ ...candidate, status: mappedLane });
            movedIntoLaneIds.add(candidateId);
          }
        }

        // Prefer server counts-only aggregation when hydrated; grouped lane.count is fallback.
        const serverCount = serverLaneCounts?.[laneKey];
        const count =
          serverCount ?? laneData?.count ?? prevCol.count ?? 0;

        if (filtersActive) {
          overlaidCandidates = overlaidCandidates.filter((c) =>
            candidateMatchesJobViewFilter(c, viewFilter),
          );
          movedIntoLane = movedIntoLane.filter((c) =>
            candidateMatchesJobViewFilter(c, viewFilter),
          );
        }

        let candidates = [...overlaidCandidates, ...movedIntoLane];
        const laneSortConfig = resolveLaneSortConfig(
          laneId,
          viewState,
          laneData?.sorting ?? prevCol.sorting,
        );
        candidates = sortCandidatesForLane(
          candidates,
          laneSortConfig.sortBy,
          laneSortConfig.sortOrder,
        );
        if (movedIntoLane.length > 0) {
          logger.info('[SSE_UI] useJobPageEffects candidates moved into lane', {
            lane: laneKey,
            movedCount: movedIntoLane.length,
            movedIds: movedIntoLane.map((c) => c._id),
            totalCandidates: candidates.length,
            overlaidCount: overlaidCandidates.length,
          });
        }

        const hasMore =
          count > candidates.length || (laneData?.hasMore ?? false);

        const removedFromLaneIds = movedOutByLane?.[laneKey] ?? [];

        return {
          id: laneId as CandidateStatus,
          title: prevCol.title || laneId,
          candidates,
          count,
          hasMore,
          pageInfo: laneData?.pageInfo,
          sorting: laneData?.sorting,
          filters: laneData?.filters,
          removedFromLaneIds,
        };
      });

      return nextColumns;
    });

    if (hydrationPass) {
      hasHydratedLanesRef.current = true;
    }
  }, [
    laneCounts,
    mergedCandidates,
    laneMetadata,
    updatedLanes,
    jobLanes,
    viewState?.filter,
    pendingStatusMove,
    movedOutByLane,
    serverLaneCounts,
    setColumns,
  ]);

  // Effect 4b: Patch lane badge counts from server aggregation without rebuilding lists.
  useEffect(() => {
    if (!serverLaneCounts) return;

    setColumns((prev) => {
      let changed = false;
      const next = prev.map((col) => {
        const laneKey = String(col.id).toLowerCase();
        const serverCount = serverLaneCounts[laneKey];
        if (serverCount === undefined || serverCount === col.count) {
          return col;
        }
        changed = true;
        return { ...col, count: serverCount };
      });
      return changed ? next : prev;
    });
  }, [serverLaneCounts, setColumns]);

  // Effect 5: Set initial lane to edit when laneToEdit changes
  useEffect(() => {
    if (laneToEdit && initialLaneToEdit === null) {
      setInitialLaneToEdit(laneToEdit);
    }
  }, [laneToEdit, initialLaneToEdit, setInitialLaneToEdit]);

  // Effect 6: Clear lane edit state when dialog closes
  useEffect(() => {
    if (!isLaneEditOpen) {
      setInitialLaneToEdit(null);
      setLaneToEdit(null);
    }
  }, [isLaneEditOpen, setInitialLaneToEdit, setLaneToEdit]);
}
