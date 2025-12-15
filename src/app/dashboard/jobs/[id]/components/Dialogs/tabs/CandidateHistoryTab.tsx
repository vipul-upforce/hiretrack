/**
 * History Tab Component for Candidate Details Dialog
 * Displays candidate history, status history, and interview assignment
 */

import { Candidate } from '@/types/candidate';
import { User } from '@/lib/features/users/usersApi';
import { ICandidateHistory } from '@/lib/models/history';
import { MessageSquare } from 'lucide-react';
import { Dispatch, SetStateAction } from 'react';
import { candidateDetailsFields } from '../../Candidate/candidate-details-fields';
import { HistoryTimelineSkeleton } from '../../Candidate/history-timeine-skeleton';
import { IEditRemark } from '../../../schemas/EditRemarkDialog';

interface CandidateHistoryTabProps {
  candidate: Candidate;
  user: User | null;
  candidateHistory: ICandidateHistory[] | undefined;
  isHistoryLoading: boolean;
  isRemarkSubmitting: boolean;
  validTimeLineItems: ICandidateHistory[];
  handleRemarkUpdate: (id: string, description: string, isPrivate?: boolean, rating?: number) => void;
  setEditingRemark: Dispatch<SetStateAction<IEditRemark>>
  setIsEditRemarkDialogOpen: (open: boolean) => void;
}

/**
 * Main History Tab Component
 */
export function CandidateHistoryTab({
  candidate,
  user,
  candidateHistory,
  isHistoryLoading,
  isRemarkSubmitting,
  validTimeLineItems,
  handleRemarkUpdate,
  setEditingRemark,
  setIsEditRemarkDialogOpen,
}: CandidateHistoryTabProps) {
  return (
    <div className="space-y-6">
      {/* Candidate History */}
      {user?.role !== 'candidate' && (
        <div className="space-y-4 focus-visible:outline-none">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Candidate History
          </h3>
          {isHistoryLoading && !isRemarkSubmitting ? (
            <div className="bg-card border border-border rounded-lg p-6">
              <HistoryTimelineSkeleton />
            </div>
          ) : candidateHistory && candidateHistory.length > 0 ? (
            candidateDetailsFields
              .find((field) => field.id === 'candidate-history')
              ?.render(
                { ...candidate, history: candidateHistory },
                user,
                validTimeLineItems,
                handleRemarkUpdate,
                setEditingRemark,
                setIsEditRemarkDialogOpen,
                false, // showHeader = false
              )
          ) : candidateHistory && candidateHistory.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-6">
              <HistoryTimelineSkeleton />
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No history found</h3>
              <p className="text-muted-foreground">
                No history entries found for this candidate.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Status History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Status History
        </h3>
        {candidateDetailsFields
          .find((field) => field.id === 'status-history')
          ?.render(candidate, user)}
      </div>

      {/* Interview Assignment */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Interview Assignment
        </h3>
        {candidateDetailsFields
          .find((field) => field.id === 'interview-assignment')
          ?.render(candidate, user)}
      </div>
    </div>
  );
}
