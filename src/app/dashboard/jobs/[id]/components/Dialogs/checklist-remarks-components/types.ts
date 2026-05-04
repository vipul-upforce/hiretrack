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
  /** When true, checklist was opened after deferring status from unified dialog; parent will apply status via handleChecklistComplete */
  statusDeferredFromUnified?: boolean;
  /** When true, status was already applied (e.g. after first of two checklists); only submit checklist, do not update status */
  statusAlreadyApplied?: boolean;
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
  /** When checklist was opened with deferred status (mandatory from unified dialog), called inside submit hook to apply status before onSuccess. Implementer updates candidate status, refetches, clears pending. If provided, avoids relying on onChecklistSuccess after dialog closes. */
  onApplyDeferredStatus?: (
    candidateId: string,
    newStatus: string,
  ) => void | Promise<void>;
  /** When > 0: bulk mode – apply same checklist to current group only (same checklist key); one API call per group */
  bulkTotalCount?: number;
  /** In bulk mode: parent submits same checklist data for all candidates in the current group (same checklist key). May return { transitionedToIncoming: true } when bulk two-phase opens the next dialog. */
  onApplyToRemaining?: (
    data: ChecklistSubmissionData,
  ) => void | Promise<{ transitionedToIncoming?: boolean } | void>;
}
