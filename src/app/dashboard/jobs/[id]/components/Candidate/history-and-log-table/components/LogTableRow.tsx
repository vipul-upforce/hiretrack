import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { ICandidateHistory, IinfoUpdateLog } from '@/lib/models/history';
import AttachmentsPopover from '../../../Remarks/attachments-popover';

interface LogTableRowProps {
  interview: ICandidateHistory;
  interviewIndex: number;
  log: IinfoUpdateLog;
  logIndex: number;
  timeDate: string;
  timeTime: string;
}

/**
 * Individual log table row component
 */
export function LogTableRow({
  interview,
  interviewIndex,
  log,
  logIndex,
  timeDate,
  timeTime,
}: LogTableRowProps) {
  return (
    <TableRow
      key={`${interviewIndex}-${logIndex}-${interview.dateTime}`}
      className="border-b border-gray-200 dark:border-gray-700"
    >
      <TableCell className="w-[250px] p-2 text-gray-900 dark:text-gray-100">
        {logIndex === 0 ? `${timeDate} ${timeTime}` : ''}
      </TableCell>
      <TableCell className="w-[250px] p-2 text-gray-900 dark:text-gray-100">
        {log.title.replace('Updated ', '') ?? log.title ?? 'N/A'}
      </TableCell>
      <TableCell className="max-w-[200px] whitespace-pre-wrap break-words p-2 text-gray-900 dark:text-gray-100">
        {(!log.attachments &&
          JSON.stringify(log.previousValue as string)
            ?.replaceAll('"', '')
            ?.replace('~', '')) ??
          'N/A'}
      </TableCell>
      <TableCell className="max-w-[250px] whitespace-pre-wrap break-words p-2 text-gray-900 dark:text-gray-100">
        {log.attachments && log.attachments.length > 0 ? (
          <AttachmentsPopover
            attachments={log.attachments.map((file, index) => ({
              id: `${interviewIndex}-${logIndex}-${index}-${file.name}`,
              name: file.name,
              url: file.url || '#',
              type: file.type,
              size: file.size,
            }))}
            onMoreClick={() => null}
          />
        ) : (
          ''
        )}
        {(!log.attachments &&
          JSON.stringify(log.currentValue as string)
            .replaceAll('"', '')
            .replace('~', '')) ??
          'N/A'}
      </TableCell>
      <TableCell className="w-[250px] whitespace-pre-wrap break-words p-2 text-gray-900 dark:text-gray-100">
        {typeof interview.assignmentBy === 'object' &&
        interview.assignmentBy &&
        'name' in interview.assignmentBy &&
        typeof interview.assignmentBy.name === 'string'
          ? interview.assignmentBy.name
          : ''}
      </TableCell>
    </TableRow>
  );
}
