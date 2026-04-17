'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  useFetchJobByIdQuery,
  useUpdateJobMutation,
} from '@/lib/features/job/jobApi';
import {
  useGetJobLaneConfigQuery,
} from '@/lib/features/checklist/checklistApi';
import { Candidate, CandidateColumn } from '@/types/candidate';
import {
  useGetLanesQuery,
  useGetJobLanesQuery,
} from '@/lib/features/lane/laneApi';
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
import { useBulkChecklistFlow } from './hooks/useBulkChecklistFlow';
import { useNormalizedCandidates } from './hooks/useNormalizedCandidates';
import { useCandidateState } from './hooks/useCandidateState';
import { useJobPageEffects } from './hooks/useJobPageEffects';
import { useClientSideChecklistValidation } from './hooks/useClientSideChecklistValidation';
import { QuickSelectAndFilter } from './components/QuickSelectAndFilter';
import { JobPageHeader } from './components/JobPageHeader';
import { JobKanbanBoard } from './components/JobKanbanBoard';
import { JobCandidatesTable } from './components/Table/JobCandidatesTable';
import { JobPageDialogs } from './components/JobPageDialogs';
import { stringifyBulkReasonPayload } from './components/Dialogs/bulk-reason-dialog';
import { ShareCandidateDialog } from './components/Dialogs/share-candidate-dialog';

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
  const dispatch = useAppDispatch();

  const onUnifiedRemarkClose = useCallback(() => {
    dispatch(clearSelectedCandidates());
  }, [dispatch]);

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
    refetch: refetchKanban,
    sseLanes: updatedLanes,
  } = useNormalizedCandidates({
    jobId: id,
    setSelectedCandidate: setTempSelectedCandidate,
    selectedCandidate: tempSelectedCandidate,
    enabled: viewMode === 'kanban',
  });

  const refetchCurrentView = useCallback(async () => {
    // FIX: Using `.current` properly queries the imperative callback saved in our ref
    if (viewMode === 'table' && tableRefetchRef.current) {
      await tableRefetchRef.current();
      return;
    }
    if (viewMode === 'kanban') {
      await refetchKanban();
    }
  }, [viewMode, refetchKanban]);

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
      setOpenRemarksFor(validationInfo);
    },
    [setOpenRemarksFor],
  );

  const onBulkStatusRequiresReason = useCallback(
    (payload: BulkReasonRequestPayload) => {
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
    refetch: () => Promise.resolve(),
  });

  const {
    onDragEnd,
    onBeforeDragStart,
    bulkDragState,
    handleFileDrop,
    handleCandidateUpdate,
    handleDeleteClick,
    handleDeleteConfirm,
    pendingMoves,
    cancelPendingMove,
    handleChecklistComplete,
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
    refetch: refetchKanban,
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
  if (!viewMode) {
    return <LoaderSkeleton />;
  }

  if (
    isJobLoading ||
    (viewMode === 'kanban' && isCandidatesLoading) ||
    isLanesLoading ||
    !lanes
  ) {
    if (viewMode === 'kanban') return <LoaderSkeleton />

    return null;

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
        onViewChange={(view) => setViewMode(view)}
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
          onDragEnd={onDragEnd}
          onBeforeDragStart={onBeforeDragStart}
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
          bulkTotalCount={
            bulkDragTwoPhase
              ? bulkDragTwoPhase.candidateIds.length
              : (bulkStatusQueue?.length ?? 0)
          }
          onApplyToRemaining={
            bulkDragTwoPhase ? onBulkDragTwoPhaseSubmit : onApplyToRemaining
          }
          bulkStatusQueue={bulkStatusQueue}
          onBulkChecklistCancel={onBulkChecklistCancel}
          bulkDragTwoPhase={bulkDragTwoPhase}
          onUnifiedRemarkClose={onUnifiedRemarkClose}
          onBulkStatusRequiresReason={
            job?.promptForStatusChangeReason ? onBulkStatusRequiresReason : undefined
          }
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