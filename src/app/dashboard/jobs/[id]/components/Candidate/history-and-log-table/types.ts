import React from 'react';
import { Candidate } from '@/types/candidate';
import { ICandidateHistory } from '@/lib/models/history';
import { IEditRemark } from '../../../schemas/EditRemarkDialog';

export interface HistoryAndLogTableProps {
  candidate: Candidate;
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
  timeLineItems: ICandidateHistory[];
  isLoading: boolean;
}
