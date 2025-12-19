/**
 * History Tab Component for Candidate Details Dialog
 * Displays candidate history, status history, and interview assignment
 */

import { Candidate } from '@/types/candidate';
import { User } from '@/lib/features/users/usersApi';
import { ICandidateHistory } from '@/lib/models/history';
import { MessageSquare } from 'lucide-react';
import React from 'react';
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
  handleRemarkUpdate: (
    id: string,
    description: string,
    isPrivate?: boolean,
    rating?: number,
  ) => void;
  setEditingRemark: React.Dispatch<React.SetStateAction<IEditRemark | null>>;
  setIsEditRemarkDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
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
          {(() => {
            if (isHistoryLoading && !isRemarkSubmitting) {
              return (
                <div className="rounded-lg border border-border bg-card p-6">
                  <HistoryTimelineSkeleton />
                </div>
              );
            }

            if (candidateHistory && candidateHistory.length > 0) {
              return candidateDetailsFields
                .find((field) => field.id === 'candidate-history')
                ?.render(
                  { ...candidate, history: candidateHistory },
                  {
                    id: 'candidate-history',
                    user,
                    timeLineItems: validTimeLineItems,
                    handleRemarkUpdate,
                    setEditingRemark,
                    setIsEditRemarkDialogOpen,
                    showHeader: false, // showHeader = false
                  },
                );
            }

            if (candidateHistory && candidateHistory.length === 0) {
              return (
                <div className="rounded-lg border border-border bg-card p-6">
                  <HistoryTimelineSkeleton />
                </div>
              );
            }

            return (
              <div className="py-8 text-center">
                <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No history found</h3>
                <p className="text-muted-foreground">
                  No history entries found for this candidate.
                </p>
              </div>
            );
          })()}
        </div>
      )}

      {/* Status History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Status History
        </h3>
        {candidateDetailsFields
          .find((field) => field.id === 'status-history')
          ?.render(candidate, { id: 'status-history' })}
      </div>

      {/* Interview Assignment */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Interview Assignment
        </h3>
        {candidateDetailsFields
          .find((field) => field.id === 'interview-assignment')
          ?.render(candidate, { id: 'interview-assignment' })}
      </div>
    </div>
  );
}
