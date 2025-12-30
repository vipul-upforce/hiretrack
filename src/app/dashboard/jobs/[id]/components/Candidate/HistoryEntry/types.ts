import { ICandidateHistory } from '@/lib/models/history';
import { Candidate } from '@/types/candidate';
import { IEditRemark } from '../../../schemas/EditRemarkDialog';

export interface HistoryEntryProps {
  interview: ICandidateHistory;
  indexKey: number;
  localCandidate: Candidate;
  timeDate: string;
  timeTime: string;
  handleRemarkUpdate: (
    id: string,
    description: string,
    isPrivate?: boolean,
  ) => void;
  setEditingRemark: (remark: IEditRemark | null) => void;
  setIsEditRemarkDialogOpen: (open: boolean) => void;
}

export interface ChecklistResponseViewerProps {
  checklistForm: ICandidateHistory['checklistForm'];
}

export interface EntryMetadataProps {
  timeDate: string;
  timeTime: string;
  isPrivate: boolean;
}

export interface EntryOptionsMenuProps {
  interview: ICandidateHistory;
  isRemarkOptionsOpen: boolean;
  isRemarkOpsOpenFor: string | null;
  isNoteOpsOpenFor: string | null;
  handleRemarkUpdate: (
    id: string,
    description: string,
    isPrivate?: boolean,
  ) => void;
  setEditingRemark: (remark: IEditRemark | null) => void;
  setIsEditRemarkDialogOpen: (open: boolean) => void;
}

export interface EntryContentProps {
  interview: ICandidateHistory;
}

export interface EntryRatingProps {
  rating: number | undefined;
}
