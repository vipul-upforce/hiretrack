import { useMemo } from 'react';
import { ICandidateHistory, IinfoUpdateLog } from '@/lib/models/history';
import { ILocalUser } from '@/lib/redux/authSlice';
import { formatDate, formatTime } from '../../../../hooks/dateTimeFormatting';

export interface LogTableRowData {
  interview: ICandidateHistory;
  interviewIndex: number;
  log: IinfoUpdateLog;
  logIndex: number;
  timeDate: string;
  timeTime: string;
}

/**
 * Processes timeline items into log table row data
 * @param timeLineItems - Array of candidate history items
 * @param user - Current user object
 * @returns Array of log table row data objects
 */
export function useLogsTableData(
  timeLineItems: ICandidateHistory[],
  user: ILocalUser | null,
): LogTableRowData[] {
  const tableRowsData = useMemo(
    () =>
      timeLineItems
        ?.sort(
          (a, b) =>
            new Date(b?.dateTime ?? 0).getTime() -
            new Date(a?.dateTime ?? 0).getTime(),
        )
        ?.filter((interview) => {
          // Filter private remarks
          if (!interview.remark || !interview.remark.description) {
            return true;
          }
          return (
            !interview.remark.isPrivate ||
            user?.role === 'hr' ||
            user?.role === 'admin'
          );
        })
        ?.flatMap((interview, i) => {
          const timeDate = formatDate(interview.dateTime);
          const timeTime = formatTime(interview.dateTime);

          // Filter out duplicate interviewer assignments
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

          // Check if this is a log table entry
          const isLogTableEntry =
            interview.note &&
            interview.note.description &&
            Array.isArray(interview.note.description);
          if (!isLogTableEntry) return [];

          return (interview.note.description as IinfoUpdateLog[]).map(
            (log: IinfoUpdateLog, logIndex) => ({
              interview,
              interviewIndex: i,
              log,
              logIndex,
              timeDate,
              timeTime,
            }),
          );
        }),
    [timeLineItems, user],
  );

  return tableRowsData;
}
