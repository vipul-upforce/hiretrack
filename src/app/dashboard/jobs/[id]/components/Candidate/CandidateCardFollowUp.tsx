/**
 * Candidate Card Follow-up Section Component
 * Displays follow-up reminder with notes and actions
 */

import { Bell, Edit, Trash2 } from 'lucide-react';
import { Candidate } from '@/types/candidate';
import { User } from '@/lib/features/users/usersApi';
import { formatDate, formatTime } from '../../hooks/dateTimeFormatting';
import { useFollowUpParsing } from '../../hooks/useFollowUpParsing';

interface CandidateCardFollowUpProps {
  candidate: Candidate;
  user: User | null;
  onEdit: () => void;
  onRemove: () => void;
}

export function CandidateCardFollowUp({
  candidate,
  user,
  onEdit,
  onRemove,
}: CandidateCardFollowUpProps) {
  const parsed = useFollowUpParsing(candidate);

  if (!candidate.followUp?.date && !candidate.followUp?.note) {
    return null;
  }

  return (
    <div className="mb-2 rounded border-l-4 border-amber-400 bg-amber-50 p-2 dark:border-amber-500 dark:bg-amber-900/20">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Bell className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0 flex-1">
            {candidate.followUp.date && (
              <div className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                {formatDate(candidate.followUp.date)} at{' '}
                {formatTime(candidate.followUp.date)}
              </div>
            )}
            {candidate.followUp.note && (
              <>
                {parsed.userNotes.map((note) => (
                  <div
                    key={`note-${Math.random().toString(36).substr(2, 9)}`}
                    className="relative"
                  >
                    <p className="line-clamp-2 break-words text-xs leading-tight text-amber-800 dark:text-amber-200">
                      {note}
                    </p>
                  </div>
                ))}
                {parsed.completionNote && (
                  <>
                    {parsed.userNotes.length > 0 && (
                      <hr className="my-2 border-t border-amber-300 dark:border-amber-600" />
                    )}
                    <div className="relative">
                      <p className="line-clamp-2 break-words text-xs font-semibold leading-tight text-amber-800 dark:text-amber-200">
                        {parsed.completionNote}
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
            {candidate.followUp.userId && (
              <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                Created by:{' '}
                <span className="font-bold">
                  {candidate.followUp.userId.name}
                </span>
              </div>
            )}
          </div>
        </div>
        {user?.role !== 'candidate' && user?.role !== 'interviewer' && (
          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-amber-600 transition-colors duration-200 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
            >
              <Edit className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="text-red-500 transition-colors duration-200 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
