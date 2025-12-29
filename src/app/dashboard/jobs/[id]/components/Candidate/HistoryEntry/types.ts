import { ICandidateHistory } from '@/lib/models/history';
import { Candidate } from '@/types/candidate';
import { User } from '@/lib/features/users/usersApi';
import { IEditRemark } from '../../../schemas/EditRemarkDialog';

export interface HistoryEntryProps {
  interview: ICandidateHistory;
  indexKey: number;
  localCandidate: Candidate;
  user: User | null;
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
  user: User | null;
  isRemarkOptionsOpen: boolean;
  isRemarkOpsOpenFor: string | null;
  isNoteOpsOpenFor: string | null;
  setIsRemarkOptionsOpen: (open: boolean) => void;
  setIsRemarkOpsOpenFor: (id: string | null) => void;
  setIsNoteOpsOpenFor: (id: string | null) => void;
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





