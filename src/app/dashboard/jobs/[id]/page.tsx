'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  useFetchJobByIdQuery,
  useUpdateJobMutation,
} from '@/lib/features/job/jobApi';
import { Candidate, CandidateColumn } from '@/types/candidate';
import {
  useGetLanesQuery,
  useGetJobLanesQuery,
} from '@/lib/features/lane/laneApi';
import { useGetJobLaneConfigQuery } from '@/lib/features/checklist/checklistApi';
import { NoDataFound } from '@/app/not-found';
import { useSSE } from '@/hooks/useSSE';
import { useAppSelector } from '@/lib/redux/hooks';
import logger from '@/lib/logger';
import { initialCandidateColumns } from './data/initial-data';
import LoaderSkeleton from './components/Lanes/loader-skeleton';
import { useKanbanBoard } from './hooks/useKanbanBoard';
import { useDragToScroll } from './hooks/useDragToScroll';
import { useCandidate } from './hooks/useCandidate';
import { useNormalizedCandidates } from './hooks/useNormalizedCandidates';
import { useCandidateState } from './hooks/useCandidateState';
import { useJobPageEffects } from './hooks/useJobPageEffects';
import { QuickSelectAndFilter } from './components/QuickSelectAndFilter';
import { JobPageHeader } from './components/JobPageHeader';
import { JobKanbanBoard } from './components/JobKanbanBoard';
import { JobPageDialogs } from './components/JobPageDialogs';

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

  const [filterConditions, setFilterConditions] = useState<FilterState | null>(
    null,
  );
  const { user } = useAppSelector((state) => state.auth || {});

  const {
    ref: scrollRef,
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

  // Use normalized candidates hook (replaces manual merging)
  const {
    candidates: normalizedCandidates,
    isLoading: isCandidatesLoading,
    refetch,
  } = useNormalizedCandidates({
    jobId: id,
    setSelectedCandidate: setTempSelectedCandidate,
    selectedCandidate: tempSelectedCandidate,
  });

  // Use candidate state hook (consolidates UI state)
  const {
    selectedCandidate,
    setSelectedCandidate,
    isDetailsOpen,
    setIsDetailsOpen,
    openRemarksFor,
    setOpenRemarksFor,
    isAssigning,
    setIsAssigning,
  } = useCandidateState({
    jobId: id,
    candidates: normalizedCandidates,
  });

  // Get SSE lanes separately (still needed for lane updates)
  const { lanes: updatedLanes } = useSSE(
    setSelectedCandidate,
    selectedCandidate,
    id,
  );

  const [updateJob, { isLoading }] = useUpdateJobMutation();
  // NEW: Use job-specific lanes with fallback to user lanes
  const { data: jobLanes, isLoading: isJobLanesLoading } = useGetJobLanesQuery(
    id as string,
    { skip: !id },
  );
  const { data: userLanes, isLoading: isUserLanesLoading } = useGetLanesQuery(
    { userId: user?.id, jobId: id as string },
    { skip: !user?.id || !id },
  );

  // Use job-specific lanes if available, fallback to user lanes
  const lanes = jobLanes || userLanes;
  const isLanesLoading = isJobLanesLoading || isUserLanesLoading;

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
    jobId: id, // NEW: Pass jobId for job-specific operations
    setIsConfirmLaneDeleteOpen,
    setIsLaneEditOpen,
    refetch: () => Promise.resolve(),
  });

  const {
    onDragEnd,
    handleFileDrop,
    handleCandidateUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    pendingMoves,
    // completePendingMove,
    cancelPendingMove,
    handleChecklistComplete,
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
    refetch: () => Promise.resolve(),
    candidateToDelete,
    jobLaneConfig,
    job,
  });

  // Use normalized candidates (already merged and normalized)
  const mergedCandidates = normalizedCandidates;

  // Consolidate all side effects into a single hook
  useJobPageEffects({
    tempSelectedCandidate,
    selectedCandidate,
    setSelectedCandidate,
    normalizedCandidates,
    mergedCandidates,
    updatedLanes,
    jobLanes,
    userLanes,
    lanes,
    refetch,
    filterConditions,
    showArchived,
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
  if (isJobLoading || isCandidatesLoading || isLanesLoading || !lanes) {
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
      />

      <QuickSelectAndFilter
        currentJobId={id}
        candidates={mergedCandidates}
        onFilterChange={setFilterConditions}
        showArchived={showArchived}
        onShowArchivedChange={setShowArchived}
      />

      <JobKanbanBoard
        columns={columns}
        scrollRef={scrollRef}
        isDragging={isDragging}
        setIsDndDragging={setIsDndDragging}
        onDragEnd={onDragEnd}
        isFileOver={isFileOver}
        setIsFileOver={setIsFileOver}
        handleFileDrop={handleFileDrop}
        handleDeleteLane={handleDeleteLane}
        handleEditLane={handleEditLaneClick}
        setLaneToDelete={setLaneToDelete}
        setLaneToEdit={setLaneToEdit}
        refetch={refetch}
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
      />

      {job && (
        <JobPageDialogs
          selectedCandidate={selectedCandidate}
          isDetailsOpen={isDetailsOpen}
          setIsDetailsOpen={setIsDetailsOpen}
          handleCandidateUpdate={handleCandidateUpdate}
          isDeleteDialogOpen={isDeleteDialogOpen}
          setIsDeleteDialogOpen={setIsDeleteDialogOpen}
          handleDeleteConfirm={handleDeleteConfirm}
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
            // Ensure we await and only resolve on success, to match the expected signature (job: Job) => Promise<void>
            const result = await updateJob(j);
            if ('error' in result && result.error) {
              // Use structured logging for better observability
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
          columns={columns}
          refetch={refetch}
          handleChecklistComplete={handleChecklistComplete}
          cancelPendingMove={cancelPendingMove}
          checklistConfigLane={checklistConfigLane}
          isChecklistConfigOpen={isChecklistConfigOpen}
          setIsChecklistConfigOpen={setIsChecklistConfigOpen}
          mergedCandidates={mergedCandidates}
          isAssigning={isAssigning}
          setIsAssigning={setIsAssigning}
        />
      )}
    </div>
  );
}
