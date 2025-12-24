import { IChecklistField } from '@/lib/models/JobLaneConfig';
import { Candidate } from '@/types/candidate';

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
}
