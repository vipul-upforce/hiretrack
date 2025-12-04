'use client';

import { CandidateDetailsDialog } from '@/app/dashboard/jobs/[id]/components/Dialogs/candidate-details-dialog';
import { ServerHistoryLogsProps } from './types';
import { useServerLogsLogic } from './hooks/use-server-logs-logic';
import { FilterBar } from './components/filter-bar';
import { LogsLoadingState } from './components/logs-loading-state';
import { LogsEmptyState } from './components/logs-empty-state';
import { LogsMobileList } from './components/logs-mobile-list';
import { LogsDesktopTable } from './components/logs-desktop-table';
import { LogsPagination } from './components/logs-pagination';

export function ServerHistoryLogs(props: ServerHistoryLogsProps) {
  const {
    historyLogs,
    totalHistoryLines,
    selectedCandidate,
    renderLogTitle,
    historyPage,
    historyPageSize,
    rawSearch,
    historyBusy,
    historyOffset,
    refetch,
    setHistoryPage,
    handlePageSizeChange,
    handleSearchChange,
    handleCandidateModalDetail,
    closeCandidateModal,
  } = useServerLogsLogic(props);

  return (
    <div className="flex-1 flex flex-col pb-8">
      {/* Filter Bar */}
      <FilterBar
        searchTerm={rawSearch}
        onSearchChange={handleSearchChange}
        onRefresh={refetch}
        isRefreshing={historyBusy}
        pageSize={historyPageSize}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Data Container */}
      <div className="flex-1 overflow-hidden border rounded-lg bg-card/50 shadow-sm">
        <div className="max-h-[75vh] overflow-auto">
          {historyBusy ? (
            <LogsLoadingState />
          ) : historyLogs.length === 0 ? (
            <LogsEmptyState />
          ) : (
            <>
              {/* Mobile View */}
              <LogsMobileList
                logs={historyLogs}
                renderTitle={renderLogTitle}
                onViewDetails={handleCandidateModalDetail}
              />

              {/* Desktop View */}
              <LogsDesktopTable
                logs={historyLogs}
                renderTitle={renderLogTitle}
                onViewDetails={handleCandidateModalDetail}
              />
            </>
          )}
        </div>

        {/* Pagination */}
        <LogsPagination
          currentPage={historyPage}
          setPage={setHistoryPage}
          totalLines={totalHistoryLines}
          pageSize={historyPageSize}
          currentOffset={historyOffset}
          currentLogCount={historyLogs.length}
        />
      </div>

      {/* Candidate Details Dialog */}
      {selectedCandidate && (
        <CandidateDetailsDialog
          candidate={selectedCandidate}
          isOpen={!!selectedCandidate}
          onOpenChange={(open: boolean) => {
            if (!open) closeCandidateModal();
          }}
          onUpdate={() => {}}
          hideCloseButtons={false}
        />
      )}
    </div>
  );
}
