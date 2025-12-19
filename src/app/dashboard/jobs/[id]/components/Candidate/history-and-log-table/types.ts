import React from 'react';
import { Candidate } from '@/types/candidate';
import { ICandidateHistory } from '@/lib/models/history';
import { User } from '@/lib/features/users/usersApi';
import { IEditRemark } from '../../../schemas/EditRemarkDialog';

export interface HistoryAndLogTableProps {
  candidate: Candidate;
  user: User | null;
  timeLineItems: ICandidateHistory[];
  handleRemarkUpdate: (
    id: string,
    description: string,
    isPrivate?: boolean,
  ) => void;
  setEditingRemark: React.Dispatch<React.SetStateAction<IEditRemark | null>>;
  setIsEditRemarkDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showHeader?: boolean;
}

export interface LogsTableProps {
  candidate: Candidate;
  user: User | null;
  timeLineItems: ICandidateHistory[];
  isLoading: boolean;
}
