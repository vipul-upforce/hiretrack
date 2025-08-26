"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CustomScrollbar } from "@/components/ui/custom-scrollbar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { NotificationItem } from "./NotificationItem";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ExternalLink
} from "lucide-react";
import { INotification } from "@/lib/models/notification";

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
  className
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
    <div className={cn("w-80 h-[450px] bg-popover border rounded-md shadow-lg flex flex-col ml-2", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <h3 className="font-semibold text-sm">Notifications</h3>
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
      <div className="flex-1 min-h-0 relative pr-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading notifications...
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
            <BellOff className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No notifications</p>
            <p className="text-xs text-muted-foreground mt-1">
              You're all caught up!
            </p>
          </div>
        ) : (
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