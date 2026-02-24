'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  BellOff,
  CheckCheck,
  ExternalLink,
} from 'lucide-react';
import { INotification } from '@/lib/models/notification';
import { NotificationItem } from './NotificationItem';

interface NotificationDropdownProps {
  notifications: INotification[];
  unreadCount: number;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  isLoading?: boolean;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onNotificationClick?: (notification: INotification) => void;
  onPageChange?: (page: number) => void;
  onClose?: () => void;
  onViewAll?: () => void;
  className?: string;
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  totalCount,
  currentPage,
  totalPages,
  isLoading = false,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
  onPageChange,
  onClose,
  onViewAll,
  className,
}: NotificationDropdownProps) {
  const handleNotificationClick = (notification: INotification) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    if (onClose) {
      onClose();
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1);
    }
  };

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div
      className={cn(
        'ml-2 flex h-[450px] w-80 flex-col rounded-md border bg-popover shadow-lg',
        className,
      )}
    >
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && onMarkAllAsRead && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onMarkAllAsRead}
              title="Mark all read"
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleViewAll}
            title="Show all notifications"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="relative min-h-0 flex-1 pr-2">
        {isLoading && (
          <div className="flex h-full min-h-[200px] items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading notifications...
            </div>
          </div>
        )}
        {!isLoading && notifications.length === 0 && (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
            <BellOff className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No notifications</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You&apos;re all caught up!
            </p>
          </div>
        )}
        {!isLoading && notifications.length > 0 && (
          <CustomScrollbar className="h-full">
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  onMarkAsRead={onMarkAsRead}
                  onClick={handleNotificationClick}
                />
              ))}
            </div>
          </CustomScrollbar>
        )}
      </div>

      {/* Footer with Pagination */}
      {totalPages > 1 && (
        <div className="flex-shrink-0 border-t">
          <div className="flex items-center justify-between p-3">
            <div className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages} ({totalCount} total)
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={currentPage <= 1}
                onClick={handlePreviousPage}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={currentPage >= totalPages}
                onClick={handleNextPage}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
