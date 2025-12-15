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
    <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border-l-4 border-amber-400 dark:border-amber-500">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Bell className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            {candidate.followUp.date && (
              <div className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">
                {formatDate(candidate.followUp.date)}
                {' '}
                at
                {' '}
                {formatTime(candidate.followUp.date)}
              </div>
            )}
            {candidate.followUp.note && (
              <>
                {parsed.userNotes.map((note, index) => (
                  <div key={`note-${index}`} className="relative">
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-tight line-clamp-2 break-words">
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
                      <p className="text-xs text-amber-800 dark:text-amber-200 leading-tight line-clamp-2 break-words font-semibold">
                        {parsed.completionNote}
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
            {candidate.followUp.userId && (
              <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Created by:
                {' '}
                <span className="font-bold">{candidate.followUp.userId.name}</span>
              </div>
            )}
          </div>
        </div>
        {user?.role !== 'candidate' && user?.role !== 'interviewer' && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 transition-colors duration-200"
            >
              <Edit className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
