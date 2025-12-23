import { Button } from '@/components/ui/button';
import { Calendar, Eye } from 'lucide-react';
import {
  formatDate,
  formatTime,
} from '@/app/dashboard/jobs/[id]/hooks/dateTimeFormatting';
import React from 'react';
import { LogEntry } from '../types';

interface LogsMobileListProps {
  logs: LogEntry[];
  renderTitle: (log: LogEntry) => React.ReactNode;
  onViewDetails: (id: string) => void;
}

export function LogsMobileList({
  logs,
  renderTitle,
  onViewDetails,
}: LogsMobileListProps) {
  return (
    <div className="space-y-3 p-3 md:hidden">
      {logs.map((log) => (
        <div
          key={`${log.dateTime}+${log.title}+${log.candidateId}`}
          role="button"
          tabIndex={0}
          onClick={() => onViewDetails(log.candidateId)}
          className="rounded-lg border bg-card p-3 shadow-sm transition-colors hover:bg-muted/40"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-pretty font-medium">{renderTitle(log)}</div>
              {log.note?.description &&
                typeof log.note.description === 'string' && (
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {log.note.description}
                  </div>
                )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              aria-label="View details"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(log.candidateId);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Candidate</span>
              <span className="truncate font-medium">
                {log.candidateData?.name || 'Unknown'}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {log.candidateData?.email || '—'}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Job</span>
              <span className="truncate font-medium">
                {log.jobData?.title || '—'}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {(() => {
                  const skills = log.jobData?.skills;

                  if (!skills) {
                    return '—';
                  }

                  // Ensure we have an array (handle 'string' vs 'string[]')
                  const skillList = Array.isArray(skills) ? skills : [skills];

                  // Process the array
                  return skillList.slice(0, 3).join(', ') || '—';
                })()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{formatDate(log.dateTime)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatTime(log.dateTime)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
