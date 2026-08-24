'use client';

import { useEmailHistory } from './hooks/use-email-history';
import { EmailHistoryToolbar } from './components/email-history-toolbar';
import { EmailHistoryTable } from './components/email-history-table';
import { EmailDetailsDialog } from './components/email-details-dialog';
import EmailHistorySkeleton from './components/email-history-skeleton';

export function EmailHistory() {
  const {
    emails,
    totalPages,
    selectedEmail,
    loading,
    page,
    statusFilter,
    rawSearch,
    setPage,
    setSelectedEmail,
    handleSearchChange,
    handleStatusChange,
    refetch,
    isRefreshing,
  } = useEmailHistory();

  return (
    <div className="space-y-4">
      <EmailHistoryToolbar
        searchTerm={rawSearch}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
        onRefresh={refetch}
        isRefreshing={isRefreshing}
      />

      {loading ? (
        <EmailHistorySkeleton />
      ) : (
        <EmailHistoryTable
          emails={emails}
          loading={loading}
          page={page}
          totalPages={totalPages}
          setPage={setPage}
          onViewEmail={setSelectedEmail}
        />
      )}

      <EmailDetailsDialog
        email={selectedEmail}
        onClose={() => setSelectedEmail(null)}
      />
    </div>
  );
}
