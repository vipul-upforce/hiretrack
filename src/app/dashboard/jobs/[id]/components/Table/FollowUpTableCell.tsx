'use client';

import { CalendarClock } from 'lucide-react';
import { Candidate } from '@/types/candidate';
import {
  useFollowUpParsing,
  getMostRecentUserNote,
  isValidFollowUpDate,
} from '../../hooks/useFollowUpParsing';
import { formatDate, formatTime } from '../../hooks/dateTimeFormatting';

interface FollowUpTableCellProps {
  candidate: Candidate;
}

/**
 * Renders follow-up date and parsed notes in the table view,
 * matching kanban card behavior (separator-stripped notes).
 */
export function FollowUpTableCell({ candidate }: FollowUpTableCellProps) {
  const parsed = useFollowUpParsing(candidate);
  const { followUp } = candidate;

  const hasDate = isValidFollowUpDate(followUp?.date);
  const noteText = getMostRecentUserNote(parsed);

  if (!hasDate && !noteText) {
    return (
      <span className="text-xs text-center text-muted-foreground opacity-50">
        -
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {hasDate && followUp?.date && (
        <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[11px] font-bold">
            {formatDate(followUp.date)} at {formatTime(followUp.date)}
          </span>
        </div>
      )}
      {noteText && (
        <span className="max-w-[250px] truncate text-[12px] text-muted-foreground">
          {noteText}
        </span>
      )}
    </div>
  );
}
