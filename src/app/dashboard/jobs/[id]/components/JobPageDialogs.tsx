import logger from '@/lib/logger';
import { Candidate, CandidateColumn } from '@/types/candidate';
import { JobEmailNotificationSettingsDialog } from '@/components/dialogs/JobEmailNotificationSettingsDialog';
import { JobAnalyticsModal } from '@/app/dashboard/jobs-board/components/JobAnalyticsModal';
import { Job } from '@/types/job';
import { useAppSelector } from '@/lib/redux/hooks';
import { CandidateActionType } from '@/components/unified-candidate-dialog/types';
import { CandidateDetailsDialog } from './Dialogs/candidate-details-dialog';
import EditLaneDialog from './Lanes/edit-lane-dialog';
import ConfirmationDialog from './Dialogs/ConfirmationDialog';
import { MigrationDialog } from './Dialogs/MigrationDialog';
import CandidateCustomFieldsDialog from './customFields/candidateCustomFieldsDialog';
import ChecklistRemarksDialog from './Dialogs/checklist-remarks-components/checklist-remarks-dialog';
import { LaneChecklistConfigDialog } from './Dialogs/lane-checklist-config-dialog';
import { UnifiedCandidateActionsDialog } from './Dialogs/unified-candidate-actions-dialog';

interface JobPageDialogsProps {
  // Candidate dialogs
  selectedCandidate: Candidate | null;
  isDetailsOpen: boolean;
  setIsDetailsOpen: (open: boolean) => void;
  handleCandidateUpdate: (candidate: Candidate) => void;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (open: boolean) => void;
  handleDeleteConfirm: () => void;
  isAssigning: boolean;
  setIsAssigning: (open: boolean) => void;

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
  // mergedCandidates: Candidate[];
}

export function JobPageDialogs({
  selectedCandidate,
  isDetailsOpen,
  setIsDetailsOpen,
  handleCandidateUpdate,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  handleDeleteConfirm,
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
  // mergedCandidates,
}: JobPageDialogsProps) {
  const { user } = useAppSelector((state) => state.auth);
  // Find candidate for checklist remarks dialog
  const checklistCandidate = openRemarksFor
    ? columns
        .flatMap((col) => col.candidates)
        .find((c) => {
          if (c._id === openRemarksFor) return true;
          if (openRemarksFor.startsWith('{')) {
            try {
              const parsed = JSON.parse(openRemarksFor);
              return parsed.candidateId === c._id;
            } catch (e) {
              logger.error(
                'Failed to parse openRemarksFor JSON:',
                openRemarksFor,
                e,
              );
              return false;
            }
          }
          return false;
        })
    : null;

  const checklistInfo = openRemarksFor?.startsWith('{')
    ? openRemarksFor
    : undefined;

  // Find candidate for general remarks (not checklist)
  const generalRemarksCandidate =
    openRemarksFor && !checklistInfo
      ? mergedCandidates.find((c) => c._id === openRemarksFor)
      : null;

  return (
    <>
      <CandidateDetailsDialog
        candidate={selectedCandidate}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpdate={handleCandidateUpdate}
        isAssigning={isAssigning}
        setIsAssigning={setIsAssigning}
      />

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
          selectedCandidate?.isDeleted
            ? 'This will unarchive this candidate. They will be visible in the regular view.'
            : 'This will archive this candidate. They will be hidden from the regular view.'
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteDialogOpen(false)}
        buttonName={selectedCandidate?.isDeleted ? 'Unarchive' : 'Archive'}
      />

      <ConfirmationDialog
        isOpen={isConfirmLaneDeleteOpen}
        setIsOpen={setIsConfirmLaneDeleteOpen}
        title="Are you sure?"
        message="This will remove the lane from this job only. Other jobs will not be affected."
        onConfirm={() => laneToDelete && handleConfirmDeleteLane(laneToDelete)}
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
          onOpenChange={(open) => !open && setOpenRemarksFor(null)}
          setOpenRemarksFor={setOpenRemarksFor}
          refetch={refetch}
          checklistInfo={checklistInfo}
          onChecklistSuccess={handleChecklistComplete}
          onChecklistCancel={cancelPendingMove}
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
          isOpen={!!openRemarksFor && !checklistInfo}
          onOpenChange={(open) => !open && setOpenRemarksFor(null)}
          initialAction={'addRemark' as CandidateActionType}
          refetch={refetch}
          onUpdate={handleCandidateUpdate}
          setLocalCandidate={() => {}}
          refetchAssignment={refetch}
          onSuccess={() => setOpenRemarksFor(null)}
        />
      )}
    </>
  );
}
