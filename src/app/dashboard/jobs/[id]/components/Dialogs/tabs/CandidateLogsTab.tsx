/**
 * Logs Tab Component for Candidate Details Dialog
 * Displays update logs for the candidate
 */

import { Candidate } from '@/types/candidate';
import { User } from '@/lib/features/users/usersApi';
import { ICandidateHistory } from '@/lib/models/history';
import { LogsTable } from '../../Candidate/HisotryAndLogTable';

interface CandidateLogsTabProps {
  candidate: Candidate;
  user: User | null;
  isHistoryLoading: boolean;
  historyLoaded: boolean;
  validTimeLineItems: ICandidateHistory[];
}

/**
 * Main Logs Tab Component
 */
export function CandidateLogsTab({
  candidate,
  user,
  isHistoryLoading,
  historyLoaded,
  validTimeLineItems,
}: CandidateLogsTabProps) {
  if (isHistoryLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="ml-2 text-sm text-muted-foreground">Loading Logs...</span>
      </div>
    );
  }

  if (user?.role === 'interviewer' || user?.role === 'candidate') {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Update Logs
      </h3>
      <LogsTable
        isLoading={!historyLoaded}
        candidate={candidate}
        user={user}
        timeLineItems={validTimeLineItems}
      />
    </div>
  );
}
