/**
 * Candidate Card Dialogs Component
 * Manages all dialogs used by the candidate card
 */

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Candidate } from '@/types/candidate';
import dayjs, { Dayjs } from 'dayjs';
import React, { Dispatch, SetStateAction } from 'react';
import { CandidateActionType } from '@/components/unified-candidate-dialog/types';
import { EditCandidateDialog } from '../Dialogs/edit-candidate-dialog';
import ConfirmationDialog from '../Dialogs/ConfirmationDialog';
import { EmailCandidateDialog } from '../Dialogs/email-candidate-dialog';
import { ShareCandidateDialog } from '../Dialogs/share-candidate-dialog';
import TagsDialog from '../Dialogs/tags-dialog';
import { getJobTitle } from '../../utils/candidateAccessors';
import { UnifiedCandidateActionsDialog } from '../Dialogs/unified-candidate-actions-dialog';
import { DuplicateCandidatesDialog } from '../Dialogs/DuplicateCandidatesDialog';

interface CandidateCardDialogsProps {
  candidate: Candidate;
  setLocalCandidate?: (candidate: Candidate) => void;
  // Dialog states
  isEditing: boolean;
  setIsEditing: (open: boolean) => void;
  isAssigning: boolean;
  setIsAssigning: (open: boolean) => void;
  isAddingFollowUp: boolean;
  setIsAddingFollowUp: (open: boolean) => void;
  confirmUnassignOpen: boolean;
  setConfirmUnassignOpen: (open: boolean) => void;
  isAddRemarkOpen: boolean;
  setIsAddRemarkOpen: (open: boolean) => void;
  isEmailDialogOpen: boolean;
  setIsEmailDialogOpen: (open: boolean) => void;
  isTagsOpen: boolean;
  setIsTagsOpen: (open: boolean) => void;
  isShareDialogOpen: boolean;
  setIsShareDialogOpen: (open: boolean) => void;
  isAssignJobOpen: boolean;
  setIsAssignJobOpen: (open: boolean) => void;
  candidateToAssignJob: Candidate | null;
  setCandidateToAssignJob: (candidate: Candidate | null) => void;
  removeFUOpen: boolean;
  setRemoveFUOpen: (open: boolean) => void;
  // Handlers
  refetch: () => void;
  handleRemoveFollowUp: () => void;
  handleAddFollowUp: () => void;
  confirmUnassign: (note: string, rating?: number) => void;
  isLoading: boolean;
  isFollowUpSubmitting: boolean;
  // Follow-up state
  newFollowUp: string;
  setNewFollowUp: Dispatch<SetStateAction<string>>;
  newFollowUpDate: dayjs.Dayjs | null;
  setNewFollowUpDate: Dispatch<SetStateAction<Dayjs | null>>;
  // Other
  onDashboard: boolean;
  // setOpenRemarksFor: (id: string | null) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  // Optional callbacks to update state without refetching
  onUpdate?: (updatedCandidate: Candidate) => void;
  refetchAssignment?: () => void;
  onOpenCandidateDetailsDialog: (candidate: Candidate) => void; // New prop for opening main candidate details dialog
  isDuplicateDialogOpen: boolean;
  setIsDuplicateDialogOpen: (open: boolean) => void;
  /** Single-candidate status change: validate checklist; when required, defer to page checklist dialog */
  onValidateStatusChange?: (
    candidate: Candidate,
    newStatus: string,
  ) => { requiresChecklist: boolean; validationInfo?: string } | null;
  onDeferStatusToChecklist?: (
    validationInfo: string,
    newStatus: string,
    nextChecklistValidationInfo?: string,
  ) => void;
  onOpenChecklistAfterSave?: (validationInfo: string) => void;
}

export function CandidateCardDialogs({
  candidate,
  setLocalCandidate,
  isEditing,
  setIsEditing,
  isAssigning,
  setIsAssigning,
  isAddingFollowUp,
  setIsAddingFollowUp,
  confirmUnassignOpen,
  setConfirmUnassignOpen,
  isAddRemarkOpen,
  setIsAddRemarkOpen,
  isEmailDialogOpen,
  setIsEmailDialogOpen,
  isTagsOpen,
  setIsTagsOpen,
  isShareDialogOpen,
  setIsShareDialogOpen,
  isAssignJobOpen,
  setIsAssignJobOpen,
  candidateToAssignJob: _candidateToAssignJob,
  setCandidateToAssignJob,
  removeFUOpen,
  setRemoveFUOpen,
  refetch,
  handleRemoveFollowUp,
  handleAddFollowUp: _handleAddFollowUp,
  confirmUnassign: _confirmUnassign,
  isLoading: _isLoading,
  isFollowUpSubmitting: _isFollowUpSubmitting,
  newFollowUp: _newFollowUp,
  setNewFollowUp: _setNewFollowUp,
  newFollowUpDate: _newFollowUpDate,
  setNewFollowUpDate: _setNewFollowUpDate,
  onDashboard,
  triggerRef,
  onUpdate,
  refetchAssignment: refetchAssignmentProp,
  onOpenCandidateDetailsDialog,
  isDuplicateDialogOpen,
  setIsDuplicateDialogOpen,
  onValidateStatusChange,
  onDeferStatusToChecklist,
  onOpenChecklistAfterSave,
}: CandidateCardDialogsProps) {
  const unifiedOpen =
    isAssigning ||
    isAddingFollowUp ||
    confirmUnassignOpen ||
    isAssignJobOpen ||
    (onDashboard ? isAddRemarkOpen : false);

 
  const getUnifiedInitialAction = (): CandidateActionType | undefined => {
    if (isAssigning) return 'assignTo';
    if (isAssignJobOpen) return 'switchJob';
    if (confirmUnassignOpen) return 'markAsDone';
    if (isAddingFollowUp) return 'addFollowUp';
    if (isAddRemarkOpen) return 'addRemark';
    return undefined;
  };
  const unifiedInitialAction: CandidateActionType | undefined =
    getUnifiedInitialAction();

  const closeUnified = () => {
    setIsAssigning(false);
    setIsAddingFollowUp(false);
    setConfirmUnassignOpen(false);
    setIsAddRemarkOpen(false);
    setIsAssignJobOpen(false);
    setCandidateToAssignJob(null);
  };

  return (
    <>
      {/* Edit Candidate Dialog */}
      {isEditing && (
        <EditCandidateDialog
          candidate={candidate}
          isOpen={isEditing}
          onOpenChange={setIsEditing}
          onUpdate={() => refetch()}
          onSuccess={() => {
            setIsEditing(false);
            refetch();
          }}
        />
      )}

      {/* Tags Dialog */}
      <Dialog open={isTagsOpen} onOpenChange={setIsTagsOpen}>
        <DialogTitle />
        <DialogContent className="w-[330px]">
          <div className="h-full">
            <TagsDialog
              isDialog
              candidate={candidate}
              refetch={() => {
                refetch();
                setIsTagsOpen(false);
              }}
              onClose={() => {
                triggerRef.current?.click();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Unified Actions Dialog */}
      {unifiedOpen && (
        <UnifiedCandidateActionsDialog
          candidate={candidate}
          isOpen={unifiedOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeUnified();
            }
          }}
          initialAction={unifiedInitialAction}
          refetch={refetch}
          onUpdate={(updatedCandidate) => {
            // Use onUpdate callback if provided (updates state without GET request)
            // Otherwise fall back to refetch (for backward compatibility)
            if (onUpdate) {
              onUpdate(updatedCandidate);
            } else {
              refetch();
            }
          }}
          setLocalCandidate={setLocalCandidate || (() => {})}
          refetchAssignment={() => {
            // Use refetchAssignment callback if provided (updates list without GET request)
            // Otherwise fall back to refetch (for backward compatibility)
            if (refetchAssignmentProp) {
              refetchAssignmentProp();
            } else {
              refetch();
            }
          }}
          onSuccess={() => {
            // Just close the dialog - state is already updated via onUpdate/refetchAssignment
            closeUnified();
          }}
          onValidateStatusChange={onValidateStatusChange}
          onDeferStatusToChecklist={
            onDeferStatusToChecklist
              ? (validationInfo, newStatus) => {
                  closeUnified();
                  onDeferStatusToChecklist(validationInfo, newStatus);
                }
              : undefined
          }
          onOpenChecklistAfterSave={
            onOpenChecklistAfterSave
              ? (validationInfo) => {
                  closeUnified();
                  onOpenChecklistAfterSave(validationInfo);
                }
              : undefined
          }
        />
      )}

      {/* Remove Follow Up Confirmation */}
      {removeFUOpen && (
        <ConfirmationDialog
          title="Remove Follow Up"
          message="Are you sure you want to remove this followup?"
          isOpen={removeFUOpen}
          setIsOpen={setRemoveFUOpen}
          onConfirm={async () => {
            await handleRemoveFollowUp();
            setRemoveFUOpen(false);
          }}
          onCancel={() => setRemoveFUOpen(false)}
          loadingText="Removing followup..."
          className="sm:max-w-[300px]"
          isLoading={_isFollowUpSubmitting}
        />
      )}



      {/* Email Candidate Dialog */}
      {isEmailDialogOpen && (
        <EmailCandidateDialog
          isOpen={isEmailDialogOpen}
          onClose={() => setIsEmailDialogOpen(false)}
          candidate={{
            _id: candidate._id,
            name: candidate.name,
            email: candidate.email,
            jobTitle: getJobTitle(candidate) as string,
          }}
        />
      )}

      {/* Share Candidate Dialog */}
      <ShareCandidateDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        candidate={candidate}
      />

      {/* Duplicate Candidates Dialog */}
      {isDuplicateDialogOpen && (
        <DuplicateCandidatesDialog
          candidate={candidate}
          isOpen={isDuplicateDialogOpen}
          onOpenChange={setIsDuplicateDialogOpen}
          onViewDetails={onOpenCandidateDetailsDialog}
        />
      )}
    </>
  );
}
