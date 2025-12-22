import { Candidate } from '@/types/candidate';

export interface CandidateCardProps {
  candidate: Candidate;
  index: number;
  onViewDetails: (candidate: Candidate) => void;
  onDashboard?: boolean;
  onDeleteClick?: (candidateId: string) => void;
  openRemarks: boolean;
  setOpenRemarksFor: (id: string | null) => void;
  refetch: () => void;
  className?: string;
  onEditClick?: (candidate: Candidate) => void;
  isPending?: boolean; // New prop to indicate if card is awaiting checklist completion
  onAssignClick?: (candidate: Candidate) => void;
  onMarkAsDoneClick?: (candidate: Candidate) => void;
  onFollowUpClick?: (candidate: Candidate) => void;
  onAddRemarkClick?: (candidate: Candidate) => void;
}

