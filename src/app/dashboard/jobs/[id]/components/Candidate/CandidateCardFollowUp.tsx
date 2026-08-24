/**
 * Candidate Follow-up Section Component
 * Displays follow-up reminder with notes and actions
 * Supports both compact (card) and detailed (dialog) variants
 */

import { Bell, Edit, Trash2 } from 'lucide-react';
import { Candidate } from '@/types/candidate';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/lib/redux/hooks';
import { formatDate, formatTime } from '../../hooks/dateTimeFormatting';
import {
  useFollowUpParsing,
  isValidFollowUpDate,
  normalizeFollowUpNote,
} from '../../hooks/useFollowUpParsing';

export type FollowUpVariant = 'compact' | 'detailed';

interface CandidateCardFollowUpProps {
  candidate: Candidate;
  onEdit: () => void;
  onRemove: () => void;
  variant?: FollowUpVariant;
}

export function CandidateCardFollowUp({
  candidate,
  onEdit,
  onRemove,
  variant = 'compact',
}: CandidateCardFollowUpProps) {
  const parsed = useFollowUpParsing(candidate);
  const { user } = useAppSelector((state) => state.auth);

  const { followUp } = candidate;
  const hasFollowUpDate = isValidFollowUpDate(followUp?.date);
  const hasFollowUpNote = Boolean(normalizeFollowUpNote(followUp?.note));

  if (!followUp || (!hasFollowUpDate && !hasFollowUpNote)) {
    return null;
  }

  // Role-based visibility check
  if (user?.role === 'interviewer') {
    return null;
  }

  const isCompact = variant === 'compact';
  const isDetailed = variant === 'detailed';

  // Variant-specific styling
  const containerClasses = cn(
    'rounded border-l-4 border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20',
    isCompact && 'mb-2 p-2',
    isDetailed && 'my-5 p-4',
  );

  const iconSize = isCompact ? 'h-3 w-3' : 'h-5 w-5';
  const iconClasses = cn(
    'mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400',
    iconSize,
  );

  const gapClasses = isCompact ? 'gap-2' : 'gap-3';
  const textSize = isCompact ? 'text-xs' : 'text-sm';

  // Check if user can edit/remove
  const canEdit =
    user?.role !== 'candidate' &&
    user?.role !== 'interviewer' &&
    (user?.role === 'admin' || user?.role === 'hr');

  // Format date based on variant
  const formatFollowUpDate = () => {
    if (!hasFollowUpDate || !followUp.date) return null;

    return `${formatDate(followUp.date)} at ${formatTime(followUp.date)}`;
  };

  return (
    <div className={containerClasses}>
      <div className={cn('flex items-start justify-between', gapClasses)}>
        <div className={cn('flex min-w-0 flex-1 items-start', gapClasses)}>
          <Bell className={iconClasses} />
          <div className="min-w-0 flex-1">
            {isDetailed && (
              <div className="mb-2 flex items-center gap-2">
                <h4
                  className={cn(
                    'font-semibold text-amber-800 dark:text-amber-200',
                    textSize,
                  )}
                >
                  Follow-up Reminder
                </h4>
                {hasFollowUpDate && (
                  <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-700 dark:bg-amber-800/50 dark:text-amber-300">
                    {formatFollowUpDate()}
                  </span>
                )}
              </div>
            )}

            {isCompact && hasFollowUpDate && (
              <div
                className={cn(
                  'mb-1 font-medium text-amber-700 dark:text-amber-300',
                  textSize,
                )}
              >
                {formatFollowUpDate()}
              </div>
            )}

            {(parsed.userNotes.length > 0 || parsed.completionNote) && (
              <>
                {parsed.userNotes.map((note) => {
                  // Create a stable key from note content hash
                  const noteKey = `note-${candidate._id}-${note.slice(0, 20).replace(/\s/g, '-')}`;
                  return (
                    <div key={noteKey} className="relative">
                      <p
                        className={cn(
                          'line-clamp-2 break-words leading-tight text-amber-800 dark:text-amber-200',
                          textSize,
                        )}
                      >
                        {note}
                      </p>
                    </div>
                  );
                })}
                {parsed.completionNote && (
                  <>
                    {parsed.userNotes.length > 0 && (
                      <hr className="my-2 border-t border-amber-300 dark:border-amber-600" />
                    )}
                    <div className="relative">
                      <p
                        className={cn(
                          'line-clamp-2 break-words font-semibold leading-tight text-amber-800 dark:text-amber-200',
                          textSize,
                        )}
                      >
                        {parsed.completionNote}
                      </p>
                    </div>
                  </>
                )}
              </>
            )}

            {followUp.userId && (
              <div
                className={cn(
                  'mt-1 text-amber-700 dark:text-amber-300',
                  textSize,
                )}
              >
                Created by:{' '}
                <span className="font-bold">{followUp.userId.name}</span>
              </div>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-shrink-0 items-center gap-1">
            {isCompact ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="text-amber-600 transition-colors duration-200 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
                  title="Edit Follow-up"
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
                  title="Remove Follow-up"
                >
                  <Trash2 size={12} />
                </button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-100 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-800/30 dark:hover:text-amber-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  title="Edit Follow-up"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-500 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-800/30 dark:hover:text-red-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  title="Remove Follow-up"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
