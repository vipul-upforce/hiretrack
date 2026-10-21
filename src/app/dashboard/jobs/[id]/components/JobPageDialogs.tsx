import React, { useRef, useMemo } from 'react';
import logger from '@/lib/logger';
import { Candidate, CandidateColumn } from '@/types/candidate';
import { useFetchCandidateByIdQuery } from '@/lib/features/candidate/candidateApi';
import { JobEmailNotificationSettingsDialog } from '@/components/dialogs/JobEmailNotificationSettingsDialog';
import { JobAnalyticsModal } from '@/app/dashboard/jobs-board/components/JobAnalyticsModal';
import { Job } from '@/types/job';
import { useAppSelector } from '@/lib/redux/hooks';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type {
  BulkStatusQueueItem,
  BulkReasonRequestPayload,
  CandidateActionType,
  StatusChangeValidationResult,
} from '@/components/unified-candidate-dialog/types';
import { CandidateDetailsDialog } from './Dialogs/candidate-details-dialog';
import EditLaneDialog from './Lanes/edit-lane-dialog';
import ConfirmationDialog from './Dialogs/ConfirmationDialog';
import { MigrationDialog } from './Dialogs/MigrationDialog';
import CandidateCustomFieldsDialog from './customFields/candidateCustomFieldsDialog';
import ChecklistRemarksDialog from './Dialogs/checklist-remarks-components/checklist-remarks-dialog';
import { LaneChecklistConfigDialog } from './Dialogs/lane-checklist-config-dialog';
import { UnifiedCandidateActionsDialog } from './Dialogs/unified-candidate-actions-dialog';
import { EditCandidateDialog } from './Dialogs/edit-candidate-dialog';
import {
  BulkReasonDialog,
  parseBulkReasonPayload,
} from './Dialogs/bulk-reason-dialog';
import type { BulkDragTwoPhaseState } from '../hooks/useCandidate';
import type { BulkChecklistApplyResult } from './Dialogs/checklist-remarks-components/types';

interface JobPageDialogsProps {
  // Candidate dialogs
  selectedCandidate: Candidate | null;
  isDetailsOpen: boolean;
  setIsDetailsOpen: (open: boolean) => void;
  isEditOpen: boolean;
  setIsEditOpen: (open: boolean) => void;
  handleCandidateUpdate: (candidate: Candidate) => void;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (open: boolean) => void;
  handleDeleteConfirm: () => void;
  handleDeleteClick: (candidateId: string) => void;
  candidateToDelete?: string | null;
  isAssigning: boolean;
  setIsAssigning: (open: boolean) => void;
  onOpenCandidateDetailsDialog?: (candidate: Candidate) => void;

  // Lane dialogs
  isLaneEditOpen: boolean;
  setIsLaneEditOpen: (open: boolean) => void;
  laneToEdit: string | null;
  initialLaneToEdit: string | null;
  setLaneToEdit: (lane: string | null) => void;
  handleEditLane: (oldLane: string, newLane: string) => void;
  isConfirmLaneDeleteOpen: boolean;
  setIsConfirmLaneDeleteOpen: (open: boolean) => void;
  laneToDelete: string | null;
  handleConfirmDeleteLane: (laneId: string) => void;
  isMigrationDialogOpen: boolean;
  setIsMigrationDialogOpen: (open: boolean) => void;
  migrationLanes: string[];
  handleMigrateAndDeleteLane: (targetLaneId: string) => void;

  // Settings dialogs
  isPromptConfirmOpen: boolean;
  setIsPromptConfirmOpen: (open: boolean) => void;
  pendingPromptValue: boolean;
  updateJob: (job: Job) => Promise<void>;
  job: Job;
  isCustomFieldsOpen: boolean;
  setIsCustomFieldsOpen: (open: boolean) => void;
  jobId: string;
  isAnalyticsOpen: boolean;
  setIsAnalyticsOpen: (open: boolean) => void;
  isEmailSettingsOpen: boolean;
  setIsEmailSettingsOpen: (open: boolean) => void;

  // Checklist and remarks
  openRemarksFor: string | null;
  setOpenRemarksFor: (id: string | null) => void;
  columns: CandidateColumn[];
  refetch: () => void;
  handleChecklistComplete: (candidateId: string) => void;
  cancelPendingMove: (candidateId: string) => void;
  checklistConfigLane: {
    laneId: string;
    laneName: string;
    initialTab?: 'incoming' | 'outgoing';
  } | null;
  isChecklistConfigOpen: boolean;
  setIsChecklistConfigOpen: (open: boolean) => void;
  mergedCandidates: Candidate[];
  onValidateStatusChange?: (
    candidate: Candidate,
    newStatus: string,
  ) => StatusChangeValidationResult | null;
  onDeferStatusToChecklist?: (
    validationInfo: string,
    newStatus: string,
    nextChecklistValidationInfo?: string,
  ) => void;
  onOpenChecklistAfterSave?: (validationInfo: string) => void;
  /** When > 0: bulk checklist mode – apply same answers to all (one API call). */
  bulkTotalCount?: number;
  onApplyToRemaining?: (
    data: import('@/types/checklist').ChecklistSubmissionData,
  ) => void | Promise<BulkChecklistApplyResult | void>;
  bulkStatusQueue?: BulkStatusQueueItem[] | null;
  bulkDragTwoPhase?: BulkDragTwoPhaseState | null;
  onBulkReasonDialogSuccess?: () => void;
  /** When user closes checklist in bulk context: cancel entire bulk (no re-open). */
  onBulkChecklistCancel?: () => void;
  onLaneRefetch?: (laneIdOrLanes: string | string[], candidateId?: string, updatedCandidate?: Candidate) => void;
  onLaneRefetchCurrentPage?: (laneId: string, candidateId?: string, updatedCandidate?: Candidate) => void;
  /** When the unified remark dialog (no checklist) closes; e.g. clear bulk selection. */
  onUnifiedRemarkClose?: () => void;
  /** When job has promptForStatusChangeReason and bulk status update from unified dialog: open bulk reason dialog. */
  onBulkStatusRequiresReason?: (payload: {
    candidateIds: string[];
    newStatus: string;
    operations?: import('@/app/api/candidates/bulk-update/types').BulkUpdateOperationParams[];
  }) => void;
  onOpenCandidateEditDialog?: (candidate: Candidate) => void;
}

export function JobPageDialogs({
  selectedCandidate,
  isDetailsOpen,
  setIsDetailsOpen,
  isEditOpen,
  setIsEditOpen,
  handleCandidateUpdate,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  handleDeleteConfirm,
  handleDeleteClick,
  candidateToDelete,
  isAssigning,
  setIsAssigning,
  isLaneEditOpen,
  setIsLaneEditOpen,
  laneToEdit,
  initialLaneToEdit,
  setLaneToEdit,
  handleEditLane,
  isConfirmLaneDeleteOpen,
  setIsConfirmLaneDeleteOpen,
  laneToDelete,
  handleConfirmDeleteLane,
  isMigrationDialogOpen,
  setIsMigrationDialogOpen,
  migrationLanes,
  handleMigrateAndDeleteLane,
  isPromptConfirmOpen,
  setIsPromptConfirmOpen,
  pendingPromptValue,
  updateJob,
  job,
  isCustomFieldsOpen,
  setIsCustomFieldsOpen,
  jobId,
  isAnalyticsOpen,
  setIsAnalyticsOpen,
  isEmailSettingsOpen,
  setIsEmailSettingsOpen,
  openRemarksFor,
  setOpenRemarksFor,
  columns,
  refetch,
  handleChecklistComplete,
  cancelPendingMove,
  checklistConfigLane,
  isChecklistConfigOpen,
  setIsChecklistConfigOpen,
  mergedCandidates,
  onValidateStatusChange,
  onDeferStatusToChecklist,
  onOpenChecklistAfterSave,
  bulkTotalCount = 0,
  onApplyToRemaining,
  bulkStatusQueue,
  onBulkChecklistCancel,
  onLaneRefetch,
  onLaneRefetchCurrentPage,
  onUnifiedRemarkClose,
  onBulkStatusRequiresReason,
  onBulkReasonDialogSuccess,
  onOpenCandidateDetailsDialog,
  bulkDragTwoPhase,
}: JobPageDialogsProps) {
  const user = useAppSelector((state) => state.auth.user);
  const openRemarksForRef = useRef(openRemarksFor);
  openRemarksForRef.current = openRemarksFor;

  const isChecklistPayload = (value: unknown) => {
    if (!value || typeof value !== 'object') return false;
    const v = value as {
      currentLane?: string;
      targetLane?: string;
      prevStatus?: string;
      newStatus?: string;
      checklistType?: string;
    };
    return (
      (!!v.currentLane && !!v.targetLane) ||
      (!!v.prevStatus && !!v.newStatus) ||
      !!v.checklistType
    );
  };

  /** When checklist dialog closes in bulk context: cancel entire bulk (no re-open for next). */
  const handleChecklistOpenChange = (open: boolean) => {
    if (open) return;
    const { current } = openRemarksForRef;
    const [firstInQueue] = bulkStatusQueue ?? [];
    const isBulkChecklistOpen =
      firstInQueue &&
      typeof current === 'string' &&
      current.startsWith('{') &&
      (() => {
        try {
          const { candidateId } = JSON.parse(current) as { candidateId?: string };
          return candidateId === firstInQueue.candidateId;
        } catch {
          return false;
        }
      })();
    // if (isBulkChecklistOpen && onBulkChecklistCancel) {
    //   onBulkChecklistCancel();
    // } else {
    //   setOpenRemarksFor(null);
    // }
    if (bulkDragTwoPhase && cancelPendingMove) {
      cancelPendingMove(bulkDragTwoPhase.candidateIds[0]);
      // Ensure the dialog actually closes.
      // In bulk two-phase flows (mandatory and optional), cancelPendingMove may only
      // clear pending queues but not the `openRemarksFor` state that drives the dialog.
      setOpenRemarksFor(null);
    } else if (isBulkChecklistOpen && onBulkChecklistCancel) {
      onBulkChecklistCancel();
    } else {
      setOpenRemarksFor(null);
    }
  };

  const handleUnifiedOpenChange = (open: boolean) => {
    if (open) return;
    const valueAtClose = openRemarksForRef.current;
    const tryClear = () => {
      const current = openRemarksForRef.current;
      if (!current) {
        setOpenRemarksFor(null);
        return;
      }

      // If openRemarksFor changed after close (e.g. checklist payload), do nothing.
      if (current !== valueAtClose) return;

      // If it's a string ID, just clear it
      if (!current.startsWith('{')) {
        setOpenRemarksFor(null);
        onUnifiedRemarkClose?.();
        return;
      }

      // If it's JSON, determine if it's a checklist or a unified action
      try {
        const parsed = JSON.parse(current);
        const isChecklist = isChecklistPayload(parsed);

        // If it's NOT a checklist (meaning it's likely a table unified action), allow closing
        if (!isChecklist) {
          setOpenRemarksFor(null);
          onUnifiedRemarkClose?.();
        }
      } catch (e) {
        // Fallback: clear if parsing fails
        setOpenRemarksFor(null);
      }
    };

    // Give checklist payload a chance to land before clearing unified dialog state.
    setTimeout(() => {
      if (openRemarksForRef.current !== valueAtClose) return;
      setTimeout(() => {
        if (openRemarksForRef.current !== valueAtClose) return;
        tryClear();
      }, 50);
    }, 0);
  };

  // Improved parsing for candidates and actions from openRemarksFor
  const dialogContext = useMemo(() => {
    if (!openRemarksFor) return null;

    let candidateId = openRemarksFor;
    let initialAction: CandidateActionType = 'addRemark';
    let isChecklist = false;

    if (openRemarksFor.startsWith('{')) {
      try {
        const parsed = JSON.parse(openRemarksFor);
        candidateId = parsed.candidateId || candidateId;
        initialAction = parsed.initialAction || initialAction;
        // Check if it's a checklist payload
        isChecklist = isChecklistPayload(parsed);
      } catch (e) {
        logger.error('Failed to parse openRemarksFor JSON:', openRemarksFor, e);
      }
    }

    const findCandidate = (id: string) => {
      const fromColumns = columns
        .flatMap((col) => col.candidates)
        .find((c) => c._id === id);
      if (fromColumns) return fromColumns;
      const fromMerged = mergedCandidates.find((c) => c._id === id);
      if (fromMerged) return fromMerged;
      if (selectedCandidate && selectedCandidate._id === id) return selectedCandidate;
      return null;
    };

    const candidate = findCandidate(candidateId);
    return { candidate, initialAction, isChecklist };
  }, [openRemarksFor, columns, mergedCandidates, selectedCandidate]);

  const checklistCandidate = dialogContext?.isChecklist ? dialogContext.candidate : null;
  const generalRemarksCandidate = (dialogContext && !dialogContext.isChecklist && !parseBulkReasonPayload(openRemarksFor))
    ? dialogContext.candidate
    : null;

  const checklistInfo = openRemarksFor?.startsWith('{') && dialogContext?.isChecklist
    ? openRemarksFor
    : undefined;

  const bulkReasonPayload = parseBulkReasonPayload(openRemarksFor);
  const archiveTargetCandidate = useMemo(() => {
    if (!candidateToDelete) return null;
    const fromMerged = mergedCandidates.find((c) => c._id === candidateToDelete);
    if (fromMerged) return fromMerged;
    if (selectedCandidate?._id === candidateToDelete) return selectedCandidate;
    const fromColumns = columns
      .flatMap((col) => col.candidates)
      .find((c) => c._id === candidateToDelete);
    return fromColumns ?? null;
  }, [candidateToDelete, mergedCandidates, selectedCandidate, columns]);

  // When candidate is not in columns/mergedCandidates (e.g. page 2+ in lane), fetch by ID so checklist dialog can open
  const checklistCandidateIdFromJson = useMemo(() => {
    if (!checklistInfo || !openRemarksFor) return null;
    try {
      const parsed = JSON.parse(openRemarksFor) as { candidateId?: string };
      return parsed.candidateId ?? null;
    } catch {
      return null;
    }
  }, [checklistInfo, openRemarksFor]);

  const needFetchChecklistCandidate = Boolean(
    checklistInfo &&
    checklistCandidateIdFromJson &&
    !checklistCandidate,
  );

  const {
    data: fetchedChecklistCandidate,
    isLoading: isFetchingChecklistCandidate,
    isError: isChecklistCandidateFetchError,
  } = useFetchCandidateByIdQuery(checklistCandidateIdFromJson ?? '', {
    skip: !needFetchChecklistCandidate,
  });

  const checklistCandidateResolved: Candidate | null =
    checklistCandidate ??
    (needFetchChecklistCandidate && fetchedChecklistCandidate
      ? fetchedChecklistCandidate
      : null);

  // Find candidate for general remarks (single candidate, not checklist and not bulk reason)
  // Resolve from columns first (same as checklist) so "+ Add Remark" always finds the candidate
  // const generalRemarksCandidate =
  //   openRemarksFor && !isChecklistPayload && !bulkReasonPayload
  //     ? (() => {
  //       const fromColumns = columns
  //         .flatMap((col) => col.candidates)
  //         .find((c) => c._id === openRemarksFor);
  //       if (fromColumns) return fromColumns;
  //       return mergedCandidates.find((c) => c._id === openRemarksFor) ?? null;
  //     })()
  //     : null;

  // Use merged candidate so details dialog has latest SSE data (contact, remarks, tags, assignment)
  const detailsCandidate =
    selectedCandidate != null
      ? mergedCandidates.find((c) => c._id === selectedCandidate._id) ??
      selectedCandidate
      : null;

  let checklistDialog: React.ReactNode = null;

  if (
    checklistInfo &&
    (checklistCandidateResolved || needFetchChecklistCandidate)
  ) {
    if (checklistCandidateResolved) {
      checklistDialog = (
        <ChecklistRemarksDialog
          candidate={checklistCandidateResolved}
          isOpen={!!openRemarksFor}
          onOpenChange={handleChecklistOpenChange}
          setOpenRemarksFor={setOpenRemarksFor}
          refetch={refetch}
          checklistInfo={checklistInfo}
          onChecklistSuccess={handleChecklistComplete}
          onChecklistCancel={cancelPendingMove}
          bulkTotalCount={bulkTotalCount}
          onApplyToRemaining={onApplyToRemaining}
        />
      );
    } else if (needFetchChecklistCandidate && isFetchingChecklistCandidate) {
      checklistDialog = (
        <Dialog
          open={!!openRemarksFor}
          onOpenChange={(open) => {
            if (!open) setOpenRemarksFor(null);
          }}
        >
          <DialogContent className="flex flex-col items-center justify-center gap-4 py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading candidate...</p>
          </DialogContent>
        </Dialog>
      );
    } else if (
      needFetchChecklistCandidate &&
      isChecklistCandidateFetchError
    ) {
      checklistDialog = (
        <Dialog
          open={!!openRemarksFor}
          onOpenChange={(open) => {
            if (!open) setOpenRemarksFor(null);
          }}
        >
          <DialogContent>
            <p className="text-sm text-destructive">
              Failed to load candidate. Please try again.
            </p>
          </DialogContent>
        </Dialog>
      );
    }
  }

  return (
    <>
      {checklistDialog}

      <CandidateDetailsDialog
        candidate={detailsCandidate}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpdate={handleCandidateUpdate}
        isAssigning={isAssigning}
        setIsAssigning={setIsAssigning}
        onViewDetails={onOpenCandidateDetailsDialog}
        onArchiveClick={handleDeleteClick}
        onValidateStatusChange={onValidateStatusChange}
        onDeferStatusToChecklist={onDeferStatusToChecklist}
        onOpenChecklistAfterSave={onOpenChecklistAfterSave}
        onBulkStatusRequiresReason={onBulkStatusRequiresReason}
        onLaneRefetch={onLaneRefetch}
        onLaneRefetchCurrentPage={onLaneRefetchCurrentPage}
      />

      {isEditOpen && selectedCandidate && (
        <EditCandidateDialog
          candidate={selectedCandidate}
          isOpen={isEditOpen}
          onOpenChange={setIsEditOpen}
          onUpdate={handleCandidateUpdate}
          refetchAssignment={refetch}
          onSuccess={async () => {
            await refetch();
          }}
        />
      )}

      <EditLaneDialog
        isEditLaneDialogOpen={isLaneEditOpen}
        setIsEditLaneDialogOpen={setIsLaneEditOpen}
        editingLane={laneToEdit || ''}
        prevLane={initialLaneToEdit || ''}
        setEditingLane={setLaneToEdit}
        handleLaneUpdate={handleEditLane}
        isLoading={false}
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        setIsOpen={setIsDeleteDialogOpen}
        title="Are you sure?"
        message={
          archiveTargetCandidate?.isDeleted
            ? 'This will unarchive this candidate. They will be visible in the regular view.'
            : 'This will archive this candidate. They will be hidden from the regular view.'
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteDialogOpen(false)}
        buttonName={archiveTargetCandidate?.isDeleted ? 'Unarchive' : 'Archive'}
      />

      <ConfirmationDialog
        isOpen={isConfirmLaneDeleteOpen}
        setIsOpen={setIsConfirmLaneDeleteOpen}
        title="Are you sure?"
        message="This will remove the lane from this job only. Other jobs will not be affected."
        onConfirm={() => {
          if (laneToDelete) handleConfirmDeleteLane(laneToDelete);
        }}
        onCancel={() => setIsConfirmLaneDeleteOpen(false)}
      />

      <MigrationDialog
        isOpen={isMigrationDialogOpen}
        lanes={migrationLanes}
        onClose={() => setIsMigrationDialogOpen(false)}
        onMigrate={handleMigrateAndDeleteLane}
        laneToDelete={laneToDelete}
      />

      <ConfirmationDialog
        isOpen={isPromptConfirmOpen}
        setIsOpen={setIsPromptConfirmOpen}
        title="Confirm Setting Change"
        message={`Are you sure you want to ${pendingPromptValue ? 'enable' : 'disable'} prompting for status change reasons?`}
        onConfirm={async () => {
          try {
            await updateJob({
              ...job,
              promptForStatusChangeReason: pendingPromptValue,
            });
          } catch (error) {
            logger.error('Failed to update job:', error);
          }
          setIsPromptConfirmOpen(false);
        }}
        onCancel={() => setIsPromptConfirmOpen(false)}
        buttonName="Confirm"
      />

      <CandidateCustomFieldsDialog
        isOpen={isCustomFieldsOpen}
        onClose={() => setIsCustomFieldsOpen(false)}
        jobId={jobId}
      />

      {job &&
        user &&
        user.role !== 'candidate' &&
        user.role !== 'interviewer' &&
        user.role !== 'hr' && (
          <JobAnalyticsModal
            isOpen={isAnalyticsOpen}
            onClose={() => setIsAnalyticsOpen(false)}
            job={job}
            organizationId={
              typeof user?.organizationId === 'string'
                ? user.organizationId
                : (user?.organizationId?._id as string) || ''
            }
          />
        )}

      {job && (
        <JobEmailNotificationSettingsDialog
          isOpen={isEmailSettingsOpen}
          onOpenChange={setIsEmailSettingsOpen}
          jobId={job._id}
          jobTitle={job.title}
        />
      )}

      {checklistCandidate && checklistInfo && (
        <ChecklistRemarksDialog
          candidate={checklistCandidate}
          isOpen={!!openRemarksFor}
          onOpenChange={handleChecklistOpenChange}
          setOpenRemarksFor={setOpenRemarksFor}
          refetch={refetch}
          checklistInfo={checklistInfo}
          onChecklistSuccess={handleChecklistComplete}
          onApplyDeferredStatus={(candidateId) => {
            handleChecklistComplete(candidateId);
          }}
          onChecklistCancel={cancelPendingMove}
          bulkTotalCount={bulkTotalCount}
          onApplyToRemaining={onApplyToRemaining}
        />
      )}

      {bulkReasonPayload && (
        <BulkReasonDialog
          payload={bulkReasonPayload}
          isOpen={!!openRemarksFor}
          onOpenChange={(open) => {
            if (!open) setOpenRemarksFor(null);
          }}
          refetch={refetch}
          setOpenRemarksFor={setOpenRemarksFor}
          onSuccess={onBulkReasonDialogSuccess}
        />
      )}

      {checklistConfigLane && user?.role !== 'hr' && (
        <LaneChecklistConfigDialog
          isOpen={isChecklistConfigOpen}
          onOpenChange={setIsChecklistConfigOpen}
          jobId={jobId}
          laneId={checklistConfigLane.laneId}
          laneName={checklistConfigLane.laneName}
          initialTab={checklistConfigLane.initialTab}
        />
      )}

      {generalRemarksCandidate && (
        <UnifiedCandidateActionsDialog
          candidate={generalRemarksCandidate}
          isOpen={!!openRemarksFor && !checklistInfo && !bulkReasonPayload}
          onOpenChange={handleUnifiedOpenChange}
          initialAction={dialogContext?.initialAction || 'addRemark'}
          refetch={refetch}
          onUpdate={handleCandidateUpdate}
          setLocalCandidate={() => { }}
          refetchAssignment={refetch}
          onSuccess={() => setOpenRemarksFor(null)}
          onValidateStatusChange={onValidateStatusChange}
          onDeferStatusToChecklist={onDeferStatusToChecklist}
          onOpenChecklistAfterSave={onOpenChecklistAfterSave}
          onBulkStatusRequiresReason={onBulkStatusRequiresReason}
          onLaneRefetch={onLaneRefetch || undefined}
        />
      )}
    </>
  );
}
