import { Candidate } from '@/types/candidate';
import type { StatusChangeValidationResult } from '@/components/unified-candidate-dialog/types';

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
  /** When provided, status update from unified dialog defers to checklist (outgoing then incoming) */
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
}
