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
  /** When in bulk checklist flow: number of remaining candidates after this one */
  bulkRemainingCount?: number;
  /** When user chooses "apply same to remaining": submit same checklist data for all remaining in bulk queue */
  onApplyToRemaining?: (data: ChecklistSubmissionData) => void;
}
