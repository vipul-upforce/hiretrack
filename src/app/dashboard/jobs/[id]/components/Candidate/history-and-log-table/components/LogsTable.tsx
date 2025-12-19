import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { IinfoUpdateLog } from '@/lib/models/history';
import AttachmentsPopover from '../../../Remarks/attachments-popover';
import { formatDate, formatTime } from '../../../../hooks/dateTimeFormatting';
import { LogsTableSkeleton } from '../../logs-table-skeleton';
import { LogsTableProps } from '../types';

/**
 * Standalone logs table component for displaying candidate update logs
 */
export function LogsTable({ user, timeLineItems, isLoading }: LogsTableProps) {
  const tableRows = timeLineItems
    .sort(
      (a, b) =>
        new Date(b?.dateTime ?? 0).getTime() -
        new Date(a?.dateTime ?? 0).getTime(),
    )
    .filter((interview) => {
      if (!interview.remark || !interview.remark.description) {
        return true;
      }
      return (
        !interview.remark.isPrivate ||
        user?.role === 'hr' ||
        user?.role === 'admin'
      );
    })
    .flatMap((interview, i) => {
      const timeDate = formatDate(interview.dateTime);
      const timeTime = formatTime(interview.dateTime);
      if (
        typeof interview.currentInterviewer === 'object' &&
        interview.currentInterviewer &&
        'email' in interview.currentInterviewer &&
        typeof interview.previousInterviewer === 'object' &&
        interview.previousInterviewer &&
        'email' in interview.previousInterviewer &&
        interview.currentInterviewer !== null &&
        interview.currentInterviewer?.email ===
          interview.previousInterviewer?.email &&
        (!interview.note || !interview.note.description)
      ) {
        return [];
      }
      const isLogTableEntry =
        interview.note &&
        interview.note.description &&
        Array.isArray(interview.note.description);
      if (!isLogTableEntry) return [];

      return (interview.note.description as IinfoUpdateLog[]).map(
        (log: IinfoUpdateLog, logIndex: number) => (
          <TableRow
            key={`${log.title}-${interview.dateTime}`}
            className="border-b border-border transition-colors hover:bg-muted/50"
          >
            <TableCell className="px-4 py-3 text-sm font-medium text-foreground">
              {logIndex === 0 ? `${timeDate} ${timeTime}` : ''}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-foreground">
              {log.title.replace('Updated ', '') ?? log.title ?? 'N/A'}
            </TableCell>
            <TableCell className="max-w-xs truncate px-4 py-3 text-sm text-muted-foreground">
              {(() => {
                // Case 1: Array of files (attachments)
                if (
                  Array.isArray(log.previousValue) &&
                  log.previousValue.length > 0 &&
                  log.previousValue[0] &&
                  log.previousValue[0].name
                ) {
                  return (
                    <AttachmentsPopover
                      attachments={log.previousValue.map((file, index) => ({
                        id: `${i}-${logIndex}-${index}-${file.name}`,
                        name: file?.name,
                        url: file?.url || file?.base64 || '#',
                        type: file?.type,
                        size: file?.size,
                      }))}
                      onMoreClick={() => null}
                    />
                  );
                }

                // Case 2: Single file-like object (attachment)
                if (
                  typeof log.previousValue === 'object' &&
                  log.previousValue !== null
                ) {
                  const fileObj = log.previousValue as {
                    id?: string | number;
                    name?: string;
                    url?: string;
                    base64?: string;
                    type?: string;
                    size?: number;
                  };
                  return (
                    <AttachmentsPopover
                      attachments={[
                        {
                          id:
                            'id' in fileObj
                              ? String(fileObj.id)
                              : `${i}-${logIndex}-single`,
                          name:
                            'name' in fileObj &&
                            typeof fileObj.name === 'string'
                              ? fileObj.name
                              : 'unknown',
                          url:
                            ('url' in fileObj && typeof fileObj.url === 'string'
                              ? fileObj.url
                              : '') ||
                            ('base64' in fileObj &&
                            typeof fileObj.base64 === 'string'
                              ? fileObj.base64
                              : '') ||
                            '#',
                          type:
                            'type' in fileObj &&
                            typeof fileObj.type === 'string'
                              ? fileObj.type
                              : '',
                          size:
                            'size' in fileObj &&
                            typeof fileObj.size === 'number'
                              ? fileObj.size
                              : 0,
                        },
                      ]}
                      onMoreClick={() => null}
                    />
                  );
                }

                // Case 3: Fallback to stringified previous value
                const str =
                  typeof log.previousValue === 'string'
                    ? log.previousValue
                    : JSON.stringify(log?.previousValue as string)
                        ?.replaceAll('"', '')
                        ?.replace('~', ' ');
                return str || 'N/A';
              })()}
            </TableCell>
            <TableCell className="max-w-xs truncate px-4 py-3 text-sm text-muted-foreground">
              {log.attachments && log.attachments.length > 0 ? (
                <AttachmentsPopover
                  attachments={log.attachments.map((file, index) => ({
                    id: `${i}-${logIndex}-${index}-${file.name}`,
                    name: file.name,
                    url: file.url || file.base64 || '#',
                    type: file.type,
                    size: file.size,
                  }))}
                  onMoreClick={() => null}
                />
              ) : (
                ' '
              )}
              {(!log.attachments &&
                JSON.stringify(log.currentValue as string)
                  ?.replaceAll('"', '')
                  ?.replace('~', '')) ??
                'N/A'}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm font-medium text-foreground">
              {typeof interview.assignmentBy === 'object' &&
              interview.assignmentBy &&
              'name' in interview.assignmentBy &&
              typeof interview.assignmentBy.name === 'string'
                ? interview.assignmentBy.name
                : '—'}
            </TableCell>
          </TableRow>
        ),
      );
    });

  if (isLoading) {
    return <LogsTableSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          {tableRows.length > 0 ? (
            <Table className="w-full text-sm">
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead className="px-4 py-3 text-left font-semibold text-foreground">
                    Updated At
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-foreground">
                    Fields Updated
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-foreground">
                    Previous Value
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-foreground">
                    New Value
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left font-semibold text-foreground">
                    Updated By
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.length > 0 ? (
                  tableRows
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No updates yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="w-full py-12 text-center text-muted-foreground">
              <p className="text-sm">No logs available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
