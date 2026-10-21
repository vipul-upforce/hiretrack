import { Candidate } from '@/types/candidate';
import type {
  BulkReasonRequestPayload,
  StatusChangeValidationResult,
} from '@/components/unified-candidate-dialog/types';
import type { OnLaneRefetch, OnLaneRefetchCurrentPage } from '@/components/unified-candidate-dialog/types';

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
  onArchiveClick?: (candidateId: string) => void;
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
  /** When job has promptForStatusChangeReason and bulk status update from unified dialog: open bulk reason dialog. */
  onBulkStatusRequiresReason?: (payload: {
    candidateIds: string[];
    newStatus: string;
    operations?: import('@/app/api/candidates/bulk-update/types').BulkUpdateOperationParams[];
  }) => void;
  /** When status is updated from unified actions dialog, triggers lane refetch so Kanban columns update. */
  onLaneRefetch?: OnLaneRefetch;
  /** Refetch only current page of the lane (tags, remark, follow-up, edit, assign, evaluate). */
  onLaneRefetchCurrentPage?: OnLaneRefetchCurrentPage;
}
