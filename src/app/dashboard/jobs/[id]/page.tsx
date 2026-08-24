'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  useFetchJobByIdQuery,
  useUpdateJobMutation,
} from '@/lib/features/job/jobApi';
import {
  useGetJobLaneConfigQuery,
} from '@/lib/features/checklist/checklistApi';
import { Candidate, CandidateColumn } from '@/types/candidate';
import { useGetJobLanesQuery } from '@/lib/features/lane/laneApi';
import { NoDataFound } from '@/app/not-found';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { clearSelectedCandidates } from '@/lib/redux/selectedCandidatesSlice';
import logger from '@/lib/logger';
import type { BulkReasonRequestPayload } from '@/components/unified-candidate-dialog/types';
import { initialCandidateColumns } from './data/initial-data';
import LoaderSkeleton from './components/Lanes/loader-skeleton';
import { useKanbanBoard } from './hooks/useKanbanBoard';
import { useDragToScroll } from './hooks/useDragToScroll';
import { useCandidate } from './hooks/useCandidate';
import { useNormalizedCandidates } from './hooks/useNormalizedCandidates';
import { useJobLaneCounts } from './hooks/useJobLaneCounts';
import { useCandidateState } from './hooks/useCandidateState';
import { useJobPageEffects } from './hooks/useJobPageEffects';
import { useClientSideChecklistValidation } from './hooks/useClientSideChecklistValidation';
import { useJobViewState } from './hooks/useJobViewState';
import { QuickSelectAndFilter } from './components/QuickSelectAndFilter';
import { JobPageHeader } from './components/JobPageHeader';
import { JobKanbanBoard } from './components/JobKanbanBoard';
import { JobCandidatesTable } from './components/Table/JobCandidatesTable';
import { JobPageDialogs } from './components/JobPageDialogs';
import { useBulkChecklistFlow } from './hooks/useBulkChecklistFlow';
import { stringifyBulkReasonPayload } from './components/Dialogs/bulk-reason-dialog';
import { ShareCandidateDialog } from './components/Dialogs/share-candidate-dialog';
import { getCandidateStatusLabel } from './utils/candidateAccessors';
import { hasActiveFilter } from './utils/candidateViewFilter';
import type { PendingStatusMove } from './types/pendingStatusMove';

interface FilterState {
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

export default function JobProgressPage() {
  const id = useParams()?.id as string;

  const [columns, setColumns] = useState<CandidateColumn[]>(
    initialCandidateColumns,
  );
  const [showArchived, setShowArchived] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | null>(null);

  // FIX: Storing imperative handles (functions) in a ref prevents React from incorrectly treating it as a state updater
  const tableRefetchRef = useRef<(() => Promise<unknown>) | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('jobViewMode') as
      | 'kanban'
      | 'table'
      | null;
    setViewMode(saved || 'kanban');
  }, []);

  useEffect(() => {
    if (viewMode) {
      localStorage.setItem('jobViewMode', viewMode);
    }
  }, [viewMode]);

  const [isConfirmLaneDeleteOpen, setIsConfirmLaneDeleteOpen] = useState(false);
  const [laneToEdit, setLaneToEdit] = useState<string | null>(null);
  const [initialLaneToEdit, setInitialLaneToEdit] = useState<string | null>(
    null,
  );
  const [isChecklistConfigOpen, setIsChecklistConfigOpen] = useState(false);
  const [checklistConfigLane, setChecklistConfigLane] = useState<{
    laneId: string;
    laneName: string;
    initialTab?: 'incoming' | 'outgoing';
  } | null>(null);

  // Lane-specific refetch state (status/drag = reset to page 1; other actions = refetch current page only)
  const [laneToRefetch, setLaneToRefetch] = useState<
    | {
      laneId: string;
      candidateId?: string;
      updatedCandidate?: Candidate;
      timestamp?: number;
      refetchCurrentPageOnly?: boolean;
    }
    | Array<{
      laneId: string;
      candidateId?: string;
      updatedCandidate?: Candidate;
      timestamp?: number;
      refetchCurrentPageOnly?: boolean;
    }>
    | null
  >(null);
  // After migration+delete, set so the destination lane resets to page 1 and shows migrated candidates
  const [migrationDestinationLane, setMigrationDestinationLane] = useState<
    string | null
  >(null);
  /** Optimistic status move: when same client moves a candidate, we treat them as in the new lane so they are removed from source (avoids duplicate in both lanes until refetch/SSE). */
  const [pendingStatusMove, setPendingStatusMove] =
    useState<PendingStatusMove | null>(null);

  /** Candidates currently rendered in cursor lanes (includes page 2+ not on grouped API). */
  const kanbanVisibleCandidatesRef = useRef<Map<string, Candidate>>(new Map());

  // Handler for lane-specific refetch
  const handleLaneRefetch = useCallback(
    (
      laneIdOrLanes: string | string[],
      candidateId?: string,
      updatedCandidate?: Candidate,
    ) => {
      const timestamp = Date.now(); // Add timestamp to force effect re-execution

      logger.info('[page.tsx] handleLaneRefetch called', {
        lanes: laneIdOrLanes,
        candidateId,
        hasCandidateData: !!updatedCandidate,
        candidateName: updatedCandidate?.name,
        candidateTags: updatedCandidate?.tags?.map((t) => t.title),
        timestamp,
      });

      if (updatedCandidate?.status && candidateId) {
        setPendingStatusMove({
          candidateId,
          status: getCandidateStatusLabel(updatedCandidate).toLowerCase(),
          candidateSnapshot: updatedCandidate,
        });
      }
      if (Array.isArray(laneIdOrLanes)) {
        setLaneToRefetch(
          laneIdOrLanes.map((laneId) => ({
            laneId,
            candidateId,
            updatedCandidate,
            timestamp,
            refetchCurrentPageOnly: false,
          })),
        );
      } else {
        setLaneToRefetch({
          laneId: laneIdOrLanes,
          candidateId,
          updatedCandidate,
          timestamp,
          refetchCurrentPageOnly: false,
        });
      }
    },
    [],
  );

  /** Refetch only that lane's current page (tags, remark, follow-up, delete, edit, assign, evaluate). No reset to page 1. */
  const handleLaneRefetchCurrentPage = useCallback(
    (laneId: string, candidateId?: string, updatedCandidate?: Candidate) => {
      const timestamp = Date.now();
      setLaneToRefetch({
        laneId,
        candidateId,
        updatedCandidate,
        timestamp,
        refetchCurrentPageOnly: true,
      });
    },
    [],
  );

  // Handler for when lane refetch is complete
  const handleLaneRefetchDone = useCallback((laneId?: string) => {
    setLaneToRefetch((current) => {
      if (!current) return null;
      if (Array.isArray(current)) {
        // Remove the completed lane from the array
        const remaining = laneId
          ? current.filter((item) => item.laneId !== laneId)
          : [];
        return remaining.length > 0 ? remaining : null;
      }
      // Single lane refetch completed
      return null;
    });
  }, []);

  // Handler for configuring checklist
  const handleConfigureChecklist = useCallback(
    (
      laneId: string,
      laneName: string,
      initialTab?: 'incoming' | 'outgoing',
    ) => {
      setChecklistConfigLane({ laneId, laneName, initialTab });
      setIsChecklistConfigOpen(true);
    },
    [],
  );

  const [_filterConditions, setFilterConditions] = useState<FilterState | null>(
    null,
  );
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth || {});

  const onUnifiedRemarkClose = useCallback(() => {
    dispatch(clearSelectedCandidates());
  }, [dispatch]);

  const {
    ref: scrollRef,
    element: scrollElement,
    setIsDndDragging,
    isDragging,
  } = useDragToScroll<HTMLDivElement>();

  const {
    data: job,
    isLoading: isJobLoading,
    error: jobError,
  } = useFetchJobByIdQuery(id as string);


  // Temporary state for SSE integration (will be replaced by useCandidateState)
  const [tempSelectedCandidate, setTempSelectedCandidate] =
    useState<Candidate | null>(null);

  // View state (filter + sort) from localStorage; passed as query params to candidates API
  const { viewState, setViewState, setLaneSort } = useJobViewState(id);

  // Bump when filter/sort is applied or cleared so all lanes reset to page 1 and scroll to start
  const [resetAllLanesToPage1Key, setResetAllLanesToPage1Key] = useState(0);
  useEffect(() => {
    if (resetAllLanesToPage1Key === 0) return;
    scrollElement?.scrollTo({ left: 0, behavior: 'smooth' });
  }, [resetAllLanesToPage1Key, scrollElement]);

  // Use normalized candidates hook (replaces manual merging)
  const {
    candidates: normalizedCandidates,
    isLoading: isCandidatesLoading,
    refetch: refetchKanban,
    sseLanes: updatedLanes,
    candidatesFromQuery,
    countInvalidationSig,
    filterListInvalidationSig,
    movedOutByLane,
  } = useNormalizedCandidates({
    jobId: id,
    setSelectedCandidate: setTempSelectedCandidate,
    selectedCandidate: tempSelectedCandidate,
    viewState,
    enabled: viewMode === 'kanban',
  });

  const { laneCountsByKey, countsMeta, refetchCounts } = useJobLaneCounts({
    jobId: id,
    viewState,
    enabled: viewMode === 'kanban',
    countInvalidationSig,
  });

  const FILTER_LIST_REFETCH_DEBOUNCE_MS = 400;
  const prevFilterListSigRef = useRef(filterListInvalidationSig);
  const prevCountInvalidationSigRef = useRef(countInvalidationSig);
  useEffect(() => {
    if (!hasActiveFilter(viewState?.filter)) return;
    if (
      !filterListInvalidationSig ||
      filterListInvalidationSig === prevFilterListSigRef.current
    ) {
      return;
    }
    prevFilterListSigRef.current = filterListInvalidationSig;
    const timer = setTimeout(() => {
      void Promise.all([refetchKanban(), refetchCounts()]);
    }, FILTER_LIST_REFETCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [
    filterListInvalidationSig,
    viewState?.filter,
    refetchKanban,
    refetchCounts,
  ]);

  // Status moves (incl. drag) under an active filter: grouped API is the card source in strictApiOnly mode.
  useEffect(() => {
    if (!hasActiveFilter(viewState?.filter)) return;
    if (
      !countInvalidationSig ||
      countInvalidationSig === prevCountInvalidationSigRef.current
    ) {
      return;
    }
    prevCountInvalidationSigRef.current = countInvalidationSig;
    const timer = setTimeout(() => {
      void Promise.all([refetchKanban(), refetchCounts()]);
    }, FILTER_LIST_REFETCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [countInvalidationSig, viewState?.filter, refetchKanban, refetchCounts]);

  const refetchJobMembership = useCallback(
    async (opts: { cards?: boolean; counts?: boolean } = {}) => {
      const refetchCards = opts.cards !== false;
      const refetchCountsOnly = opts.counts !== false;
      const tasks: Promise<unknown>[] = [];
      if (refetchCards) tasks.push(refetchKanban());
      if (refetchCountsOnly) tasks.push(refetchCounts());
      if (tasks.length > 0) await Promise.all(tasks);
    },
    [refetchKanban, refetchCounts],
  );

  const handleCandidatesRefetch = useCallback(() => {
    void refetchJobMembership();
  }, [refetchJobMembership]);

  const refetchCurrentView = useCallback(async () => {
    // FIX: Using `.current` properly queries the imperative callback saved in our ref
    if (viewMode === 'table' && tableRefetchRef.current) {
      await tableRefetchRef.current();
      return;
    }
    if (viewMode === 'kanban') {
      await refetchJobMembership();
    }
  }, [viewMode, refetchJobMembership]);

  const handleBulkReasonDialogSuccess = useCallback(() => {
    setResetAllLanesToPage1Key((k) => k + 1);
    void refetchJobMembership();
  }, [refetchJobMembership]);

  // Use candidate state hook (consolidates UI state)
  const {
    selectedCandidate,
    setSelectedCandidate,
    isDetailsOpen,
    setIsDetailsOpen,
    openRemarksFor,
    setOpenRemarksFor,
    openCandidateDetails,
    isAssigning,
    setIsAssigning,
  } = useCandidateState({
    jobId: id,
    candidates: normalizedCandidates,
  });

  // Centralized candidate update handler: status change → rely on mutation invalidation (job-level refetch only); other edits → refetch current lane's current page
  // Avoids duplicate requests: job-level fetch already updates all lanes via useJobPageEffects; no need for per-lane fetches on status change.
  const resolveCandidateForDrag = useCallback(
    (candidateId: string): Candidate | undefined => {
      const fromLane = kanbanVisibleCandidatesRef.current.get(candidateId);
      if (fromLane) return fromLane;
      const fromMerged = normalizedCandidates.find((c) => c._id === candidateId);
      if (fromMerged) return fromMerged;
      for (const col of columns) {
        const fromColumn = col.candidates.find((c) => c._id === candidateId);
        if (fromColumn) return fromColumn;
      }
      return undefined;
    },
    [normalizedCandidates, columns],
  );

  const handlePendingStatusMove = useCallback(
    (
      candidateId: string,
      status: string,
      candidateSnapshot?: Candidate,
    ) => {
      setPendingStatusMove({
        candidateId,
        status: status.toLowerCase(),
        ...(candidateSnapshot ? { candidateSnapshot } : {}),
      });
    },
    [],
  );

  const handleCandidateUpdate = useCallback(
    (updatedCandidate: Candidate) => {
      if (!updatedCandidate?.status || !updatedCandidate._id) {
        logger.error(
          '[page.tsx] handleCandidateUpdate - missing required fields',
          {
            hasCandidate: !!updatedCandidate,
            hasStatus: !!updatedCandidate?.status,
            hasId: !!updatedCandidate?._id,
          },
        );
        return;
      }

      const statusChanged =
        selectedCandidate?.status !== updatedCandidate.status;

      if (statusChanged) {
        // Set pending status move so UI shows candidate in new lane; job-level refetch from mutation invalidation updates columns.
        setPendingStatusMove({
          candidateId: updatedCandidate._id,
          status: getCandidateStatusLabel(updatedCandidate).toLowerCase(),
          candidateSnapshot: updatedCandidate,
        });

        // When job is configured to prompt for status change reasons,
        // open the unified remarks dialog for this single candidate as well
        // (same UX as bulk status update).
        if (job?.promptForStatusChangeReason) {
          setOpenRemarksFor(updatedCandidate._id);
        }
      } else {
        handleLaneRefetchCurrentPage(
          updatedCandidate.status,
          updatedCandidate._id,
          updatedCandidate,
        );
      }
    },
    [
      handleLaneRefetchCurrentPage,
      selectedCandidate?.status,
      job?.promptForStatusChangeReason,
      setOpenRemarksFor,
    ],
  );

  // Get SSE lanes separately (still needed for lane updates)
  // const { lanes: updatedLanes } = useSSE(
  //   setSelectedCandidate,
  //   selectedCandidate,
  //   id,
  // );

  const [updateJob, { isLoading }] = useUpdateJobMutation();
  // Use job-specific lanes API (GET /api/jobs/[id]/lanes)
  const { data: jobLanesData, isLoading: isJobLanesLoading } =
    useGetJobLanesQuery(id as string, { skip: !id });

  // Extract lane names from jobLanesData (JobLanesResponse)
  // jobLanesData.lanes is Array<{name, _id}>
  const lanes = jobLanesData?.lanes?.map((lane) => lane.name) || [];
  const isLanesLoading = isJobLanesLoading;

  // Fetch job lane configuration for checklist indicators
  const { data: jobLaneConfig } = useGetJobLaneConfigQuery(id as string, {
    skip: !id,
  });

  const [droppedFileData, setDroppedFileData] = useState<File | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLaneEditOpen, setIsLaneEditOpen] = useState(false);
  const [isFileOver, setIsFileOver] = useState(false);
  const [isCustomFieldsOpen, setIsCustomFieldsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);
  const [isPromptConfirmOpen, setIsPromptConfirmOpen] = useState(false);
  const [pendingPromptValue, setPendingPromptValue] = useState(false);
  const [pendingStatusAfterChecklist, setPendingStatusAfterChecklist] = useState<{
    candidateId: string;
    newStatus: string;
  } | null>(null);
  const [pendingIncomingChecklistAfterStatus, setPendingIncomingChecklistAfterStatus] =
    useState<string | null>(null);

  // State to store candidates from the table view to make them available to dialogs
  const [tableCandidates, setTableCandidates] = useState<Candidate[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDownloadProfileOpen, setIsDownloadProfileOpen] = useState(false);
  const [downloadProfileCandidate, setDownloadProfileCandidate] = useState<Candidate | null>(null);

  // Consolidated candidate list for dialogs
  const dialogCandidates = useMemo(() => {
    return viewMode === 'table' ? tableCandidates : normalizedCandidates;
  }, [viewMode, tableCandidates, normalizedCandidates]);

  const {
    bulkStatusQueue,
    onBulkStatusRequiresChecklist,
    onApplyToRemaining,
    onBulkQueueStepComplete,
    onBulkChecklistCancel,
  } = useBulkChecklistFlow({
    setOpenRemarksFor,
    setPendingStatusAfterChecklist,
    refetch: refetchCurrentView,
  });

  const { validateCompleteMovement: validateCompleteMovementForDialog } =
    useClientSideChecklistValidation(jobLaneConfig, user?.role, {
      skipAlreadyCompletedCheck: true,
    });

  const onValidateStatusChange = useCallback(
    (candidate: Candidate, newStatus: string) => {
      if (!validateCompleteMovementForDialog || candidate.status === newStatus)
        return null;
      const result = validateCompleteMovementForDialog(
        candidate,
        candidate.status,
        newStatus,
      );
      if (!result.validation.requiresChecklist) return null;
      const currentLane = candidate.status;
      const targetLane = newStatus;
      const validationInfo = {
        candidateId: candidate._id,
        currentLane,
        targetLane,
        checklist:
          'checklist' in result.validation ? result.validation.checklist : null,
        isMandatory: result.validation.isMandatory,
        checklistType: result.type,
      };
      if (
        'pendingValidation' in result &&
        result.pendingValidation?.requiresChecklist &&
        'pendingType' in result &&
        result.pendingType
      ) {
        const incomingInfo = JSON.stringify({
          candidateId: candidate._id,
          currentLane,
          targetLane,
          checklist:
            'checklist' in result.pendingValidation!
              ? result.pendingValidation!.checklist
              : null,
          isMandatory: result.pendingValidation!.isMandatory,
          checklistType: result.pendingType,
        });
        return {
          requiresChecklist: true,
          isMandatory: result.validation.isMandatory,
          validationSteps: [
            {
              validationInfo: JSON.stringify(validationInfo),
              newStatusAfterStep: currentLane,
            },
            { validationInfo: incomingInfo, newStatusAfterStep: targetLane },
          ],
        };
      }
      return {
        requiresChecklist: true,
        validationInfo: JSON.stringify(validationInfo),
        isMandatory: result.validation.isMandatory,
      };
    },
    [validateCompleteMovementForDialog],
  );

  const onOpenChecklistAfterSave = useCallback(
    (validationInfo: string) => {
      // Checklist opened after status change save – mark statusAlreadyApplied
      // so useChecklistSubmit does not issue a second status PUT.
      try {
        const parsed = JSON.parse(validationInfo) as Record<string, unknown>;
        const withFlag = { ...parsed, statusAlreadyApplied: true };
        setOpenRemarksFor(JSON.stringify(withFlag));
      } catch {
        setOpenRemarksFor(validationInfo);
      }
    },
    [setOpenRemarksFor],
  );

  const onBulkStatusRequiresReason = useCallback(
    (payload: {
      candidateIds: string[];
      newStatus: string;
      operations?: import(
      '@/app/api/candidates/bulk-update/types'
      ).BulkUpdateOperationParams[];
    }) => {
      setOpenRemarksFor(
        stringifyBulkReasonPayload({
          ...payload,
          statusAlreadyApplied: false,
        }),
      );
    },
    [setOpenRemarksFor],
  );

  const onDeferStatusToChecklist = useCallback(
    (
      validationInfo: string,
      newStatus: string,
      nextChecklistValidationInfo?: string,
    ) => {
      try {
        const parsed = JSON.parse(validationInfo) as {
          candidateId: string;
          checklistType?: string;
        };
        const hasNext = !!nextChecklistValidationInfo?.trim();
        let toOpenNow: string = validationInfo;
        let toStoreForAfter: string | null = null;
        if (hasNext && nextChecklistValidationInfo) {
          try {
            const nextParsed = JSON.parse(nextChecklistValidationInfo) as {
              checklistType?: string;
            };
            const firstOutgoing = (parsed.checklistType ?? '') === 'outgoing';
            const nextIncoming =
              (nextParsed.checklistType ?? '') === 'incoming';
            const nextOutgoing =
              (nextParsed.checklistType ?? '') === 'outgoing';
            if (firstOutgoing && nextIncoming) {
              toOpenNow = validationInfo;
              toStoreForAfter = nextChecklistValidationInfo;
            } else if (
              (parsed.checklistType ?? '') === 'incoming' &&
              nextOutgoing
            ) {
              toOpenNow = nextChecklistValidationInfo;
              toStoreForAfter = validationInfo;
            } else if (nextOutgoing && !firstOutgoing) {
              toOpenNow = nextChecklistValidationInfo;
              toStoreForAfter = validationInfo;
            } else {
              const firstIsOutgoing = (parsed.checklistType ?? '') === 'outgoing';
              const nextIsOutgoing = (nextParsed.checklistType ?? '') === 'outgoing';
              if (nextIsOutgoing && !firstIsOutgoing) {
                toOpenNow = nextChecklistValidationInfo;
                toStoreForAfter = validationInfo;
              } else {
                toOpenNow = validationInfo;
                toStoreForAfter = nextChecklistValidationInfo;
              }
            }
          } catch {
            toOpenNow = validationInfo;
            toStoreForAfter = nextChecklistValidationInfo;
          }
        }
        const withFlag = {
          ...(JSON.parse(toOpenNow) as Record<string, unknown>),
          statusDeferredFromUnified: true,
        };
        const openingType = (withFlag as { checklistType?: string }).checklistType ?? '';
        if (
          openingType === 'incoming' &&
          toStoreForAfter
        ) {
          try {
            const other = JSON.parse(toStoreForAfter) as { checklistType?: string };
            if ((other.checklistType ?? '') === 'outgoing') {
              const swap = toOpenNow;
              toOpenNow = toStoreForAfter;
              toStoreForAfter = swap;
              Object.assign(withFlag, JSON.parse(toOpenNow) as Record<string, unknown>, {
                statusDeferredFromUnified: true,
              });
            }
          } catch {
            // ignore
          }
        }
        setOpenRemarksFor(JSON.stringify(withFlag));
        const candidateId = (parsed.candidateId ||
          (JSON.parse(toOpenNow) as { candidateId?: string }).candidateId) as string;
        setPendingStatusAfterChecklist({
          candidateId,
          newStatus,
        });
        if (toStoreForAfter) {
          try {
            const nextParsed = JSON.parse(toStoreForAfter) as Record<string, unknown>;
            setPendingIncomingChecklistAfterStatus(
              JSON.stringify({
                ...nextParsed,
                statusAlreadyApplied: true,
              }),
            );
          } catch {
            setPendingIncomingChecklistAfterStatus(null);
          }
        } else {
          setPendingIncomingChecklistAfterStatus(null);
        }
      } catch {
        setOpenRemarksFor(validationInfo);
        setPendingStatusAfterChecklist(null);
        setPendingIncomingChecklistAfterStatus(null);
      }
    },
    [setOpenRemarksFor, setPendingStatusAfterChecklist],
  );



  const {
    handleAddLane,
    handleDeleteLane,
    handleEditLaneClick,
    handleEditLane,
    handleConfirmDeleteLane,
    handleMigrateAndDeleteLane,
    migrationLanes,
    isMigrationDialogOpen,
    setIsMigrationDialogOpen,
    laneToDelete,
    setLaneToDelete,
  } = useKanbanBoard({
    columns,
    setColumns,
    jobId: id,
    setIsConfirmLaneDeleteOpen,
    setIsLaneEditOpen,
    refetch: refetchKanban, // Real refetch so migration+delete updates lanes (was dummy before)
    onMigrationSuccess: (destinationLaneId) => {
      setMigrationDestinationLane(destinationLaneId);
      setResetAllLanesToPage1Key((k) => k + 1);
    },
  });

  const {
    onDragEnd,
    onBeforeDragStart,
    handleFileDrop,
    handleDeleteClick,
    handleDeleteConfirm,
    pendingMoves,
    cancelPendingMove,
    handleChecklistComplete,
    bulkDragState,
    bulkDragTwoPhase,
    onBulkDragTwoPhaseSubmit,
  } = useCandidate({
    columns,
    setColumns,
    setOpenRemarksFor,
    setIsDialogOpen,
    setDroppedFileData,
    setCandidateToDelete,
    setIsDeleteDialogOpen,
    setSelectedCandidate,
    selectedCandidate,
    refetch: refetchKanban,
    candidateToDelete,
    jobLaneConfig,
    job,
    pendingStatusAfterChecklist,
    setPendingStatusAfterChecklist,
    pendingIncomingChecklistAfterStatus,
    setPendingIncomingChecklistAfterStatus,
    bulkStatusQueue,
    onBulkQueueStepComplete,
    onLaneRefetch: handleLaneRefetch,
    onLaneRefetchCurrentPage: handleLaneRefetchCurrentPage,
    resolveCandidateForDrag,
    onPendingStatusMove: handlePendingStatusMove,
    filtersActive: hasActiveFilter(viewState?.filter),
  });

  // Use normalized candidates (already merged and normalized)
  const mergedCandidates = normalizedCandidates;

  // Clear optimistic status move when mergedCandidates reflects the move (refetch or SSE)
  useEffect(() => {
    if (!pendingStatusMove || !mergedCandidates?.length) return;
    const hasMoved = mergedCandidates.some(
      (c) =>
        c._id === pendingStatusMove.candidateId &&
        getCandidateStatusLabel(c).toLowerCase() === pendingStatusMove.status,
    );
    if (hasMoved) setPendingStatusMove(null);
  }, [pendingStatusMove, mergedCandidates]);

  // Extract laneCounts and laneMetadata from candidatesFromQuery
  const laneCounts = candidatesFromQuery?.lanes;
  const laneMetadata = candidatesFromQuery?.meta;

  const { totalCandidatesForFilter, totalCandidatesFilteredForFilter } =
    useMemo(() => {
      return {
        totalCandidatesForFilter:
          countsMeta?.totalCandidates ?? laneMetadata?.totalCandidates ?? 0,
        totalCandidatesFilteredForFilter:
          countsMeta?.totalCandidatesFiltered ??
          laneMetadata?.totalCandidatesFiltered ??
          0,
      };
    }, [
      countsMeta?.totalCandidates,
      countsMeta?.totalCandidatesFiltered,
      laneMetadata?.totalCandidates,
      laneMetadata?.totalCandidatesFiltered,
    ]);

  // Consolidate all side effects into a single hook
  useJobPageEffects({
    tempSelectedCandidate,
    selectedCandidate,
    setSelectedCandidate,
    viewState,
    pendingStatusMove,
    laneCounts,
    mergedCandidates,
    serverLaneCounts: laneCountsByKey,
    movedOutByLane,
    laneMetadata,
    updatedLanes,
    jobLanes: jobLanesData,
    lanes: { lanes },
    refetch: refetchKanban,
    setColumns,
    isDialogOpen,
    setDroppedFileData,
    isLaneEditOpen,
    laneToEdit,
    setLaneToEdit,
    initialLaneToEdit,
    setInitialLaneToEdit,
  });

  // Fallback UI
  if (!viewMode) {
    return <LoaderSkeleton />;
  }

  if (
    isJobLoading ||
    (viewMode === 'kanban' && isCandidatesLoading) ||
    isLanesLoading ||
    !lanes
  ) {
    return <LoaderSkeleton />;
  }

  if (jobError) {
    return <NoDataFound name="Job" />;
  }

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ width: '100%' }}
    >
      <JobPageHeader
        jobTitle={job?.title}
        userRole={user?.role}
        promptForStatusChangeReason={job?.promptForStatusChangeReason}
        isUpdatingJob={isLoading}
        onPromptChange={(checked) => {
          setPendingPromptValue(checked);
          setIsPromptConfirmOpen(true);
        }}
        onCustomFieldsOpen={() => setIsCustomFieldsOpen(true)}
        onAnalyticsOpen={() => setIsAnalyticsOpen(true)}
        onEmailSettingsOpen={() => setIsEmailSettingsOpen(true)}
        onAddLane={handleAddLane}
        jobId={id}
        isDialogOpen={isDialogOpen}
        onDialogOpenChange={setIsDialogOpen}
        droppedFileData={droppedFileData}
        view={viewMode}
        onViewChange={setViewMode}
      />

      {viewMode === 'kanban' && (
        <QuickSelectAndFilter
          currentJobId={id}
          candidates={mergedCandidates}
          onFilterChange={setFilterConditions}
          showArchived={showArchived}
          onShowArchivedChange={setShowArchived}
          onValidateStatusChange={onValidateStatusChange}
          onBulkStatusRequiresChecklist={onBulkStatusRequiresChecklist}
          onDeferStatusToChecklist={onDeferStatusToChecklist}
          onOpenChecklistAfterSave={onOpenChecklistAfterSave}
          jobFilters={viewState.filter}
          totalCandidates={totalCandidatesForFilter}
          totalCandidatesFiltered={totalCandidatesFilteredForFilter}
          onRefetch={handleCandidatesRefetch}
          onFilterPersist={(filter) => {
            setViewState({ filter });
            setResetAllLanesToPage1Key((k) => k + 1);
          }}
          onBulkStatusRequiresReason={
            job?.promptForStatusChangeReason ? onBulkStatusRequiresReason : undefined
          }
        />
      )}

      {viewMode === 'kanban' ? (
        <JobKanbanBoard
          columns={columns}
          scrollRef={scrollRef}
          isDragging={isDragging}
          setIsDndDragging={setIsDndDragging}
          onBeforeDragStart={onBeforeDragStart}
          onDragEnd={onDragEnd}
          bulkDragState={bulkDragState}
          isFileOver={isFileOver}
          setIsFileOver={setIsFileOver}
          handleFileDrop={handleFileDrop}
          handleDeleteLane={handleDeleteLane}
          handleEditLane={handleEditLaneClick}
          setLaneToDelete={setLaneToDelete}
          setLaneToEdit={setLaneToEdit}
          refetch={refetchKanban}
          selectedCandidate={selectedCandidate}
          setSelectedCandidate={setSelectedCandidate}
          isDetailsOpen={isDetailsOpen}
          setIsDetailsOpen={setIsDetailsOpen}
          openRemarksFor={openRemarksFor}
          setOpenRemarksFor={setOpenRemarksFor}
          handleDeleteClick={handleDeleteClick}
          onConfigureChecklist={handleConfigureChecklist}
          pendingMoves={pendingMoves}
          jobLaneConfig={jobLaneConfig}
          onValidateStatusChange={onValidateStatusChange}
          onDeferStatusToChecklist={onDeferStatusToChecklist}
          onOpenChecklistAfterSave={onOpenChecklistAfterSave}
          laneMapping={laneMetadata?.laneMapping}
          kanbanVisibleCandidatesRef={kanbanVisibleCandidatesRef}
          jobId={id}
          laneToRefetch={laneToRefetch}
          onLaneRefetchDone={handleLaneRefetchDone}
          resetLaneToPage1Id={migrationDestinationLane}
          onResetLaneDone={(laneId) => {
            if (migrationDestinationLane === laneId)
              setMigrationDestinationLane(null);
          }}
          onLaneRefetch={handleLaneRefetch}
          onLaneRefetchCurrentPage={handleLaneRefetchCurrentPage}
          viewState={viewState}
          setLaneSort={setLaneSort}
          resetAllLanesToPage1Key={resetAllLanesToPage1Key}
        />
      ) : (
        <div className="flex-1 overflow-hidden px-4">
          <JobCandidatesTable
            onCandidateClick={(c) => {
              setSelectedCandidate(c);
              setIsDetailsOpen(true);
            }}
            onActionClick={(c, action) => {
              setSelectedCandidate(c);
              setOpenRemarksFor(JSON.stringify({ candidateId: c._id, initialAction: action }));
            }}
            onEditClick={(c) => {
              setSelectedCandidate(c);
              setIsEditOpen(true);
            }}
            onArchiveClick={handleDeleteClick}
            onDownloadCV={(c) => {
              if (c.resume?.url) window.open(c.resume.url, '_blank');
            }}
            onDownloadProfile={(c) => {
              setDownloadProfileCandidate(c);
              setIsDownloadProfileOpen(true);
            }}
            onDataUpdate={(data) => {
              // FIX: Deferring to microtask prevents child-component synchronous render update violations
              queueMicrotask(() => {
                setTableCandidates((prev) => prev === data ? prev : data);
              });
            }}
            onRefetchReady={(refetchFn) => {
              // FIX: Storing this imperative handle inside a ref instead of state safely escapes the rendering phase conflict
              tableRefetchRef.current = refetchFn;
            }}
          />
        </div>
      )}

      {job && (
        <JobPageDialogs
          selectedCandidate={selectedCandidate}
          isDetailsOpen={isDetailsOpen}
          setIsDetailsOpen={setIsDetailsOpen}
          isEditOpen={isEditOpen}
          setIsEditOpen={setIsEditOpen}
          handleCandidateUpdate={handleCandidateUpdate}
          isDeleteDialogOpen={isDeleteDialogOpen}
          setIsDeleteDialogOpen={setIsDeleteDialogOpen}
          handleDeleteConfirm={handleDeleteConfirm}
          handleDeleteClick={handleDeleteClick}
          candidateToDelete={candidateToDelete}
          isLaneEditOpen={isLaneEditOpen}
          setIsLaneEditOpen={setIsLaneEditOpen}
          laneToEdit={laneToEdit}
          initialLaneToEdit={initialLaneToEdit}
          setLaneToEdit={setLaneToEdit}
          handleEditLane={handleEditLane}
          isConfirmLaneDeleteOpen={isConfirmLaneDeleteOpen}
          setIsConfirmLaneDeleteOpen={setIsConfirmLaneDeleteOpen}
          laneToDelete={laneToDelete}
          handleConfirmDeleteLane={handleConfirmDeleteLane}
          isMigrationDialogOpen={isMigrationDialogOpen}
          setIsMigrationDialogOpen={setIsMigrationDialogOpen}
          migrationLanes={migrationLanes}
          handleMigrateAndDeleteLane={handleMigrateAndDeleteLane}
          isPromptConfirmOpen={isPromptConfirmOpen}
          setIsPromptConfirmOpen={setIsPromptConfirmOpen}
          pendingPromptValue={pendingPromptValue}
          updateJob={async (j) => {
            const result = await updateJob(j);
            if ('error' in result && result.error) {
              logger.error('Job update failed', {
                error: result.error,
                jobId: j._id,
              });
              throw result.error;
            }
          }}
          job={job}
          isCustomFieldsOpen={isCustomFieldsOpen}
          setIsCustomFieldsOpen={setIsCustomFieldsOpen}
          jobId={id}
          isAnalyticsOpen={isAnalyticsOpen}
          setIsAnalyticsOpen={setIsAnalyticsOpen}
          isEmailSettingsOpen={isEmailSettingsOpen}
          setIsEmailSettingsOpen={setIsEmailSettingsOpen}
          openRemarksFor={openRemarksFor}
          setOpenRemarksFor={setOpenRemarksFor}
          columns={viewMode === 'table' ? [] : columns}
          refetch={refetchCurrentView}
          handleChecklistComplete={handleChecklistComplete}
          cancelPendingMove={cancelPendingMove}
          checklistConfigLane={checklistConfigLane}
          isChecklistConfigOpen={isChecklistConfigOpen}
          setIsChecklistConfigOpen={setIsChecklistConfigOpen}
          mergedCandidates={dialogCandidates}
          isAssigning={isAssigning}
          setIsAssigning={setIsAssigning}
          onValidateStatusChange={onValidateStatusChange}
          onDeferStatusToChecklist={onDeferStatusToChecklist}
          onOpenChecklistAfterSave={onOpenChecklistAfterSave}
          bulkStatusQueue={bulkStatusQueue}
          bulkTotalCount={
            bulkDragTwoPhase
              ? bulkDragTwoPhase.candidateIds.length
              : (bulkStatusQueue?.length ?? 0)
          }
          onApplyToRemaining={
            bulkDragTwoPhase ? onBulkDragTwoPhaseSubmit : onApplyToRemaining
          }
          bulkDragTwoPhase={bulkDragTwoPhase}
          onBulkChecklistCancel={onBulkChecklistCancel}
          onLaneRefetch={handleLaneRefetch}
          onLaneRefetchCurrentPage={handleLaneRefetchCurrentPage}
          onUnifiedRemarkClose={onUnifiedRemarkClose}

          onBulkStatusRequiresReason={
            job?.promptForStatusChangeReason ? onBulkStatusRequiresReason : undefined
          }
          onBulkReasonDialogSuccess={handleBulkReasonDialogSuccess}
          onOpenCandidateDetailsDialog={openCandidateDetails}
        />
      )}

      {downloadProfileCandidate && (
        <ShareCandidateDialog
          open={isDownloadProfileOpen}
          onOpenChange={(open) => {
            setIsDownloadProfileOpen(open);
            if (!open) setDownloadProfileCandidate(null);
          }}
          candidate={downloadProfileCandidate}
        />
      )}
    </div>
  );
}