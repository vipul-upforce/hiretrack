import React from 'react';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { NotificationItem } from '@/components/ui/notifications/NotificationItem';
import { BellOff } from 'lucide-react';
import { INotification } from '@/lib/models/notification';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationSkeleton } from './notification-skeleton';

interface NotificationsListProps {
  notifications: INotification[];
  isLoading: boolean;
  onItemClick: (notification: INotification) => void;
  onMarkRead: (id: string) => void;
  pagination?: {
    totalCount: number;
    currentPage: number;
  };
  limit: number;
  hasFilters: boolean;
}

export function NotificationsList({
  notifications,
  isLoading,
  onItemClick,
  onMarkRead,
  pagination,
  limit,
  hasFilters,
}: NotificationsListProps) {
  if (isLoading) {
    return (
      <div className="flex-1 overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-col divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <NotificationSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Header for count
  const renderHeader = () => (
    <div className="flex items-center justify-between border-b border-gray-200 bg-muted/30 px-4 py-3 dark:border-gray-700">
      <h2 className="text-lg font-semibold">
        {pagination
          ? `${pagination.totalCount} Notifications`
          : 'Notifications'}
      </h2>
      {pagination && pagination.totalCount > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {(pagination.currentPage - 1) * limit + 1}-
          {Math.min(pagination.currentPage * limit, pagination.totalCount)} of{' '}
          {pagination.totalCount}
        </div>
      )}
    </div>
  );

  // Empty State
  if (notifications.length === 0) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        {renderHeader()}
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <BellOff className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No notifications found</h3>
          <p className="max-w-md text-muted-foreground">
            {hasFilters
              ? 'No notifications match your current filters. Try adjusting your filters to see more notifications.'
              : "You're all caught up! New notifications will appear here when there's activity."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {renderHeader()}
      <div className="flex-1 overflow-hidden">
        <CustomScrollbar className="h-full">
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkAsRead={onMarkRead}
                onClick={onItemClick}
                className="transition-colors hover:bg-muted/50"
              />
            ))}
          </div>
        </CustomScrollbar>
      </div>
    </div>
  );
}
