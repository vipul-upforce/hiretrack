import { IChecklistField } from '@/lib/models/JobLaneConfig';
import { Candidate } from '@/types/candidate';
import type { ChecklistSubmissionData } from '@/types/checklist';

export interface ChecklistInfo {
  candidateId: string;
  currentLane: string;
  targetLane: string;
  checklist?: {
    id: string;
    name: string;
    description?: string;
    fields: IChecklistField[];
    isMandatory: boolean;
  };
  isMandatory?: boolean;
  checklistType?: 'incoming' | 'outgoing';
  /** When true, this is the first of two checklists; do not update candidate status on submit (second checklist will trigger move) */
  hasPendingChecklist?: boolean;
}

export interface ChecklistRemarksDialogProps {
  candidate: Candidate;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  setOpenRemarksFor: (id: string | null) => void;
  refetch: () => void;
  checklistInfo?: string; // JSON stringified ChecklistInfo
  onChecklistSuccess?: (candidateId: string) => void;
  onChecklistCancel?: (candidateId: string) => void;
  /** When > 0: bulk mode – apply same checklist to current group only (same checklist key); one API call per group */
  bulkTotalCount?: number;
  /** In bulk mode: parent submits same checklist data for all candidates in the current group (same checklist key). May return { transitionedToIncoming: true } when bulk two-phase opens the next dialog. */
  onApplyToRemaining?: (
    data: ChecklistSubmissionData,
  ) => void | Promise<{ transitionedToIncoming?: boolean } | void>;
}
