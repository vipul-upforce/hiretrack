import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppSelector } from '@/lib/redux/hooks';
import { HistoryAndLogTableProps } from './types';
import { useHistoryAndLogState } from './hooks/useHistoryAndLogState';
import { useHistoryFiltering } from './hooks/useHistoryFiltering';
import { useLogsTableData } from './hooks/useLogsTableData';
import { HistoryTimelineHeader } from './components/HistoryTimelineHeader';
import { LogsTableHeader } from './components/LogsTableHeader';
import { LogTableRow } from './components/LogTableRow';
import { HistoryTimeline } from './components/HistoryTimeline';

/**
 * Main component for displaying candidate history and logs
 * Supports toggling between timeline view and logs table view
 */
export function HistoryAndLogTable({
  candidate,
  timeLineItems,
  handleRemarkUpdate,
  setEditingRemark,
  setIsEditRemarkDialogOpen,
  showHeader = true,
}: HistoryAndLogTableProps) {
  const { showLogTable, setShowLogTable } = useHistoryAndLogState();
  const { user } = useAppSelector((state) => state.auth);
  const filteredTimelineItems = useHistoryFiltering(timeLineItems, user);
  const logsTableData = useLogsTableData(timeLineItems, user);

  if (user?.role === 'candidate') return null;

  const handleToggle = () => {
    if (user?.role !== 'interviewer') {
      setShowLogTable((prev) => !prev);
    }
  };

  return (
    <div className="space-y-4">
      {showHeader && (
        <HistoryTimelineHeader
          showLogTable={showLogTable}
          onToggle={handleToggle}
        />
      )}
      {showLogTable ? (
        <div className="rounded-md border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-black">
          <div className="overflow-x-auto">
            {logsTableData.length > 0 ? (
              <Table className="w-[130%] text-sm">
                <TableHeader>
                  <LogsTableHeader />
                </TableHeader>
                <TableBody>
                  {logsTableData.length > 0 ? (
                    logsTableData.map((rowData) => (
                      <LogTableRow
                        key={`${rowData.interviewIndex}-${rowData.logIndex}-${rowData.interview.dateTime}`}
                        interview={rowData.interview}
                        interviewIndex={rowData.interviewIndex}
                        log={rowData.log}
                        logIndex={rowData.logIndex}
                        timeDate={rowData.timeDate}
                        timeTime={rowData.timeTime}
                      />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="p-2 text-center text-gray-500"
                      >
                        Candidate Info Updates Will Be Listed Here
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : (
              <div className="w-full text-center text-gray-900 dark:text-gray-100">
                No Logs Yet.
              </div>
            )}
          </div>
        </div>
      ) : (
        <HistoryTimeline
          timeLineItems={filteredTimelineItems}
          candidate={candidate}
          handleRemarkUpdate={handleRemarkUpdate}
          setEditingRemark={setEditingRemark}
          setIsEditRemarkDialogOpen={setIsEditRemarkDialogOpen}
        />
      )}
    </div>
  );
}

// Export LogsTable component for standalone use
export { LogsTable } from './components/LogsTable';
