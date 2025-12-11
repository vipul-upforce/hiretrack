import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Eye } from 'lucide-react';
import {
  formatDate,
  formatTime,
} from '@/app/dashboard/jobs/[id]/hooks/dateTimeFormatting';
import React from 'react';
import { LogEntry } from '../types';

interface LogsDesktopTableProps {
  logs: LogEntry[];
  renderTitle: (log: LogEntry) => React.ReactNode;
  onViewDetails: (id: string) => void;
}

export function LogsDesktopTable({
  logs,
  renderTitle,
  onViewDetails,
}: LogsDesktopTableProps) {
  return (
    <div className="hidden overflow-x-auto px-4 md:block">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-[220px] text-xs uppercase tracking-wider text-muted-foreground">
              Title
            </TableHead>
            <TableHead className="min-w-[200px] text-xs uppercase tracking-wider text-muted-foreground">
              Candidate
            </TableHead>
            <TableHead className="min-w-[220px] text-xs uppercase tracking-wider text-muted-foreground">
              Job
            </TableHead>
            <TableHead className="min-w-[160px] text-xs uppercase tracking-wider text-muted-foreground">
              Date
            </TableHead>
            <TableHead className="min-w-[160px] text-xs uppercase tracking-wider text-muted-foreground">
              Updated By
            </TableHead>
            <TableHead className="min-w-[100px] text-right text-xs uppercase tracking-wider text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log, i) => (
            <TableRow
              onClick={() => onViewDetails(log.candidateId)}
              // eslint-disable-next-line react/no-array-index-key
              key={`${log.candidateId}-${i}`}
              className="group cursor-pointer even:bg-muted/30 hover:bg-muted/50"
            >
              <TableCell className="align-top">
                <div className="max-w-[420px] space-y-1">
                  <div className="truncate font-medium">{renderTitle(log)}</div>
                  {log.note?.description &&
                    typeof log.note.description === 'string' && (
                      <div className="line-clamp-2 text-xs text-muted-foreground">
                        {log.note.description}
                      </div>
                    )}
                </div>
              </TableCell>
              <TableCell className="align-top">
                <div className="flex flex-col">
                  <span className="truncate font-medium">
                    {log.candidateData?.name || 'Unknown'}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {log.candidateData?.email || '—'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="align-top">
                <div className="flex flex-col">
                  <span className="truncate font-medium">
                    {log.jobData?.title || '—'}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {(log.jobData?.skills || []).slice(0, 3).join(', ') || '—'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="align-top">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{formatDate(log.dateTime)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatTime(log.dateTime)}
                </div>
              </TableCell>
              <TableCell className="align-top">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {log?.assignmentBy.length
                      ? log?.assignmentBy[0]?.name
                      : 'SELF'}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {log?.assignmentBy.length
                      ? log?.assignmentBy[0]?.email
                      : log?.candidateData?.email}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right align-top">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(log.candidateId);
                  }}
                  aria-label="View details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
