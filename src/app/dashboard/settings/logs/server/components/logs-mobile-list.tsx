import { Button } from '@/components/ui/button';
import { Calendar, Eye } from 'lucide-react';
import {
  formatDate,
  formatTime,
} from '@/app/dashboard/jobs/[id]/hooks/dateTimeFormatting';
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
    <div className="md:hidden p-3 space-y-3">
      {logs.map((log, i) => (
        <div
          key={`${log.candidateId}-${i}`}
          role="button"
          tabIndex={0}
          onClick={() => onViewDetails(log.candidateId)}
          className="rounded-lg border bg-card p-3 shadow-sm hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium text-pretty">{renderTitle(log)}</div>
              {log.note?.description
                && typeof log.note.description === 'string' && (
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
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
              <span className="font-medium truncate">
                {log.candidateData?.name || 'Unknown'}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {log.candidateData?.email || '—'}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Job</span>
              <span className="font-medium truncate">
                {log.jobData?.title || '—'}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {(log.jobData?.skills || []).slice(0, 3).join(', ') || '—'}
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
