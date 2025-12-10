'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { NotificationItem } from '@/components/ui/notifications/NotificationItem';
import { useLazyFetchCandidateByIdQuery } from '@/lib/features/candidate/candidateApi';
import {
  BellOff,
  Check,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useGetNotificationsQuery,
  useGetNotificationCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} from '@/lib/features/notifications/notificationsApi';
import { useToast } from '@/hooks/use-toast';
import { NotificationType } from '@/lib/models/notification';
import { User } from '@/lib/features/users/usersApi';
import { Candidate } from '@/types/candidate';
import { useSelector } from 'react-redux';
import logger from '@/lib/logger';
import { CandidateDetailsDialog } from '../jobs/[id]/components/Dialogs/candidate-details-dialog';

export default function NotificationsPage() {
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  // const [user, setUser] = useState<User | null>(null);
  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {},
  );
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = useState(false);

  const limit = 20;

  // Build query parameters
  const queryParams = {
    page: currentPage,
    limit,
    ...(filterType !== 'all' && { type: filterType }),
    ...(filterRead !== 'all' && { isRead: filterRead === 'read' }),
    ...(filterPriority !== 'all' && { priority: filterPriority }),
  };

  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    refetch: refetchNotifications,
  } = useGetNotificationsQuery(queryParams);

  const { data: notificationCountData } = useGetNotificationCountQuery(
    undefined,
    {
      pollingInterval: 30000,
    },
  );

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [fetchCandidateById] = useLazyFetchCandidateByIdQuery();

  const handleNotificationClick = async (notification: any) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    // For interviewers, handle candidate-related and meeting notifications by opening dialog
    if (
      (notification.relatedEntity === 'candidate' ||
        notification.relatedEntity === 'meeting' ||
        notification.relatedEntity === 'checklist' ||
        notification.relatedEntity === 'followup') &&
      notification.relatedId
    ) {
      try {
        const result = await fetchCandidateById(notification.relatedId);
        if (result.data) {
          setSelectedCandidate(result.data);
          setIsCandidateDialogOpen(true);
        }
      } catch (error) {
        logger.error('Failed to fetch candidate:', error);
        toast({
          title: 'Error',
          description: 'Failed to load candidate details',
          variant: 'destructive',
        });
      }
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id).unwrap();
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead().unwrap();
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = () => {
    refetchNotifications();
  };

  const notifications = notificationsData?.notifications || [];
  const pagination = notificationsData?.pagination;
  const unreadCount = notificationCountData?.unreadCount || 0;

  // Get available notification types for filter based on user role
  const getNotificationTypesForRole = (
    userRole?: string,
  ): NotificationType[] => {
    const allTypes = Object.values(NotificationType);

    if (!userRole || userRole === 'admin') {
      return allTypes; // Admin sees all types
    }

    if (userRole === 'hr') {
      // HR sees candidate, job, user, and system related notifications
      return allTypes.filter(
        (type) =>
          type === NotificationType.NEW_APPLICATIONS ||
          type === NotificationType.STATUS_UPDATES ||
          type === NotificationType.CANDIDATE_DETAILS_UPDATED ||
          type === NotificationType.INTERVIEW_ASSIGNMENTS ||
          type === NotificationType.STEP_COMPLETED ||
          type === NotificationType.CANDIDATE_REJECTED ||
          type === NotificationType.NEW_REMARKS ||
          type === NotificationType.MEETING_SCHEDULED ||
          type === NotificationType.MEETING_UPDATED ||
          type === NotificationType.MEETING_CANCELLED ||
          type === NotificationType.FOLLOWUP_ADDED ||
          type === NotificationType.FOLLOWUP_UPDATED ||
          type === NotificationType.FOLLOWUP_REMOVED ||
          type === NotificationType.JOB_CREATED ||
          type === NotificationType.JOB_UPDATED ||
          type === NotificationType.CANDIDATE_MOVED ||
          type === NotificationType.BULK_IMPORT_COMPLETED ||
          type === NotificationType.INTERVIEW_COMPLETED,
      );
    }

    if (userRole === 'interviewer') {
      // Interviewers see only candidate and meeting related notifications
      return allTypes.filter(
        (type) =>
          type === NotificationType.INTERVIEW_ASSIGNMENTS ||
          type === NotificationType.STEP_COMPLETED ||
          type === NotificationType.MEETING_SCHEDULED ||
          type === NotificationType.MEETING_UPDATED ||
          type === NotificationType.MEETING_CANCELLED ||
          type === NotificationType.NEW_REMARKS,
      );
    }

    return allTypes; // Fallback to all types
  };

  const notificationTypes = getNotificationTypesForRole(user?.role);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Header section */}
      <div className="flex-shrink-0 border-b border-gray-200 px-4 pb-2 dark:border-gray-700">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="flex flex-col gap-y-2 px-0 py-3 md:flex-row md:items-center md:justify-between">
            {/* Title */}
            <CardTitle className="line-clamp-2 text-xl font-bold md:mr-2">
              Notifications
            </CardTitle>

            {/* Right Section - Actions and Badge */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="font-medium">
                    {unreadCount} unread
                  </Badge>
                )}
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                {unreadCount > 0 && (
                  <Button
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    variant="primary"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Mark all read
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Filters section */}
      <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex flex-col items-end gap-4 sm:flex-row">
          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {notificationTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filterRead} onValueChange={setFilterRead}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(filterType !== 'all' ||
            filterRead !== 'all' ||
            filterPriority !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterType('all');
                setFilterRead('all');
                setFilterPriority('all');
                setCurrentPage(1);
              }}
              className="h-9"
            >
              <Filter className="mr-2 h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden px-4">
        <div className="flex h-full flex-col">
          {/* Notifications header */}
          <div className="flex items-center justify-between border-b border-gray-200 py-3 dark:border-gray-700">
            <h2 className="text-lg font-semibold">
              {pagination
                ? `${pagination.totalCount} Notifications`
                : 'Notifications'}
            </h2>
            {pagination && pagination.totalCount > 0 && (
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.currentPage - 1) * limit + 1}-
                {Math.min(
                  pagination.currentPage * limit,
                  pagination.totalCount,
                )}{' '}
                of {pagination.totalCount}
              </div>
            )}
          </div>

          {/* Notifications content */}
          <div className="flex-1 overflow-hidden">
            {notificationsLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading notifications...
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <BellOff className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">
                  No notifications found
                </h3>
                <p className="max-w-md text-muted-foreground">
                  {filterType !== 'all' ||
                  filterRead !== 'all' ||
                  filterPriority !== 'all'
                    ? 'No notifications match your current filters. Try adjusting your filters to see more notifications.'
                    : "You're all caught up! New notifications will appear here when there's activity."}
                </p>
              </div>
            ) : (
              <CustomScrollbar className="h-full">
                <div className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification._id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onClick={handleNotificationClick}
                      className="transition-colors hover:bg-muted/50"
                    />
                  ))}
                </div>
              </CustomScrollbar>
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 py-3 dark:border-gray-700">
              <div className="text-sm text-muted-foreground">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrev}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPage(pagination.currentPage - 1);
                  }}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNext}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPage(pagination.currentPage + 1);
                  }}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Candidate Details Dialog for Interviewers */}
      <CandidateDetailsDialog
        candidate={selectedCandidate}
        isOpen={isCandidateDialogOpen}
        onOpenChange={setIsCandidateDialogOpen}
        onUpdate={() => {
          // Optionally refresh candidate data
          if (selectedCandidate) {
            fetchCandidateById(selectedCandidate._id);
          }
        }}
        hideEditButton={user?.role === 'interviewer'}
        hideCloseButtons={false}
      />
    </div>
  );
}
