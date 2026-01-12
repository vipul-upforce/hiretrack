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
  isAssigning: boolean;
  setIsAssigning: (open: boolean) => void;
}
