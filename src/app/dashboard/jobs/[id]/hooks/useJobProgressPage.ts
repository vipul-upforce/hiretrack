import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  useFetchJobByIdQuery,
  useUpdateJobMutation,
} from '@/lib/features/job/jobApi';
import { useFetchCandidatesQuery } from '@/lib/features/candidate/candidateApi';
import { useAppSelector } from '@/lib/redux/hooks';
import { useGetJobLanesQuery } from '@/lib/features/lane/laneApi';
import { useGetJobLaneConfigQuery } from '@/lib/features/checklist/checklistApi';
import { Candidate, CandidateColumn, CandidateStatus } from '@/types/candidate';
import { useSSE } from '@/hooks/useSSE';
// import {
//   Interviewer,
// } from '@/app/dashboard/calendar/types';
import { Interviewer } from '@/lib/features/user/userApi';
import { useJobViewState } from './useJobViewState';
import { initialCandidateColumns } from '../data/initial-data';
import { useKanbanBoard } from './useKanbanBoard';
import { useDragToScroll } from './useDragToScroll';
import { useCandidate } from './useCandidate';
import { isAssigned } from '../utils/candidateAccessors';

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

export const useJobProgressPage = () => {
  const id = useParams()?.id as string;
  const searchParams = useSearchParams();
  const router = useRouter();
  const candidateIdParam = searchParams?.get('candidateId');
  const { user } = useAppSelector((state) => state.auth || {});

  // State management
  const [columns, setColumns] = useState<CandidateColumn[]>(
    initialCandidateColumns,
  );
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [openRemarksFor, setOpenRemarksFor] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(
    null,
  );
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
  const [filterConditions, setFilterConditions] = useState<FilterState | null>(
    null,
  );
  const [droppedFileData, setDroppedFileData] = useState<File | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLaneEditOpen, setIsLaneEditOpen] = useState(false);
  const [isFileOver, setIsFileOver] = useState(false);
  const [isCustomFieldsOpen, setIsCustomFieldsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);
  const [isPromptConfirmOpen, setIsPromptConfirmOpen] = useState(false);
  const [pendingPromptValue, setPendingPromptValue] = useState(false);

  // Drag to scroll
  const {
    ref: scrollRef,
    setIsDndDragging,
    isDragging,
  } = useDragToScroll<HTMLDivElement>();

  // SSE for real-time updates
  const { candidates: sseCandidates, lanes: updatedLanes } = useSSE(
    setSelectedCandidate,
    selectedCandidate,
    id,
  );

  // API queries
  const {
    data: job,
    isLoading: isJobLoading,
    error: jobError,
  } = useFetchJobByIdQuery(id as string);

  const [promptForStatusChangeReason, setPromptForStatusChangeReason] =
    useState(job?.promptForStatusChangeReason || false);

  const { viewState } = useJobViewState(id);

  const queryArg = useMemo(() => {
    const rawFilter = viewState?.filter as Record<string, unknown> | undefined;
    const hasActiveFilter = Boolean(
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
    const defaultSortBy = 'tracking.createdAt';
    const defaultSortOrder = 'desc';
    return {
      jobId: id as string,
      filter: hasActiveFilter ? rawFilter : undefined,
      sortBy:
        viewState?.sortBy && viewState.sortBy !== defaultSortBy
          ? viewState.sortBy
          : undefined,
      sortOrder:
        viewState?.sortOrder && viewState.sortOrder !== defaultSortOrder
          ? viewState.sortOrder
          : undefined,
      laneSort:
        viewState?.laneSort && Object.keys(viewState.laneSort).length > 0
          ? viewState.laneSort
          : undefined,
    };
  }, [
    id,
    viewState?.filter,
    viewState?.sortBy,
    viewState?.sortOrder,
    viewState?.laneSort,
  ]);

  const {
    data: candidatesFromQuery,
    isLoading: isCandidatesLoading,
    refetch,
  } = useFetchCandidatesQuery(queryArg);

  const [updateJob, { isLoading }] = useUpdateJobMutation();

  // Use job-specific lanes API (GET /api/jobs/[id]/lanes)
  const { data: jobLanesData, isLoading: isJobLanesLoading } =
    useGetJobLanesQuery(id as string, { skip: !id });

  // Extract lane names from jobLanesData (JobLanesResponse)
  // jobLanesData.lanes is Array<{name, _id}>
  const lanes = jobLanesData?.lanes?.map((lane) => lane.name) || [];
  const isLanesLoading = isJobLanesLoading;

  const { data: jobLaneConfig } = useGetJobLaneConfigQuery(id as string, {
    skip: !id,
  });

  // Kanban board operations
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
    refetch,
  });

  // Candidate operations
  const {
    onDragEnd,
    handleFileDrop,
    handleDeleteClick,
    handleDeleteConfirm,
    pendingMoves,
    completePendingMove,
    cancelPendingMove,
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
    refetch,
    candidateToDelete,
    jobLaneConfig,
    job,
  });

  // Extract all candidates from the grouped lanes structure
  const allCandidatesFromQuery = useMemo(() => {
    if (!candidatesFromQuery?.lanes) {
      return [];
    }
    // Extract all candidates from all lanes
    const allCandidates: Candidate[] = [];
    Object.values(candidatesFromQuery.lanes).forEach((laneData) => {
      if (Array.isArray(laneData.candidates)) {
        allCandidates.push(...laneData.candidates);
      }
    });
    return allCandidates;
  }, [candidatesFromQuery]);

  // Merge candidates from query and SSE
  const mergedCandidates = useMemo(() => {
    const candidateMap = new Map<string, Candidate>(
      allCandidatesFromQuery.map((c) => [c._id, c]),
    );

    sseCandidates.forEach((sseCandidate) => {
      candidateMap.set(sseCandidate._id, sseCandidate);
    });

    return Array.from(candidateMap.values());
  }, [allCandidatesFromQuery, sseCandidates]);

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

  // Handle candidate details dialog close - clean up URL parameter
  const handleCandidateDialogClose = useCallback(
    (open: boolean) => {
      setIsDetailsOpen(open);
      if (!open && candidateIdParam) {
        const params = new URLSearchParams(searchParams?.toString());
        params.delete('candidateId');
        const newUrl = params.toString() ? `?${params.toString()}` : '';
        router.replace(`/dashboard/jobs/${id}${newUrl}`, { scroll: false });
      }
    },
    [candidateIdParam, searchParams, router, id],
  );

  // Handle prompt confirmation
  const handlePromptConfirm = useCallback(async () => {
    setPromptForStatusChangeReason(pendingPromptValue);
    try {
      await updateJob({
        ...job,
        promptForStatusChangeReason: pendingPromptValue,
      });
    } catch {
      setPromptForStatusChangeReason(!pendingPromptValue);
    }
    setIsPromptConfirmOpen(false);
  }, [pendingPromptValue, job, updateJob]);

  // Effect: Clean up dropped file data when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      setDroppedFileData(null);
    }
  }, [isDialogOpen]);

  // Effect: Handle candidateId URL parameter to auto-open candidate dialog
  useEffect(() => {
    if (candidateIdParam && allCandidatesFromQuery && !selectedCandidate) {
      const candidate = allCandidatesFromQuery.find(
        (c) => c._id === candidateIdParam,
      );
      if (candidate) {
        setSelectedCandidate(candidate);
        setIsDetailsOpen(true);
      }
    }
  }, [candidateIdParam, allCandidatesFromQuery, selectedCandidate]);

  // Effect: Process candidates and update columns
  // Use refs to prevent infinite loops from object/array dependencies
  const prevDepsRef = useRef<string>('');

  useEffect(() => {
    // Create a stable signature of dependencies to prevent infinite loops
    const depsSignature = JSON.stringify({
      mergedCandidatesLength: mergedCandidates.length,
      mergedCandidatesIds: mergedCandidates
        .map((c) => c._id)
        .sort()
        .join(','),
      lanesString: Array.isArray(lanes) ? lanes.join(',') : '',
      updatedLanesString: Array.isArray(updatedLanes)
        ? updatedLanes.join(',')
        : '',
      showArchived,
      filterConditionsString: filterConditions
        ? JSON.stringify(filterConditions)
        : '',
      allCandidatesLength: allCandidatesFromQuery.length,
      jobLanesString: jobLanesData?.lanes?.map((l) => l.name).join(',') || '',
    });

    // Skip if dependencies haven't actually changed
    if (depsSignature === prevDepsRef.current) {
      return;
    }
    prevDepsRef.current = depsSignature;

    if (allCandidatesFromQuery.length > 0 && lanes) {
      let currentCandidates = [...mergedCandidates];

      // Apply filter conditions if they exist
      if (filterConditions) {
        currentCandidates = currentCandidates.filter((candidate) => {
          // Apply text search
          if (filterConditions.search) {
            const searchLower = filterConditions.search.toLowerCase();
            const matchesSearch =
              candidate.name.toLowerCase().includes(searchLower) ||
              candidate.skills.some((skill) =>
                skill.toLowerCase().includes(searchLower),
              ) ||
              candidate.experience.toString().includes(searchLower) ||
              (candidate.assignment?.interviewerId as Interviewer)?.name
                ?.toLowerCase()
                .includes(searchLower) ||
              candidate.location.toLowerCase().includes(searchLower);
            if (!matchesSearch) return false;
          }

          // Apply other filters
          const activeFilters = [
            {
              key: 'topCandidates',
              filter: (c: Candidate) =>
                c.scores?.overall && c.scores.overall >= 7,
            },
            {
              key: 'appliedThisWeek',
              filter: (c: Candidate) => {
                if (!c.tracking?.createdAt) return false;
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                return new Date(c.tracking.createdAt) >= oneWeekAgo;
              },
            },
            {
              key: 'appliedToday',
              filter: (c: Candidate) => {
                if (!c.tracking?.createdAt) return false;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                return (
                  new Date(c.tracking.createdAt) >= today &&
                  new Date(c.tracking.createdAt) < tomorrow
                );
              },
            },
            {
              key: 'appliedIn15Days',
              filter: (c: Candidate) => {
                if (!c.tracking?.createdAt) return false;
                const fifteenDaysAgo = new Date();
                fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
                return new Date(c.tracking.createdAt) >= fifteenDaysAgo;
              },
            },
            {
              key: 'toFollowUp',
              filter: (c: Candidate) => c.followUp && c.followUp.note,
            },
            {
              key: 'assigned',
              filter: (c: Candidate) => isAssigned(c),
            },
            {
              key: 'notAssigned',
              filter: (c: Candidate) => !isAssigned(c),
            },
            {
              key: 'withRemarks',
              filter: (c: Candidate) => c.remarks && c.remarks.length > 0,
            },
            {
              key: 'withoutRemarks',
              filter: (c: Candidate) => !c.remarks || c.remarks.length === 0,
            },
          ].filter(
            (filter) =>
              filterConditions[filter.key as keyof FilterState] === true,
          );

          if (activeFilters.length > 0) {
            if (filterConditions.logicalOperator === 'AND') {
              return activeFilters.every(({ filter }) => filter(candidate));
            }
            return activeFilters.some(({ filter }) => filter(candidate));
          }

          return true;
        });
      }

      // Apply archived filter
      currentCandidates = currentCandidates.filter(
        (candidate) => showArchived || !candidate.isDeleted,
      );

      // Handle different lane data structures
      // Normalize all lanes to strings to prevent "Objects are not valid as a React child" errors
      let lanesArray: string[];
      if (updatedLanes) {
        // updatedLanes might be strings or objects - normalize to strings
        lanesArray = Array.isArray(updatedLanes)
          ? updatedLanes.map((lane) =>
              typeof lane === 'string' ? lane : (lane as { name: string }).name,
            )
          : [];
      } else if (jobLanesData?.lanes) {
        // Extract lane names from JobLanesResponse structure
        lanesArray = jobLanesData.lanes.map((lane) => lane.name);
      } else {
        lanesArray = [
          'applied',
          'screening',
          'shortlisted',
          'processing',
          'accepted',
          'rejected',
        ];
      }

      lanesArray.forEach((lane) => {
        if (!initialCandidateColumns.find((item) => item.id === lane)) {
          initialCandidateColumns.push({
            id: lane as CandidateStatus,
            title: lane, // Now guaranteed to be a string
            candidates: [],
          });
        }
      });

      const updatedColumns = lanesArray.map((lane) => {
        const column = initialCandidateColumns.find((item) => item.id === lane);

        // Get lane metadata from API response (count, hasMore, candidates) if available
        const laneData = candidatesFromQuery?.lanes?.[lane];

        // IMPORTANT: Extract count and hasMore FIRST, before any candidate processing
        // This ensures we use the API's total count (6) not the loaded candidates count (5)
        // Check explicitly for undefined/null to avoid falling back to candidates.length
        const laneCount =
          laneData?.count !== undefined && laneData?.count !== null
            ? laneData.count
            : 0; // Use 0 as initial fallback, will be set to candidates.length later if needed
        const laneHasMore = laneData?.hasMore ?? false;

        // Use candidates from API response (first page only) as base
        // Then merge with SSE updates for real-time sync
        let candidates: Candidate[] = [];
        if (laneData?.candidates) {
          // Start with API candidates (first page only - supports pagination)
          candidates = laneData.candidates;
        } else {
          // Fallback: filter from currentCandidates if API data not available
          candidates = currentCandidates.filter(
            (candidate) =>
              candidate.status === lane &&
              (showArchived ? candidate.isDeleted : !candidate.isDeleted),
          );
        }

        // Merge with SSE candidates for real-time updates
        // SSE candidates take precedence (more recent)
        const sseCandidatesForLane = sseCandidates.filter(
          (candidate) => candidate.status === lane,
        );

        if (sseCandidatesForLane.length > 0) {
          const candidateMap = new Map<string, Candidate>();
          // Add API candidates first
          candidates.forEach((c) => candidateMap.set(c._id, c));
          // Override with SSE candidates (more recent)
          sseCandidatesForLane.forEach((c) => candidateMap.set(c._id, c));
          candidates = Array.from(candidateMap.values());
        }

        // Use the count from API (extracted above) - only fallback to candidates.length if count is 0
        // This ensures we show the total count (6) from API, not just loaded candidates (5)
        const finalCount = laneCount > 0 ? laneCount : candidates.length;

        // Debug: Log what we're setting
        // eslint-disable-next-line no-console

        const columnData = {
          id: lane as CandidateStatus,
          title: column?.title || lane, // Now guaranteed to be a string
          candidates,
          count: finalCount, // Use finalCount which prioritizes API count (6)
          hasMore: laneHasMore,
        } as CandidateColumn & { count?: number; hasMore?: boolean };

        // Debug: Verify properties are set
        // eslint-disable-next-line no-console

        return columnData;
      });

      setColumns(updatedColumns);
    }
    // Note: We use ref-based comparison above to prevent infinite loops
    // These dependencies are still needed for the effect to run when they change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mergedCandidates,
    lanes,
    updatedLanes,
    showArchived,
    filterConditions,
    allCandidatesFromQuery,
    jobLanesData,
  ]);

  // Effect: Track initial lane to edit
  useEffect(() => {
    if (laneToEdit && initialLaneToEdit === null) {
      setInitialLaneToEdit(laneToEdit);
    }
  }, [laneToEdit, initialLaneToEdit]);

  // Effect: Clean up lane edit state
  useEffect(() => {
    if (!isLaneEditOpen) {
      setInitialLaneToEdit(null);
      setLaneToEdit(null);
    }
  }, [isLaneEditOpen]);

  return {
    // IDs and params
    id,
    candidateIdParam,

    // State
    columns,
    selectedCandidate,
    isDetailsOpen,
    openRemarksFor,
    showArchived,
    isDeleteDialogOpen,
    candidateToDelete,
    isConfirmLaneDeleteOpen,
    laneToEdit,
    initialLaneToEdit,
    isChecklistConfigOpen,
    checklistConfigLane,
    filterConditions,
    droppedFileData,
    isDialogOpen,
    isLaneEditOpen,
    isFileOver,
    isCustomFieldsOpen,
    isAnalyticsOpen,
    isEmailSettingsOpen,
    isPromptConfirmOpen,
    pendingPromptValue,
    promptForStatusChangeReason,

    // Data
    job,
    allCandidatesFromQuery,
    mergedCandidates,
    lanes,
    jobLaneConfig,
    user,
    jobLanesData,

    // Loading states
    isJobLoading,
    isCandidatesLoading,
    isLanesLoading,
    isLoading,
    jobError,

    // Refs
    scrollRef,

    // Drag state
    isDragging,
    setIsDndDragging,

    // Setters
    setColumns,
    setSelectedCandidate,
    setIsDetailsOpen,
    setOpenRemarksFor,
    setShowArchived,
    setIsDeleteDialogOpen,
    setCandidateToDelete,
    setIsConfirmLaneDeleteOpen,
    setLaneToEdit,
    setInitialLaneToEdit,
    setIsChecklistConfigOpen,
    setChecklistConfigLane,
    setFilterConditions,
    setDroppedFileData,
    setIsDialogOpen,
    setIsLaneEditOpen,
    setIsFileOver,
    setIsCustomFieldsOpen,
    setIsAnalyticsOpen,
    setIsEmailSettingsOpen,
    setIsPromptConfirmOpen,
    setPendingPromptValue,
    setPromptForStatusChangeReason,

    // Handlers
    handleConfigureChecklist,
    handleCandidateDialogClose,
    handlePromptConfirm,
    handleAddLane,
    handleDeleteLane,
    handleEditLaneClick,
    handleEditLane,
    handleConfirmDeleteLane,
    handleMigrateAndDeleteLane,
    onDragEnd,
    handleFileDrop,
    handleDeleteClick,
    handleDeleteConfirm,
    refetch,
    updateJob,

    // Other
    migrationLanes,
    isMigrationDialogOpen,
    setIsMigrationDialogOpen,
    laneToDelete,
    setLaneToDelete,
    pendingMoves,
    completePendingMove,
    cancelPendingMove,
  };
};
