import { Candidate, CandidateColumn } from '@/types/candidate';
import { Job } from '@/types/job';
import { Organization } from '@/lib/models/user';
import { User } from '@/lib/features/users/usersApi';
import { JobEmailNotificationSettingsDialog } from '@/components/dialogs/JobEmailNotificationSettingsDialog';
import { CandidateDetailsDialog } from './Dialogs/candidate-details-dialog';
import EditLaneDialog from './Lanes/edit-lane-dialog';
import ConfirmationDialog from './Dialogs/ConfirmationDialog';
import { MigrationDialog } from './Dialogs/MigrationDialog';
import CandidateCustomFieldsDialog from './customFields/candidateCustomFieldsDialog';
import { JobAnalyticsModal } from '../../../jobs-board/components/JobAnalyticsModal';
import ChecklistRemarksDialog from './Dialogs/checklist-remarks-dialog';
import { LaneChecklistConfigDialog } from './Dialogs/lane-checklist-config-dialog';
import { GlobalRemarksDialog } from './Dialogs/global-remarks-dialog';

interface JobPageDialogsProps {
  // Candidate dialogs
  selectedCandidate: Candidate | null;
  isDetailsOpen: boolean;
  setIsDetailsOpen: (open: boolean) => void;
  handleCandidateUpdate: (candidate: Candidate) => void;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (open: boolean) => void;
  handleDeleteConfirm: () => void;

  // Lane dialogs
  isLaneEditOpen: boolean;
  setIsLaneEditOpen: (open: boolean) => void;
  laneToEdit: string | null;
  initialLaneToEdit: string | null;
  setLaneToEdit: (lane: string | null) => void;
  handleLaneUpdate: (prevLaneId: string, laneId: string) => void;
  isConfirmLaneDeleteOpen: boolean;
  setIsConfirmLaneDeleteOpen: (open: boolean) => void;
  handleConfirmDeleteLane: (laneId: string) => void;
  laneToDelete: string | null;
  isMigrationDialogOpen: boolean;
  setIsMigrationDialogOpen: (open: boolean) => void;
  migrationLanes: string[];
  handleMigrateAndDeleteLane: (migrationLane: string) => void;

  // Settings dialogs
  isCustomFieldsOpen: boolean;
  setIsCustomFieldsOpen: (open: boolean) => void;
  jobId: string;
  isAnalyticsOpen: boolean;
  setIsAnalyticsOpen: (open: boolean) => void;
  job: Job | undefined;
  user: User | null;
  isEmailSettingsOpen: boolean;
  setIsEmailSettingsOpen: (open: boolean) => void;

  // Prompt confirmation
  isPromptConfirmOpen: boolean;
  setIsPromptConfirmOpen: (open: boolean) => void;
  pendingPromptValue: boolean;
  handlePromptConfirm: () => void;

  // Checklist dialogs
  openRemarksFor: string | null;
  setOpenRemarksFor: (id: string | null) => void;
  columns: CandidateColumn[];
  refetch: () => Promise<void>;
  completePendingMove: (candidateId: string) => void;
  cancelPendingMove: (candidateId: string) => void;
  isChecklistConfigOpen: boolean;
  setIsChecklistConfigOpen: (open: boolean) => void;
  checklistConfigLane: {
    laneId: string;
    laneName: string;
    initialTab?: 'incoming' | 'outgoing';
  } | null;
  mergedCandidates: Candidate[];
}

export function JobPageDialogs({
  selectedCandidate,
  isDetailsOpen,
  setIsDetailsOpen,
  handleCandidateUpdate,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  handleDeleteConfirm,
  isLaneEditOpen,
  setIsLaneEditOpen,
  laneToEdit,
  initialLaneToEdit,
  setLaneToEdit,
  handleLaneUpdate,
  isConfirmLaneDeleteOpen,
  setIsConfirmLaneDeleteOpen,
  handleConfirmDeleteLane,
  laneToDelete,
  isMigrationDialogOpen,
  setIsMigrationDialogOpen,
  migrationLanes,
  handleMigrateAndDeleteLane,
  isCustomFieldsOpen,
  setIsCustomFieldsOpen,
  jobId,
  isAnalyticsOpen,
  setIsAnalyticsOpen,
  job,
  user,
  isEmailSettingsOpen,
  setIsEmailSettingsOpen,
  isPromptConfirmOpen,
  setIsPromptConfirmOpen,
  pendingPromptValue,
  handlePromptConfirm,
  openRemarksFor,
  setOpenRemarksFor,
  columns,
  refetch,
  completePendingMove,
  cancelPendingMove,
  isChecklistConfigOpen,
  setIsChecklistConfigOpen,
  checklistConfigLane,
  mergedCandidates,
}: JobPageDialogsProps) {
  return (
    <>
      <CandidateDetailsDialog
        candidate={selectedCandidate}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpdate={handleCandidateUpdate}
      />

      <EditLaneDialog
        isEditLaneDialogOpen={isLaneEditOpen}
        setIsEditLaneDialogOpen={setIsLaneEditOpen}
        editingLane={laneToEdit || ''}
        prevLane={initialLaneToEdit || ''}
        setEditingLane={setLaneToEdit}
        handleLaneUpdate={handleLaneUpdate}
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
        onConfirm={handlePromptConfirm}
        onCancel={() => setIsPromptConfirmOpen(false)}
        buttonName="Confirm"
      />

      <CandidateCustomFieldsDialog
        isOpen={isCustomFieldsOpen}
        onClose={() => setIsCustomFieldsOpen(false)}
        jobId={jobId}
      />

      {job && user && (
        <JobAnalyticsModal
          isOpen={isAnalyticsOpen}
          onClose={() => setIsAnalyticsOpen(false)}
          job={job}
          organizationId={
            typeof user.organizationId === 'string'
              ? user.organizationId
              : (user.organizationId as Organization)?._id?.toString() || ''
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

      {openRemarksFor &&
        (() => {
          const candidate = columns
            .flatMap((col) => col.candidates)
            .find((c) => {
              if (c._id === openRemarksFor) return true;
              if (openRemarksFor.startsWith('{')) {
                try {
                  const parsed = JSON.parse(openRemarksFor);
                  return parsed.candidateId === c._id;
                } catch {
                  return false;
                }
              }
              return false;
            });

          if (!candidate) {
            return null;
          }

          const checklistInfo = openRemarksFor.startsWith('{')
            ? openRemarksFor
            : undefined;

          if (!checklistInfo) {
            return null;
          }

          return (
            <ChecklistRemarksDialog
              candidate={candidate}
              isOpen={!!openRemarksFor}
              onOpenChange={(open) => !open && setOpenRemarksFor(null)}
              setOpenRemarksFor={setOpenRemarksFor}
              refetch={refetch}
              checklistInfo={checklistInfo}
              onChecklistSuccess={(candidateId) => {
                completePendingMove(candidateId);
              }}
              onChecklistCancel={cancelPendingMove}
            />
          );
        })()}

      {checklistConfigLane && (
        <LaneChecklistConfigDialog
          isOpen={isChecklistConfigOpen}
          onOpenChange={setIsChecklistConfigOpen}
          jobId={jobId}
          laneId={checklistConfigLane.laneId}
          laneName={checklistConfigLane.laneName}
          initialTab={checklistConfigLane.initialTab}
        />
      )}

      <GlobalRemarksDialog
        openRemarksFor={openRemarksFor}
        setOpenRemarksFor={setOpenRemarksFor}
        candidates={mergedCandidates}
        refetch={refetch}
      />
    </>
  );
}
