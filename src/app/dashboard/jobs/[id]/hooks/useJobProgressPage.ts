import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  useFetchJobByIdQuery,
  useUpdateJobMutation,
} from '@/lib/features/job/jobApi';
import { useFetchCandidatesQuery } from '@/lib/features/candidate/candidateApi';
import { useAppSelector } from '@/lib/redux/hooks';
import {
  useGetLanesQuery,
  useGetJobLanesQuery,
} from '@/lib/features/lane/laneApi';
import { useGetJobLaneConfigQuery } from '@/lib/features/checklist/checklistApi';
import { Candidate, CandidateColumn, CandidateStatus } from '@/types/candidate';
import { useSSE } from '@/hooks/useSSE';
// import {
//   CustomCalendarEvent,
//   Interviewer,
// } from '@/app/dashboard/calendar/types';
import { CustomCalendarEvent } from '@/app/dashboard/calendar/page';
import { Interviewer } from '@/lib/features/user/userApi';
import { initialCandidateColumns } from '../data/initial-data';
import { useKanbanBoard } from './useKanbanBoard';
import { useDragToScroll } from './useDragToScroll';
import { useCandidate } from './useCandidate';

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
    setSelectedCandidate as (
      candidate: Candidate | CustomCalendarEvent | null,
    ) => void,
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

  const {
    data: candidatesFromQuery,
    isLoading: isCandidatesLoading,
    refetch,
  } = useFetchCandidatesQuery(id as string);

  const [updateJob, { isLoading }] = useUpdateJobMutation();

  const { data: jobLanes, isLoading: isJobLanesLoading } = useGetJobLanesQuery(
    id as string,
    { skip: !id },
  );

  const { data: userLanes, isLoading: isUserLanesLoading } = useGetLanesQuery(
    { userId: user?.id, jobId: id as string },
    { skip: !user?.id || !id },
  );

  const lanes = jobLanes || userLanes;
  const isLanesLoading = isJobLanesLoading || isUserLanesLoading;

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
    user,
    jobId: id,
    setIsConfirmLaneDeleteOpen,
    setIsLaneEditOpen,
    refetch,
  });

  // Candidate operations
  const {
    onDragEnd,
    handleFileDrop,
    handleCandidateUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    pendingMoves,
    completePendingMove,
    cancelPendingMove,
  } = useCandidate({
    columns,
    setColumns,
    user,
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

  // Merge candidates from query and SSE
  const mergedCandidates = useMemo(() => {
    const candidateMap = new Map<string, Candidate>(
      candidatesFromQuery?.map((c) => [c._id, c]) || [],
    );

    sseCandidates.forEach((sseCandidate) => {
      candidateMap.set(sseCandidate._id, sseCandidate);
    });

    return Array.from(candidateMap.values());
  }, [candidatesFromQuery, sseCandidates]);

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
    if (candidateIdParam && candidatesFromQuery && !selectedCandidate) {
      const candidate = candidatesFromQuery.find(
        (c) => c._id === candidateIdParam,
      );
      if (candidate) {
        setSelectedCandidate(candidate);
        setIsDetailsOpen(true);
      }
    }
  }, [candidateIdParam, candidatesFromQuery, selectedCandidate]);

  // Effect: Process candidates and update columns
  useEffect(() => {
    if (candidatesFromQuery && lanes) {
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
              filter: (c: Candidate) => c.assignment,
            },
            {
              key: 'notAssigned',
              filter: (c: Candidate) => !c.assignment,
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
      let lanesArray;
      if (updatedLanes) {
        lanesArray = updatedLanes;
      } else if (jobLanes?.lanes) {
        lanesArray = [...jobLanes.lanes];
      } else if (userLanes?.lanes) {
        lanesArray = [...userLanes.lanes];
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
            title: lane,
            candidates: [],
          });
        }
      });

      const updatedColumns = lanesArray.map((lane) => {
        const column = initialCandidateColumns.find((item) => item.id === lane);
        const candidates = currentCandidates.filter(
          (candidate) =>
            candidate.status === lane &&
            (showArchived ? candidate.isDeleted : !candidate.isDeleted),
        );

        return {
          id: lane as CandidateStatus,
          title: column?.title || lane,
          candidates,
        } as CandidateColumn;
      });

      setColumns(updatedColumns);
    }
  }, [
    mergedCandidates,
    lanes,
    updatedLanes,
    showArchived,
    filterConditions,
    candidatesFromQuery,
    jobLanes,
    userLanes,
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
    candidatesFromQuery,
    mergedCandidates,
    lanes,
    jobLaneConfig,
    user,
    jobLanes,
    userLanes,

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
    handleCandidateUpdate,
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
