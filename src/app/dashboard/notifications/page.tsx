'use client';

import React from 'react';
import { useNotificationsPage } from './hooks/use-notification';
import { NotificationsHeader } from './components/notification-header';
import { NotificationsFilters } from './components/notification-filters';
import { NotificationsList } from './components/notification-list';
import { NotificationsPagination } from './components/notification-pagination';
import { CandidateDetailsDialog } from '../jobs/[id]/components/Dialogs/candidate-details-dialog';

export default function NotificationsPage() {
  const {
    setCurrentPage,
    filterType,
    setFilterType,
    filterRead,
    setFilterRead,
    filterPriority,
    setFilterPriority,
    isCandidateDialogOpen,
    setIsCandidateDialogOpen,
    selectedCandidate,
    user,

    // Data
    notifications,
    pagination,
    unreadCount,
    notificationsLoading,
    availableNotificationTypes,
    limit,

    // Actions
    handleRefresh,
    handleClearFilters,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleNotificationClick,
    handleCandidateUpdate,
    openCandidateDetails,
  } = useNotificationsPage();

  const hasActiveFilters =
    filterType !== 'all' || filterRead !== 'all' || filterPriority !== 'all';

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <NotificationsHeader
        unreadCount={unreadCount}
        onRefresh={handleRefresh}
        onMarkAllRead={handleMarkAllAsRead}
      />

      {/* Filters */}
      <NotificationsFilters
        filterType={filterType}
        setFilterType={setFilterType}
        filterRead={filterRead}
        setFilterRead={setFilterRead}
        filterPriority={filterPriority}
        setFilterPriority={setFilterPriority}
        availableTypes={availableNotificationTypes}
        onClearFilters={handleClearFilters}
      />

      {/* Main Content List */}
      <NotificationsList
        notifications={notifications}
        isLoading={notificationsLoading}
        onItemClick={handleNotificationClick}
        onMarkRead={handleMarkAsRead}
        pagination={pagination}
        limit={limit}
        hasFilters={hasActiveFilters}
      />

      {/* Footer Pagination */}
      {pagination && (
        <NotificationsPagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          hasPrev={pagination.hasPrev}
          hasNext={pagination.hasNext}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Dialogs */}
      <CandidateDetailsDialog
        candidate={selectedCandidate}
        isOpen={isCandidateDialogOpen}
        onOpenChange={setIsCandidateDialogOpen}
        onViewDetails={openCandidateDetails}
        onUpdate={handleCandidateUpdate}
        hideEditButton={user?.role === 'interviewer'}
        hideCloseButtons={false}
      />
    </div>
  );
}
