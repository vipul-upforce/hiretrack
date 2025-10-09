"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomScrollbar } from "@/components/ui/custom-scrollbar";
import { Separator } from "@/components/ui/separator";
import { NotificationItem } from "@/components/ui/notifications/NotificationItem";
import { CandidateDetailsDialog } from "../jobs/[id]/components/Dialogs/candidate-details-dialog";
import { useLazyFetchCandidateByIdQuery } from "@/lib/features/candidate/candidateApi";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import Cookies from "js-cookie";
import {
  Bell,
  BellOff,
  Check,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetNotificationsQuery,
  useGetNotificationCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} from "@/lib/features/notifications/notificationsApi";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { NotificationType } from "@/lib/models/notification";
import { User } from "@/lib/features/users/usersApi";
import { Candidate } from "@/types/candidate";
import { useSelector } from "react-redux";

export default function NotificationsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterRead, setFilterRead] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  // const [user, setUser] = useState<User | null>(null);
  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {}
  );
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = useState(false);

  const limit = 20;

  // Build query parameters
  const queryParams = {
    page: currentPage,
    limit,
    ...(filterType !== "all" && { type: filterType }),
    ...(filterRead !== "all" && { isRead: filterRead === "read" }),
    ...(filterPriority !== "all" && { priority: filterPriority }),
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
    }
  );

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [fetchCandidateById] = useLazyFetchCandidateByIdQuery();

  // Get user info
  // useEffect(() => {
  //   const token = Cookies.get("token");
  //   if (token) {
  //     verifyAndDecryptJWTToken(token).then((decryptedResponse) => {
  //       if (decryptedResponse.success && decryptedResponse.user) {
  //         setUser(decryptedResponse.user);
  //       }
  //     });
  //   }
  // }, []);

  const handleNotificationClick = async (notification: any) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    // For interviewers, handle candidate-related and meeting notifications by opening dialog
    if (
      user?.role === "interviewer" &&
      (notification.relatedEntity === "candidate" ||
        notification.relatedEntity === "meeting") &&
      notification.relatedId
    ) {
      try {
        const result = await fetchCandidateById(notification.relatedId);
        if (result.data) {
          setSelectedCandidate(result.data);
          setIsCandidateDialogOpen(true);
          return;
        }
      } catch (error) {
        console.error("Failed to fetch candidate:", error);
        toast({
          title: "Error",
          description: "Failed to load candidate details",
          variant: "destructive",
        });
      }
    }

    // For admin/hr or non-candidate notifications, navigate to the page
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id).unwrap();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead().unwrap();
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    refetchNotifications();
  };

  const notifications = notificationsData?.notifications || [];
  const pagination = notificationsData?.pagination;
  const unreadCount = notificationCountData?.unreadCount || 0;
  const totalCount = notificationCountData?.totalCount || 0;

  // Get available notification types for filter based on user role
  const getNotificationTypesForRole = (
    userRole?: string
  ): NotificationType[] => {
    const allTypes = Object.values(NotificationType);

    if (!userRole || userRole === "admin") {
      return allTypes; // Admin sees all types
    }

    if (userRole === "hr") {
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
          type === NotificationType.CHECKLIST_COMPLETED ||
          type === NotificationType.JOB_CREATED ||
          type === NotificationType.JOB_UPDATED ||
          // type === NotificationType.USER_ADDED ||
          type === NotificationType.BULK_IMPORT_COMPLETED ||
          type === NotificationType.INTERVIEW_COMPLETED
        // type === NotificationType.EMAIL_FAILED
      );
    }

    if (userRole === "interviewer") {
      // Interviewers see only candidate and meeting related notifications
      return allTypes.filter(
        (type) =>
          type === NotificationType.INTERVIEW_ASSIGNMENTS ||
          type === NotificationType.STEP_COMPLETED ||
          type === NotificationType.MEETING_SCHEDULED ||
          type === NotificationType.MEETING_UPDATED ||
          type === NotificationType.MEETING_CANCELLED ||
          type === NotificationType.NEW_REMARKS
        // type === NotificationType.FOLLOWUP_ADDED ||
        // type === NotificationType.FOLLOWUP_UPDATED ||
        // type === NotificationType.FOLLOWUP_REMOVED ||
        // type === NotificationType.CHECKLIST_COMPLETED ||
        // type === NotificationType.CANDIDATE_STATUS_UPDATED ||
        // type === NotificationType.CANDIDATE_DETAILS_UPDATED
      );
    }

    return allTypes; // Fallback to all types
  };

  const notificationTypes = getNotificationTypesForRole(user?.role);

  return (
    <div className="h-screen flex flex-col overflow-hidden w-full">
      {/* Header section */}
      <div className="flex-shrink-0 px-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-y-2 py-3 px-0">
            {/* Title */}
            <CardTitle className="line-clamp-2 md:mr-2 text-xl font-bold">
              Notifications
            </CardTitle>

            {/* Right Section - Actions and Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
              <div className="flex gap-2 items-center">
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="font-medium">
                    {unreadCount} unread
                  </Badge>
                )}
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                {unreadCount > 0 && (
                  <Button
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    variant="primary"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mark all read
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Filters section */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
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
                        .replace(/_/g, " ")
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

          {(filterType !== "all" ||
            filterRead !== "all" ||
            filterPriority !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterType("all");
                setFilterRead("all");
                setFilterPriority("all");
                setCurrentPage(1);
              }}
              className="h-9"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden px-4">
        <div className="h-full flex flex-col">
          {/* Notifications header */}
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">
              {pagination
                ? `${pagination.totalCount} Notifications`
                : "Notifications"}
            </h2>
            {pagination && pagination.totalCount > 0 && (
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.currentPage - 1) * limit + 1}-
                {Math.min(
                  pagination.currentPage * limit,
                  pagination.totalCount
                )}{" "}
                of {pagination.totalCount}
              </div>
            )}
          </div>

          {/* Notifications content */}
          <div className="flex-1 overflow-hidden">
            {notificationsLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading notifications...
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No notifications found
                </h3>
                <p className="text-muted-foreground max-w-md">
                  {filterType !== "all" ||
                  filterRead !== "all" ||
                  filterPriority !== "all"
                    ? "No notifications match your current filters. Try adjusting your filters to see more notifications."
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
                      className="hover:bg-muted/50 transition-colors"
                    />
                  ))}
                </div>
              </CustomScrollbar>
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
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
                  <ChevronLeft className="h-4 w-4 mr-1" />
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
                  <ChevronRight className="h-4 w-4 ml-1" />
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
        hideEditButton={user?.role === "interviewer"}
        hideCloseButtons={false}
      />
    </div>
  );
}
