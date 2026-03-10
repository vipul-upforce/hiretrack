import { Candidate } from '@/types/candidate';

export interface CandidateDetailsDialogProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (updatedCandidate: Candidate) => void;
  hideEditButton?: boolean;
  large?: boolean;
  refetchAssignment?: () => void;
  fromFilter?: boolean;
  refetchCandidates?: () => void;
  hideCloseButtons?: boolean;
  isAssigning?: boolean;
  setIsAssigning?: (open: boolean) => void;
  onViewDetails?: (candidate: Candidate) => void;
  /** When provided, status update from unified dialog defers to checklist (outgoing then incoming) */
  onValidateStatusChange?: (
    candidate: Candidate,
    newStatus: string,
  ) => { requiresChecklist?: boolean; isMandatory?: boolean; validationInfo?: string; validationSteps?: { validationInfo: string; newStatusAfterStep: string }[] } | null;
  onDeferStatusToChecklist?: (
    validationInfo: string,
    newStatus: string,
    nextChecklistValidationInfo?: string,
  ) => void;
  onOpenChecklistAfterSave?: (validationInfo: string) => void;
  /** When job has promptForStatusChangeReason and bulk status update from unified dialog: open bulk reason dialog. */
  onBulkStatusRequiresReason?: (payload: {
    candidateIds: string[];
    newStatus: string;
  }) => void;
}
