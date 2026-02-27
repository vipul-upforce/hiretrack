import { Candidate } from '@/types/candidate';

export interface CandidateCardProps {
  candidate: Candidate;
  index: number;
  onViewDetails: (candidate?: Candidate) => void;
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
  // Optional callbacks to update state without refetching
  onUpdate?: (updatedCandidate: Candidate) => void;
  refetchAssignment?: () => void;
  onOpenCandidateDetailsDialog?: (candidate: Candidate) => void;
  onOpenThisCandidateDuplicateDialog?: () => void;
  /** From KanbanColumn: shift-click range selection */
  onSelectCandidate?: (candidate: Candidate, candidateIndex: number) => void;
  isShiftPressed?: boolean;
  /** Single-candidate status change: validate checklist; when required, defer to checklist dialog */
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
  /** During bulk drag: hide this card (other selected), keep layout */
  isBulkPlaceholder?: boolean;
  /** During bulk drag: show this count on the dragged card */
  bulkDragCount?: number;
}
