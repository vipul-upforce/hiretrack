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
  /** When > 0: bulk mode – apply same checklist to all (one API call); dialog only calls onApplyToRemaining, no per-candidate submit */
  bulkTotalCount?: number;
  /** In bulk mode: parent submits same checklist data for all candidates in one bulk-submit-checklist call */
  onApplyToRemaining?: (data: ChecklistSubmissionData) => void;
}
