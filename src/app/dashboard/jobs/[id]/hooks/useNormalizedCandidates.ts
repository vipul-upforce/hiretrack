/**
 * Hook to fetch and normalize candidates from multiple sources
 * Provides single source of truth for candidate data.
 * Filter and sort are passed from viewState (localStorage) to the candidates API.
 */

import { useMemo, useRef, useEffect } from 'react';
import { useFetchCandidatesQuery } from '@/lib/features/candidate/candidateApi';
import { useSSE } from '@/hooks/useSSE';
import { Candidate } from '@/types/candidate';
import {
  normalizeCandidate,
  mergeCandidate,
  normalizeJobId,
  NormalizedCandidate,
} from '../utils/candidateNormalizer';
import type { JobViewState } from '../utils/jobViewStorage';
import {
  candidateBecameVisibleForFilter,
  candidateMatchesJobViewFilter,
  didAssignmentFilterMembershipFlip,
  hasActiveFilter,
} from '../utils/candidateViewFilter';
import { useSseCountInvalidation } from './useSseCountInvalidation';
import { useSseFilterListInvalidation } from './useSseFilterListInvalidation';

interface UseNormalizedCandidatesProps {
  jobId: string;
  setSelectedCandidate: (candidate: Candidate | null) => void;
  selectedCandidate: Candidate | null;
  /** View state (filter + sort) from localStorage; applied as query params to candidates API */
  viewState?: JobViewState;
  enabled?: boolean;
}

/**
 * Hook that normalizes candidates from API and SSE sources
 * Returns normalized candidates array as single source of truth.
 * SSE updates are merged onto existing candidates (no wipe); delete and job-switch remove from map.
 */
export function useNormalizedCandidates({
  jobId,
  setSelectedCandidate,
  selectedCandidate,
  viewState,
  enabled = true,
}: UseNormalizedCandidatesProps) {
  const queryArg = useMemo(() => {
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

    return {
      jobId,
      filter,
      sortBy,
      sortOrder,
      // Send laneSort so backend can persist and reuse per-lane sort config.
      // Grouped fetch uses this only for initial page-1 per lane; actual
      // interactive lane sorting still happens via the lane-scoped lazy query.
      laneSort:
        viewState?.laneSort && Object.keys(viewState.laneSort).length > 0
          ? viewState.laneSort
          : undefined,
    };
  }, [
    jobId,
    viewState?.filter,
    viewState?.sortBy,
    viewState?.sortOrder,
    viewState?.laneSort,
  ]);

  // Fetch candidates from API (filter/sort from viewState as query params)
  const queryArgSig = useMemo(() => JSON.stringify(queryArg), [queryArg]);
  const prevQueryArgSigRef = useRef<string>(queryArgSig);
  const argChanged = prevQueryArgSigRef.current !== queryArgSig;
  useEffect(() => {
    prevQueryArgSigRef.current = queryArgSig;
  }, [queryArgSig]);

  const {
    data: candidatesFromQuery,
    isLoading: isCandidatesLoading,
    isFetching: isCandidatesFetching,
    refetch,
  } = useFetchCandidatesQuery(queryArg, {
    // refetchOnMountOrArgChange: true,
    skip: !enabled,
  });

  const wasEnabledRef = useRef(enabled);
  useEffect(() => {
    if (enabled && !wasEnabledRef.current) {
      void refetch();
    }
    wasEnabledRef.current = enabled;
  }, [enabled, refetch]);

  // When filter/sort changes, don't render cached previous lanes while the new request is in-flight.
  const shouldHideCached = argChanged && isCandidatesFetching;
  const candidatesFromQueryEffective = shouldHideCached ? undefined : candidatesFromQuery;
  const isCandidatesLoadingEffective = isCandidatesLoading || shouldHideCached;


  // Get SSE candidates, removed ids, and connection info
  const {
    candidates: sseCandidates,
    removedCandidates,
    lanes: sseLanes,
    clients,
    isConnected,
  } = useSSE(setSelectedCandidate, selectedCandidate || null, jobId);

  const laneIdToName = useMemo(() => {
    const meta = (
      candidatesFromQueryEffective as {
        meta?: { laneMapping?: Record<string, string> };
      }
    )?.meta;
    const laneMapping = meta?.laneMapping;
    if (!laneMapping) return undefined;
    return Object.fromEntries(
      Object.entries(laneMapping).map(([name, id]) => [id, name]),
    );
  }, [candidatesFromQueryEffective?.meta?.laneMapping]);

  const countInvalidationSig = useSseCountInvalidation({
    jobId,
    enabled,
    sseCandidates,
    removedCandidates,
    laneIdToName,
  });

  const viewFilterForList = viewState?.filter ?? null;
  const filterListInvalidationSig = useSseFilterListInvalidation({
    jobId,
    enabled,
    viewFilter: viewFilterForList,
    sseCandidates,
  });

  const removedSig = (removedCandidates ?? [])
    .map((r) => `${r.id}:${r.status}`)
    .join(',');

  // Timestamp of the most recent candidates API result applied on this client.
  // Used to avoid double-counting "unseen" candidates on Client B when SSE updates arrive
  // for candidates that are simply on a different page due to sorting (or beyond page 1).
  const lastApiResultAtRef = useRef<number>(0);
  useEffect(() => {
    if (candidatesFromQueryEffective?.lanes) {
      lastApiResultAtRef.current = Date.now();
    }
  }, [candidatesFromQueryEffective]);

  // Persist last-known status per candidate so we can apply lane deltas when candidate isn't on current API page (e.g. page 2+)
  const previousStatusByRef = useRef<Map<string, string>>(new Map());
  // Snapshot of the last-known candidate object per id (API or SSE).
  // Used to detect filter membership transitions (become visible/hidden) for candidates
  // that are NOT in Client B's currently loaded page due to sorting/pagination.
  const previousCandidateSnapshotByIdRef = useRef<Map<string, Candidate>>(
    new Map(),
  );

  // Dedupe status-move SSE events so markMovedOut is not applied twice per candidate move.
  const appliedStatusEventsRef = useRef<Set<string>>(new Set());
  // Candidate IDs that moved OUT of each lane (pagination-safe card removal in KanbanColumn).
  const movedOutByLaneRef = useRef<Record<string, Set<string>>>({});

  useEffect(() => {
    movedOutByLaneRef.current = {};
    appliedStatusEventsRef.current.clear();
  }, [queryArgSig]);

  const { candidates: normalizedCandidates, movedOutByLane } = useMemo(() => {
    const candidateMap = new Map<string, NormalizedCandidate>();
    const appliedStatusEvents = appliedStatusEventsRef.current;

    // Build lane ObjectId -> name so we can resolve status when API returns ObjectId (avoids dupes in "applied" after checklist/status update).
    const meta = (
      candidatesFromQueryEffective as {
        meta?: { laneMapping?: Record<string, string> };
      }
    )?.meta;
    const laneMapping = meta?.laneMapping;
    const laneIdToName: Record<string, string> | undefined = laneMapping
      ? Object.fromEntries(
          Object.entries(laneMapping).map(([name, id]) => [id, name]),
        )
      : undefined;
    const normalizeOptions = laneIdToName ? { laneIdToName } : undefined;

    const markMovedOut = (lane: string, candidateId: string) => {
      const key = (lane ?? '').toLowerCase();
      if (!key || !candidateId) return;
      if (!movedOutByLaneRef.current[key]) {
        movedOutByLaneRef.current[key] = new Set<string>();
      }
      movedOutByLaneRef.current[key].add(candidateId);
    };
    const getLaneName = (
      c: Candidate | NormalizedCandidate | null | undefined,
    ): string => {
      const raw = (c as { status?: unknown })?.status;
      if (typeof raw === 'string' && raw.trim()) return raw.toLowerCase();
      if (
        raw &&
        typeof raw === 'object' &&
        'name' in (raw as { name?: unknown })
      ) {
        const n = (raw as { name?: unknown }).name;
        if (typeof n === 'string' && n.trim()) return n.toLowerCase();
      }
      return 'applied';
    };
    const isCreatedAfterLastApiResult = (candidate: Candidate): boolean => {
      const lastApiAt = lastApiResultAtRef.current;
      if (!lastApiAt) return false;
      const createdAtRaw = (candidate as { tracking?: { createdAt?: unknown } })
        ?.tracking?.createdAt;
      if (!createdAtRaw) return false;
      let ts = Number.NaN;
      if (createdAtRaw instanceof Date) {
        ts = createdAtRaw.getTime();
      } else if (typeof createdAtRaw === 'string') {
        ts = Date.parse(createdAtRaw);
      } else if (typeof createdAtRaw === 'number') {
        ts = createdAtRaw;
      }
      return Number.isFinite(ts) && ts > lastApiAt;
    };

    // 1. Add all candidates from API
    if (candidatesFromQueryEffective?.lanes) {
      const allCandidates: Candidate[] = [];
      Object.values(candidatesFromQueryEffective.lanes).forEach((laneData) => {
        if (Array.isArray(laneData.candidates)) {
          allCandidates.push(...laneData.candidates);
        }
      });
      allCandidates.forEach((candidate) => {
        const normalized = normalizeCandidate(candidate, normalizeOptions);
        if (normalized) {
          candidateMap.set(normalized._id, normalized);
          previousCandidateSnapshotByIdRef.current.set(
            normalized._id,
            normalized as unknown as Candidate,
          );
        }
      });
    }

      // 2. Overlay SSE: merge with existing when present; skip or remove if different job (job switch).
    // Client B filter-helper: only apply deltas and show candidate when it matches this client's view filter.
    // If filter doesn't allow, no delta and no add to map (or remove from map if was visible).
    const currentJobId = jobId ?? '';
    const viewFilter = viewState?.filter ?? null;
    const filtersActive = hasActiveFilter(viewFilter);

    // Warm per-job snapshots from the org-wide SSE buffer (filter flips / cross-tab assign).
    if (enabled && sseCandidates) {
      const warmJobId = String(currentJobId ?? '');
      sseCandidates.forEach((sseCandidate) => {
        const warmNorm = normalizeCandidate(sseCandidate, normalizeOptions);
        if (!warmNorm) return;
        if (String(normalizeJobId(warmNorm.jobId)) !== warmJobId) return;
        const prior = previousCandidateSnapshotByIdRef.current.get(warmNorm._id);
        const warmMerged = prior
          ? mergeCandidate(
              prior as NormalizedCandidate,
              warmNorm as unknown as Record<string, unknown>,
            )
          : warmNorm;
        previousCandidateSnapshotByIdRef.current.set(
          warmNorm._id,
          warmMerged as unknown as Candidate,
        );
      });
    }

    if (enabled && sseCandidates) {
      sseCandidates.forEach((sseCandidate) => {
        const normalized = normalizeCandidate(sseCandidate, normalizeOptions);
        const rawId = (sseCandidate as { _id?: unknown })?._id;
        let idStr = '';
        if (typeof rawId === 'string') idStr = rawId;
        else if (rawId != null) idStr = String(rawId);

        // If SSE payload is partial and fails normalization (e.g. missing name),
        // still merge onto existing candidate so status changes / remarks / follow-up
        // update correctly for clients with active filters.
        if (!normalized) {
          if (!idStr) return;
          const existing = candidateMap.get(idStr);
          const snapshotForPartial =
            previousCandidateSnapshotByIdRef.current.get(idStr);
          const mergeBase = existing ?? snapshotForPartial;
          if (!mergeBase) return;

          const overrideObj: Record<string, unknown> = {
            ...(sseCandidate as unknown as Record<string, unknown>),
            _id: idStr,
          };
          const rawStatus = overrideObj.status;
          if (typeof rawStatus === 'string') {
            overrideObj.status = rawStatus.toLowerCase();
          } else if (
            rawStatus &&
            typeof rawStatus === 'object' &&
            'name' in (rawStatus as { name?: unknown })
          ) {
            const nameValue = (rawStatus as { name?: unknown }).name;
            if (nameValue) overrideObj.status = String(nameValue).toLowerCase();
          }

          const mergedForFilter = mergeCandidate(
            mergeBase as NormalizedCandidate,
            overrideObj,
          );
          const passesFilter = candidateMatchesJobViewFilter(
            mergedForFilter as unknown as Candidate,
            viewFilter,
          );
          if (!passesFilter) {
            if (existing) candidateMap.delete(idStr);
            previousCandidateSnapshotByIdRef.current.set(
              idStr,
              mergedForFilter as unknown as Candidate,
            );
            return;
          }

          candidateMap.set(idStr, mergedForFilter);
          previousCandidateSnapshotByIdRef.current.set(
            idStr,
            mergedForFilter as unknown as Candidate,
          );
          return;
        }

        const newStatus = (normalized.status ?? 'applied').toLowerCase();
        const sseJobIdStr = String(normalizeJobId(normalized.jobId));
        const currentJobIdStr = String(currentJobId ?? '');

        // --- Check job id first: never add a candidate to this client's job if they left our job (source job). ---
        const previousJobIdFromSSE = (
          sseCandidate as { previousJobIdFromSSE?: unknown }
        )?.previousJobIdFromSSE;
        const previousJobIdStr =
          previousJobIdFromSSE != null ? String(previousJobIdFromSSE) : '';
        const previousStatusFromSSE = (
          sseCandidate as { previousStatusFromSSE?: string }
        )?.previousStatusFromSSE?.toLowerCase();
        const previousStatusFromSSENormalized =
          previousStatusFromSSE &&
          laneIdToName &&
          /^[0-9a-f]{24}$/i.test(previousStatusFromSSE)
            ? (laneIdToName[previousStatusFromSSE] ?? previousStatusFromSSE)
            : previousStatusFromSSE;

        // Apply same-job status-move lane deltas directly from SSE payload when available.
        // This keeps counts correct even when the moved candidate is not present
        // in this client's grouped page-1 cache (e.g. candidate loaded on page 2/3/4).
        // Skip job-switch events where previousJobId points to a different job.
        if (
          previousStatusFromSSENormalized &&
          previousStatusFromSSENormalized !== newStatus &&
          sseJobIdStr &&
          currentJobIdStr &&
          sseJobIdStr === currentJobIdStr &&
          (!previousJobIdStr || previousJobIdStr === currentJobIdStr)
        ) {
          const eventKey = `${normalized._id}:${previousStatusFromSSENormalized}:${newStatus}:${currentJobId}`;
          if (!appliedStatusEvents.has(eventKey)) {
            appliedStatusEvents.add(eventKey);
            markMovedOut(previousStatusFromSSENormalized, normalized._id);
          }
        }

        // We are the source job (candidate left us): only decrement source lane and remove; never add.
        // Require payload's current job (sseJobIdStr) to differ from ours; otherwise "left us but still on us" is inconsistent
        // and can wrongly decrement applied on Client B when a move-from-rejected lands in applied (duplicate/stale events).
        if (
          previousJobIdStr &&
          currentJobIdStr &&
          previousJobIdStr === currentJobIdStr &&
          sseJobIdStr &&
          sseJobIdStr !== currentJobIdStr
        ) {
          const existing = candidateMap.get(normalized._id);
          const previousSnapshot = previousCandidateSnapshotByIdRef.current.get(
            normalized._id,
          );
          const wasVisibleBefore = (() => {
            if (!filtersActive) return true;
            if (previousSnapshot) {
              return candidateMatchesJobViewFilter(
                previousSnapshot,
                viewFilter,
              );
            }
            return undefined;
          })();
          // Do not set shouldRefetchForUnknownMembershipRef: rely on backend previousJobId/previousStatus (no refetch on SSE).
          if (wasVisibleBefore !== false) {
            const oldLane =
              previousStatusFromSSE ||
              previousStatusByRef.current.get(normalized._id) ||
              (existing ? getLaneName(existing) : null) ||
              getLaneName(previousSnapshot) ||
              newStatus;
            const eventKey = `${normalized._id}:jobSwitchOut:${currentJobIdStr}:${sseJobIdStr}:${oldLane}`;
            if (!appliedStatusEvents.has(eventKey)) {
              appliedStatusEvents.add(eventKey);
            }
            markMovedOut(oldLane, normalized._id);
          }
          candidateMap.delete(normalized._id);
          return;
        }

        // Candidate is now on a different job than ours (and we're not the source) → only decrement if they were on our job, then remove.
        if (sseJobIdStr && currentJobIdStr && sseJobIdStr !== currentJobIdStr) {
          const existing = candidateMap.get(normalized._id);
          if (existing) {
            const oldLane =
              previousStatusFromSSE ||
              previousStatusByRef.current.get(normalized._id) ||
              getLaneName(existing) ||
              newStatus;
            const eventKey = `${normalized._id}:jobSwitchOut:${currentJobIdStr}:${sseJobIdStr}:${oldLane}`;
            if (!appliedStatusEvents.has(eventKey)) {
              appliedStatusEvents.add(eventKey);
            }
            markMovedOut(oldLane, normalized._id);
          }
          candidateMap.delete(normalized._id);
          return;
        }

        // Stale-map safeguard: payload reports previousStatus === newStatus (no change per SSE),
        // but our local map still has the candidate in a different lane. On the actor tab the map
        // can lag behind the mutation/SSE — treat this as a same-job status move, not a removal.
        const existingForSourceCheck = candidateMap.get(normalized._id);
        if (
          existingForSourceCheck &&
          sseJobIdStr === currentJobIdStr &&
          previousStatusFromSSE === newStatus
        ) {
          const ourLane = getLaneName(existingForSourceCheck);
          if (ourLane && ourLane !== newStatus) {
            const mergedForMove = mergeCandidate(
              existingForSourceCheck,
              normalized as unknown as Record<string, unknown>,
            );
            const passesMoveFilter = candidateMatchesJobViewFilter(
              mergedForMove as unknown as Candidate,
              viewFilter,
            );
            const eventKey = `${normalized._id}:staleMapStatusMove:${ourLane}:${newStatus}:${currentJobIdStr}`;
            if (!appliedStatusEvents.has(eventKey)) {
              appliedStatusEvents.add(eventKey);
              markMovedOut(ourLane, normalized._id);
            }
            if (passesMoveFilter) {
              candidateMap.set(
                normalized._id,
                mergedForMove as unknown as NormalizedCandidate,
              );
            } else {
              candidateMap.delete(normalized._id);
            }
            previousStatusByRef.current.set(normalized._id, newStatus);
            previousCandidateSnapshotByIdRef.current.set(
              normalized._id,
              mergedForMove as unknown as Candidate,
            );
            return;
          }
        }

        // Same-job "no change" payload but candidate not in our map: do not add.
        // Payload says status === previousStatus (e.g. applied/applied) *and* there is no previousJobId.
        // When previousJobId is present, this is a real job-switch and must be handled by the jobSwitchIn logic above.
        // We do not refetch; backend should send previousJobId when applicable so we can apply deltas.
        if (
          !existingForSourceCheck &&
          sseJobIdStr === currentJobIdStr &&
          previousStatusFromSSE === newStatus &&
          !previousJobIdStr
        ) {
          previousStatusByRef.current.set(normalized._id, newStatus);
          return;
        }

        // Same-job status move when SSE omitted previousStatus but local map still has the old lane.
        if (
          existingForSourceCheck &&
          sseJobIdStr === currentJobIdStr &&
          !previousJobIdStr &&
          previousStatusFromSSE === undefined
        ) {
          const ourLane = getLaneName(existingForSourceCheck);
          if (ourLane && ourLane !== newStatus) {
            const mergedForMove = mergeCandidate(
              existingForSourceCheck,
              normalized as unknown as Record<string, unknown>,
            );
            const passesMoveFilter = candidateMatchesJobViewFilter(
              mergedForMove as unknown as Candidate,
              viewFilter,
            );
            const eventKey = `${normalized._id}:noPrevStatusMove:${ourLane}:${newStatus}:${currentJobIdStr}`;
            if (!appliedStatusEvents.has(eventKey)) {
              appliedStatusEvents.add(eventKey);
              markMovedOut(ourLane, normalized._id);
            }
            if (passesMoveFilter) {
              candidateMap.set(
                normalized._id,
                mergedForMove as unknown as NormalizedCandidate,
              );
            } else {
              candidateMap.delete(normalized._id);
            }
            previousStatusByRef.current.set(normalized._id, newStatus);
            previousCandidateSnapshotByIdRef.current.set(
              normalized._id,
              mergedForMove as unknown as Candidate,
            );
            return;
          }
        }

        // Candidate is now on our job and came from another job → only apply +1 and add if passes filter.
        // Job moves always land in "applied"; ignore stale payloads that say they landed in another lane (e.g. rejected).
        if (
          previousJobIdStr &&
          currentJobIdStr &&
          sseJobIdStr === currentJobIdStr &&
          previousJobIdStr !== currentJobIdStr
        ) {
          const passesFilterNow = candidateMatchesJobViewFilter(
            normalized as unknown as Candidate,
            viewFilter,
          );
          // Only apply delta and add when target lane is "applied" (move-job semantics); skip wrong/stale payloads
          const isJobMoveTargetLane = newStatus === 'applied';
          if (passesFilterNow && isJobMoveTargetLane) {
            const eventKey = `${normalized._id}:jobSwitchIn:${previousJobIdStr}:${currentJobIdStr}:${newStatus}`;
            if (!appliedStatusEvents.has(eventKey)) {
              appliedStatusEvents.add(eventKey);
            }
            candidateMap.set(normalized._id, normalized);
          }
          previousStatusByRef.current.set(normalized._id, newStatus);
          previousCandidateSnapshotByIdRef.current.set(
            normalized._id,
            normalized as unknown as Candidate,
          );
          return;
        }

        // Filter-helper: only apply deltas and add/merge to map when candidate matches this client's filter.
        // When no filter is applied, candidateMatchesJobViewFilter(_, null) returns true.
        // Merge onto API row or last-known snapshot so partial SSE (e.g. assignment-only) still
        // evaluates correctly against strict filters.
        const previousSnapshot = previousCandidateSnapshotByIdRef.current.get(
          normalized._id,
        );
        const existingForFilter = candidateMap.get(normalized._id);
        const mergeBaseForFilter = existingForFilter ?? previousSnapshot ?? null;
        const mergedForFilter = mergeBaseForFilter
          ? mergeCandidate(
              mergeBaseForFilter as NormalizedCandidate,
              normalized as unknown as Record<string, unknown>,
            )
          : normalized;
        const previousIsDeletedFromSSE = (
          sseCandidate as { previousIsDeletedFromSSE?: boolean }
        )?.previousIsDeletedFromSSE;
        const passesFilter = candidateMatchesJobViewFilter(
          mergedForFilter as unknown as Candidate,
          viewFilter,
        );
        const passesFilterBefore = (() => {
          if (previousIsDeletedFromSSE === undefined) return undefined;
          // Only handle archive/unarchive membership changes for "never loaded" candidates.
          // We compute membership before by forcing isDeleted to the previous value.
          const before = {
            ...(mergedForFilter as unknown as Candidate),
            isDeleted: previousIsDeletedFromSSE,
          } as Candidate;
          return candidateMatchesJobViewFilter(before, viewFilter);
        })();
        const passesFilterBeforeFromSnapshot =
          previousSnapshot != null
            ? candidateMatchesJobViewFilter(previousSnapshot, viewFilter)
            : undefined;
        const passesFilterBeforeEffective =
          passesFilterBefore ?? passesFilterBeforeFromSnapshot;

        // CRITICAL: Get previous status from multiple sources (in order of reliability):
        // 1. previousStatusFromSSE from SSE payload (most reliable - sent by backend)
        // 2. previousStatusByRef (tracked from previous renders)
        // 3. existing.status (if candidate is in current API response)
        const previousStatusFromSSEPayloadRaw = (
          sseCandidate as { previousStatusFromSSE?: string }
        )?.previousStatusFromSSE?.toLowerCase();
        const previousStatusFromSSEPayload =
          previousStatusFromSSEPayloadRaw &&
          laneIdToName &&
          /^[0-9a-f]{24}$/i.test(previousStatusFromSSEPayloadRaw)
            ? (laneIdToName[previousStatusFromSSEPayloadRaw] ??
              previousStatusFromSSEPayloadRaw)
            : previousStatusFromSSEPayloadRaw;
        const prevStatusFromSSETracking = previousStatusByRef.current.get(
          normalized._id,
        );

        const existing = candidateMap.get(normalized._id);
        if (existing) {
          // Safely extract old status - handle string or object (populated ref)
          const existingStatusRaw = existing.status;
          let oldStatusRaw = 'applied';
          if (typeof existingStatusRaw === 'string') {
            oldStatusRaw = existingStatusRaw;
          } else if (
            typeof existingStatusRaw === 'object' &&
            existingStatusRaw !== null &&
            'name' in existingStatusRaw
          ) {
            const nameValue = (existingStatusRaw as { name?: string }).name;
            oldStatusRaw = nameValue ? String(nameValue) : 'applied';
          }
          const oldStatus = oldStatusRaw.toLowerCase();
          // Prefer SSE-provided previous status (sent by backend) to avoid double-applying deltas
          // when local `existing.status` is stale or already updated by a prior SSE message.
          const prevStatusForDelta =
            previousStatusFromSSEPayload ||
            prevStatusFromSSETracking ||
            oldStatus;

          if (!passesFilter) {
            candidateMap.delete(normalized._id);
            if (passesFilterBeforeEffective === true) {
              const laneForRemoval =
                getLaneName(existing as unknown as Candidate) ||
                oldStatus ||
                newStatus;
              const eventKeyRemove = `${normalized._id}:becameHidden:${laneForRemoval}:${currentJobId}`;
              if (!appliedStatusEvents.has(eventKeyRemove)) {
                appliedStatusEvents.add(eventKeyRemove);
                markMovedOut(laneForRemoval, normalized._id);
              }
            }
            previousCandidateSnapshotByIdRef.current.set(
              normalized._id,
              mergedForFilter as unknown as Candidate,
            );
            return;
          }

          // No delta when status unchanged (e.g. evaluate only updates scores) — prevents Client B count going -1
          // If backend sent previousStatus and it differs from newStatus, we still must apply the move even
          // when our local oldStatus already equals newStatus.
          if (oldStatus === newStatus && prevStatusForDelta === newStatus) {
            const wasDeleted =
              (existing as unknown as Candidate).isDeleted === true;
            const nowDeleted =
              (mergedForFilter as unknown as Candidate).isDeleted === true;
            if (wasDeleted !== nowDeleted) {
              if (!passesFilter) {
                const laneForRemoval = oldStatus || newStatus;
                const eventKeyRemove = `${normalized._id}:archiveToggleHidden:${laneForRemoval}:${currentJobId}`;
                if (!appliedStatusEvents.has(eventKeyRemove)) {
                  appliedStatusEvents.add(eventKeyRemove);
                  markMovedOut(laneForRemoval, normalized._id);
                }
                candidateMap.delete(normalized._id);
                previousCandidateSnapshotByIdRef.current.set(
                  normalized._id,
                  mergedForFilter as unknown as Candidate,
                );
                return;
              }
              if (wasDeleted && !nowDeleted) {
                const eventKey = `${normalized._id}:restored:${newStatus}:${currentJobId}`;
                if (!appliedStatusEvents.has(eventKey)) {
                  appliedStatusEvents.add(eventKey);
                }
              } else if (!wasDeleted && nowDeleted) {
                candidateMap.delete(normalized._id);
                const eventKey = `${normalized._id}:archived:${oldStatus}:${currentJobId}`;
                if (!appliedStatusEvents.has(eventKey)) {
                  appliedStatusEvents.add(eventKey);
                  markMovedOut(oldStatus, normalized._id);
                }
                previousCandidateSnapshotByIdRef.current.set(
                  normalized._id,
                  mergedForFilter as unknown as Candidate,
                );
                return;
              }
            }
            candidateMap.set(
              normalized._id,
              mergedForFilter as unknown as NormalizedCandidate,
            );
            previousCandidateSnapshotByIdRef.current.set(
              normalized._id,
              mergedForFilter as unknown as Candidate,
            );
            return;
          }

          if (
            filtersActive &&
            passesFilter &&
            didAssignmentFilterMembershipFlip(
              viewFilter,
              previousSnapshot,
              mergedForFilter as unknown as Candidate,
            )
          ) {
            candidateMap.set(
              normalized._id,
              mergedForFilter as unknown as NormalizedCandidate,
            );
            previousCandidateSnapshotByIdRef.current.set(
              normalized._id,
              mergedForFilter as unknown as Candidate,
            );
            return;
          }

          if (prevStatusForDelta !== newStatus) {
            const eventKey = `${normalized._id}:${prevStatusForDelta}:${newStatus}:${currentJobId}`;
            if (!appliedStatusEvents.has(eventKey)) {
              appliedStatusEvents.add(eventKey);

              // Apply SSE deltas for all clients (including actor tab). If API refetch is stale
              // for the actor client, these deltas keep lane counts correct until API catches up.
              // Track the exact moved-out candidate for old lane removal (pagination-safe).
              markMovedOut(prevStatusForDelta, normalized._id);
            }
          }
          candidateMap.set(
            normalized._id,
            mergedForFilter as unknown as NormalizedCandidate,
          );
          previousCandidateSnapshotByIdRef.current.set(
            normalized._id,
            mergedForFilter as unknown as Candidate,
          );
        } else {
          if (!passesFilter) {
            if (passesFilterBeforeEffective === true) {
              const laneForDelta =
                previousStatusFromSSEPayload ||
                prevStatusFromSSETracking ||
                getLaneName(previousSnapshot) ||
                newStatus;
              const eventKey = `${normalized._id}:becameHidden:${laneForDelta}:${currentJobId}`;
              if (!appliedStatusEvents.has(eventKey)) {
                appliedStatusEvents.add(eventKey);
                markMovedOut(laneForDelta, normalized._id);
              }
            }
            previousCandidateSnapshotByIdRef.current.set(
              normalized._id,
              mergedForFilter as unknown as Candidate,
            );
            return;
          }

          // Candidate not on current API page (e.g. page 2+ or different sort on Client B).
          // IMPORTANT: Do NOT assume this means "new to this view" and apply +1.
          // Otherwise, any SSE update (tags/assignment/follow-up/etc) for a candidate that already exists
          // server-side but is simply not in the current page will incorrectly increase counts and inject a card.
          //
          // Only apply deltas / add SSE-only candidates when we have a strong membership-change signal:
          // - Status actually changed (previousStatus from SSE/tracking differs)
          // - Archive/unarchive toggled membership (handled above via previousIsDeletedFromSSE)
          // - Candidate was created after the last API result on this client (best-effort heuristic)
          const prevStatusForDelta =
            previousStatusFromSSEPayload ||
            prevStatusFromSSETracking ||
            newStatus;
          const statusActuallyChanged = prevStatusForDelta !== newStatus;
          const isNewSinceApi = isCreatedAfterLastApiResult(
            normalized as unknown as Candidate,
          );

          // Handle filter membership "invert/outgoing" for unseen candidates when we can compare before vs after.
          // This is needed for filters like assigned/notAssigned/withRemarks/withoutRemarks/toFollowUp where
          // membership can change without a lane/status change.
          if (
            filtersActive &&
            candidateBecameVisibleForFilter(
              mergedForFilter as unknown as Candidate,
              viewFilter,
              passesFilterBeforeEffective,
              previousSnapshot,
            )
          ) {
            const laneForDelta = getLaneName(previousSnapshot) || newStatus;
            const eventKey = `${normalized._id}:filterMembership:${String(passesFilterBeforeEffective)}->${String(passesFilter)}:${laneForDelta}:${currentJobId}`;
            if (!appliedStatusEvents.has(eventKey)) {
              appliedStatusEvents.add(eventKey);
              if (passesFilter === true) {
                // } else if (!isActorDeletedCandidateId(normalized._id)) {
                // markMovedOut(laneForDelta, normalized._id);
              }
            }
            if (passesFilter === true) {
              candidateMap.set(
                normalized._id,
                mergedForFilter as unknown as NormalizedCandidate,
              );
            }
            previousStatusByRef.current.set(normalized._id, newStatus);
            previousCandidateSnapshotByIdRef.current.set(
              normalized._id,
              mergedForFilter as unknown as Candidate,
            );
            return;
          }

          // Archived filter: when candidate becomes archived (isDeleted true) and Client B has archived filter,
          // add to map and +1 even if passesFilterBeforeEffective is undefined (e.g. backend didn't send previousIsDeleted, or candidate was never loaded).
          if (
            filtersActive &&
            viewFilter?.archived === true &&
            passesFilter === true &&
            (mergedForFilter as unknown as Candidate).isDeleted === true
          ) {
            const eventKey = `${normalized._id}:archivedVisible:${newStatus}:${currentJobId}`;
            if (!appliedStatusEvents.has(eventKey)) {
              appliedStatusEvents.add(eventKey);
            }
            candidateMap.set(
              normalized._id,
              mergedForFilter as unknown as NormalizedCandidate,
            );
            previousCandidateSnapshotByIdRef.current.set(
              normalized._id,
              mergedForFilter as unknown as Candidate,
            );
            return;
          }

          if (
            filtersActive &&
            passesFilter &&
            didAssignmentFilterMembershipFlip(
              viewFilter,
              previousSnapshot,
              mergedForFilter as unknown as Candidate,
            )
          ) {
            candidateMap.set(
              normalized._id,
              mergedForFilter as unknown as NormalizedCandidate,
            );
            previousStatusByRef.current.set(normalized._id, newStatus);
            previousCandidateSnapshotByIdRef.current.set(
              normalized._id,
              mergedForFilter as unknown as Candidate,
            );
            return;
          }

          if (statusActuallyChanged) {
            const eventKey = `${normalized._id}:${prevStatusForDelta}:${newStatus}:${currentJobId}`;
            if (!appliedStatusEvents.has(eventKey)) {
              appliedStatusEvents.add(eventKey);
              // Apply SSE deltas for all clients (including actor tab) so status-move counts
              // update even when actor-side refetch lags or returns stale lane totals.
              markMovedOut(prevStatusForDelta, normalized._id);
            }
            candidateMap.set(normalized._id, normalized);
            previousStatusByRef.current.set(normalized._id, newStatus);
            previousCandidateSnapshotByIdRef.current.set(
              normalized._id,
              mergedForFilter as unknown as Candidate,
            );
            return;
          }

          if (isNewSinceApi) {
            const eventKey = `${normalized._id}:createdAfterApi:${newStatus}:${currentJobId}`;
            if (!appliedStatusEvents.has(eventKey)) {
              appliedStatusEvents.add(eventKey);
            }
            candidateMap.set(normalized._id, normalized);
            previousStatusByRef.current.set(normalized._id, newStatus);
            previousCandidateSnapshotByIdRef.current.set(
              normalized._id,
              mergedForFilter as unknown as Candidate,
            );
            return;
          }

          if (
            passesFilter &&
            previousIsDeletedFromSSE === true &&
            (mergedForFilter as unknown as Candidate).isDeleted !== true
          ) {
            const eventKey = `${normalized._id}:unarchived:${newStatus}:${currentJobId}`;
            if (!appliedStatusEvents.has(eventKey)) {
              appliedStatusEvents.add(eventKey);
            }
            candidateMap.set(
              normalized._id,
              mergedForFilter as unknown as NormalizedCandidate,
            );
            previousStatusByRef.current.set(normalized._id, newStatus);
            previousCandidateSnapshotByIdRef.current.set(
              normalized._id,
              mergedForFilter as unknown as Candidate,
            );
            return;
          }

          // Otherwise: ignore SSE updates for "unseen" candidates (they exist, but are not on this client's page),
          // and do not mutate counts. We still remember last-known status for future status-change deltas.
          previousStatusByRef.current.set(normalized._id, newStatus);
          previousCandidateSnapshotByIdRef.current.set(
            normalized._id,
            mergedForFilter as unknown as Candidate,
          );

          // Do not refetch for unknown filter membership; rely on backend sending filter-relevant
          // fields (remarksCount, assignment, followUp, etc.) so we can compute passesFilter without refetch.
          if (filtersActive && passesFilterBeforeEffective === undefined) {
            // Leave candidate in previousStatusByRef / previousCandidateSnapshotByIdRef for future deltas.
          }
        }
      });
    }

    // 3. Remove deleted candidates and apply lane deltas (once per candidate id — dedupe in case of duplicate SSE or entries)
    const removedIds: string[] = [];
    const removedIdsApplied = new Set<string>();
    const KNOWN_LANES = new Set([
      'applied',
      'screening',
      'shortlisted',
      'processing',
      'accepted',
      'rejected',
    ]);
    (removedCandidates ?? []).forEach((r) => {
      if (removedIdsApplied.has(r.id)) return;
      removedIdsApplied.add(r.id);
      const lane = KNOWN_LANES.has((r.status ?? '').toLowerCase())
        ? (r.status ?? 'applied').toLowerCase()
        : 'applied';

      // Actor (Client A): remove from map + markMovedOut so card disappears; do NOT apply -1 (refetch provides count).
      // if (isActorDeletedCandidateId(r.id)) {
      //   candidateMap.delete(r.id);
      //   removedIds.push(r.id);
      //   markMovedOut(lane, r.id);
      //   return;
      // }

      // Client B has archived filter: treat hard-deleted candidate as "now in archived view" — show in UI and +1 count.
      if (viewFilter?.archived === true && r.candidate != null) {
        const laneName = (r.status ?? 'applied').toLowerCase();
        const asArchived = {
          ...r.candidate,
          _id: r.id,
          isDeleted: true,
          status: laneName,
        } as Candidate;
        const normalizedArchived =
          normalizeCandidate(asArchived) ??
          (asArchived as unknown as NormalizedCandidate);
        candidateMap.set(r.id, normalizedArchived);
        removedIds.push(r.id); // still track as processed for removedIds
        return;
      }

      // Default: remove from map
      candidateMap.delete(r.id);
      removedIds.push(r.id);
      markMovedOut(lane, r.id);
    });

    const list = Array.from(candidateMap.values()) as unknown as Candidate[];

    const movedOutSnapshot: Record<string, string[]> = Object.fromEntries(
      Object.entries(movedOutByLaneRef.current).map(([lane, set]) => [
        lane,
        Array.from(set),
      ]),
    );

    return {
      candidates: list,
      movedOutByLane: movedOutSnapshot,
    };
  }, [
    removedSig,
    jobId,
    viewState?.filter,
    candidatesFromQueryEffective?.lanes,
    candidatesFromQueryEffective?.meta,
    sseCandidates,
    removedCandidates,
  ]);

  // Keep ref in sync with current status for markMovedOut / filter transitions on paginated lanes.
  useEffect(() => {
    const map = previousStatusByRef.current;
    // Update/add statuses for candidates currently in normalizedCandidates
    normalizedCandidates.forEach((c) => {
      const s = (c as { status?: string }).status;
      if (s && typeof s === 'string') {
        map.set(c._id, s.toLowerCase());
      }
    });
  }, [normalizedCandidates, jobId]);

  return {
    candidates: normalizedCandidates,
    isLoading: enabled ? isCandidatesLoading : false,
    refetch,
    sseLanes: enabled ? sseLanes : undefined,
    candidatesFromQuery: candidatesFromQueryEffective,
    countInvalidationSig,
    filterListInvalidationSig,
    movedOutByLane,
    clients,
    isConnected,
  };
}
