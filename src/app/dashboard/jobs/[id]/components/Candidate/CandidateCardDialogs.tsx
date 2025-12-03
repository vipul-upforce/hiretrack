/**
 * Candidate Card Dialogs Component
 * Manages all dialogs used by the candidate card
 */

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Candidate } from "@/types/candidate";
import { User } from "@/lib/features/users/usersApi";
import { EditCandidateDialog } from "../Dialogs/edit-candidate-dialog";
import { AssignCandidateDialog } from "../Dialogs/assign-candidate-dialog";
import AddFollowUpDialog from "../Dialogs/add-followup-dialog";
import ConfirmAndRemarkDialog from "../Dialogs/mark-as-done-dialog";
import ConfirmationDialog from "../Dialogs/ConfirmationDialog";
import AddRemarksDialog from "../Dialogs/add-remark-dialog";
import { EmailCandidateDialog } from "../Dialogs/email-candidate-dialog";
import { AssignJobDialog } from "../Dialogs/assign-job-dialog";
import { ShareCandidateDialog } from "../Dialogs/share-candidate-dialog";
import TagsDialog from "../Dialogs/tags-dialog";
import { getJobTitle } from "../../utils/candidateAccessors";
import dayjs from "dayjs";

interface CandidateCardDialogsProps {
  candidate: Candidate;
  user: User | null;
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
  setNewFollowUp: (value: string) => void;
  newFollowUpDate: dayjs.Dayjs | null;
  setNewFollowUpDate: (value: dayjs.Dayjs | null) => void;
  // Other
  onDashboard: boolean;
  setOpenRemarksFor: (id: string | null) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

export function CandidateCardDialogs({
  candidate,
  user,
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
  candidateToAssignJob,
  setCandidateToAssignJob,
  removeFUOpen,
  setRemoveFUOpen,
  refetch,
  handleRemoveFollowUp,
  handleAddFollowUp,
  confirmUnassign,
  isLoading,
  isFollowUpSubmitting,
  newFollowUp,
  setNewFollowUp,
  newFollowUpDate,
  setNewFollowUpDate,
  onDashboard,
  setOpenRemarksFor,
  triggerRef,
}: CandidateCardDialogsProps) {
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
        <DialogTitle></DialogTitle>
        <DialogContent className="w-[330px]">
          <div className="h-full">
            <TagsDialog
              user={user}
              isDialog={true}
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

      {/* Assign Candidate Dialog */}
      {isAssigning && (
        <AssignCandidateDialog
          candidate={candidate}
          refetch={async () => refetch()}
          isOpen={isAssigning}
          onOpenChange={setIsAssigning}
          onUpdate={() => refetch()}
          setLocalCandidate={() => {}}
          onSuccess={() => {
            setIsAssigning(false);
            refetch();
          }}
        />
      )}

      {/* Add Follow Up Dialog */}
      {isAddingFollowUp && (
        <AddFollowUpDialog
          candidate={candidate}
          handleRemoveFollowUp={handleRemoveFollowUp}
          isOpen={isAddingFollowUp}
          onOpenChange={setIsAddingFollowUp}
          refetch={async () => refetch()}
          handleAddFollowUp={handleAddFollowUp}
          setNewFollowUp={setNewFollowUp}
          setNewFollowUpDate={setNewFollowUpDate}
          newFollowUp={newFollowUp}
          newFollowUpDate={newFollowUpDate}
          onAddingFollowup={async () => {
            setIsAddingFollowUp(false);
            setNewFollowUp("");
            setNewFollowUpDate(null);
            refetch();
          }}
          isLoading={isFollowUpSubmitting}
        />
      )}

      {/* Mark as Done Dialog */}
      <ConfirmAndRemarkDialog
        title="Mark as Done"
        message="Candidate will be Un-Assigned after marking as done."
        isOpen={confirmUnassignOpen}
        setIsOpen={setConfirmUnassignOpen}
        onConfirm={(note, rating) => {
          confirmUnassign(note, rating);
        }}
        onCancel={() => setConfirmUnassignOpen(false)}
        isLoading={isLoading}
        loadingText="Marking as done..."
      />

      {/* Remove Follow Up Confirmation */}
      {removeFUOpen && (
        <ConfirmationDialog
          title="Remove Follow Up"
          message="Are you sure you want to remove this followup?"
          isOpen={removeFUOpen}
          setIsOpen={setRemoveFUOpen}
          onConfirm={() => {
            handleRemoveFollowUp();
            setRemoveFUOpen(false);
          }}
          onCancel={() => setRemoveFUOpen(false)}
          loadingText="Removing..."
          className="sm:max-w-[300px]"
        />
      )}

      {/* Add Remarks Dialog (Dashboard only) */}
      {onDashboard && isAddRemarkOpen && (
        <AddRemarksDialog
          candidate={candidate}
          isOpen={isAddRemarkOpen}
          onOpenChange={setIsAddRemarkOpen}
          setOpenRemarksFor={() => {}}
          refetch={async () => refetch()}
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
            jobTitle: getJobTitle(candidate) || undefined,
          }}
        />
      )}

      {/* Assign Job Dialog */}
      {candidateToAssignJob && (
        <AssignJobDialog
          candidate={candidateToAssignJob}
          isOpen={isAssignJobOpen}
          onOpenChange={setIsAssignJobOpen}
          onJobAssignment={() => {
            setIsAssignJobOpen(false);
            setCandidateToAssignJob(null);
            refetch();
          }}
        />
      )}

      {/* Share Candidate Dialog */}
      <ShareCandidateDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        candidate={candidate}
      />
    </>
  );
}

