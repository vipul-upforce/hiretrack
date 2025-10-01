"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import {
  User,
  Briefcase,
  Calendar,
  MessageSquare,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Check,
} from "lucide-react";
import { INotification, NotificationType } from "@/lib/models/notification";

interface NotificationItemProps {
  notification: INotification;
  onMarkAsRead?: (id: string) => void;
  onClick?: (notification: INotification) => void;
  className?: string;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.CANDIDATE_APPLIED:
    case NotificationType.CANDIDATE_ASSIGNED:
    case NotificationType.CANDIDATE_UNASSIGNED:
    case NotificationType.CANDIDATE_STATUS_UPDATED:
    case NotificationType.CANDIDATE_DETAILS_UPDATED:
      return <User className="h-4 w-4" />;
    case NotificationType.JOB_CREATED:
    case NotificationType.JOB_UPDATED:
      return <Briefcase className="h-4 w-4" />;
    case NotificationType.MEETING_SCHEDULED:
    case NotificationType.MEETING_UPDATED:
    case NotificationType.MEETING_CANCELLED:
      return <Calendar className="h-4 w-4" />;
    case NotificationType.REMARK_ADDED:
      return <MessageSquare className="h-4 w-4" />;
    case NotificationType.USER_ADDED:
      return <UserPlus className="h-4 w-4" />;
    case NotificationType.FOLLOWUP_ADDED:
    case NotificationType.FOLLOWUP_UPDATED:
    case NotificationType.FOLLOWUP_REMOVED:
      return <Clock className="h-4 w-4" />;
    case NotificationType.CHECKLIST_COMPLETED:
      return <CheckCircle className="h-4 w-4" />;
    // case NotificationType.EMAIL_FAILED:
    //   return <AlertCircle className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "text-red-500";
    case "medium":
      return "text-yellow-500";
    case "low":
      return "text-blue-500";
    default:
      return "text-gray-500";
  }
};

const getPriorityBadgeVariant = (priority: string) => {
  switch (priority) {
    case "high":
      return "destructive" as const;
    case "medium":
      return "secondary" as const;
    case "low":
      return "outline" as const;
    default:
      return "outline" as const;
  }
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
  className,
}: NotificationItemProps) {
  const handleClick = () => {
    // Only perform the action, don't mark as read automatically
    if (onClick) {
      onClick(notification);
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMarkAsRead) {
      onMarkAsRead(notification._id);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  });

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors cursor-pointer border-l-2",
        notification.isRead
          ? "border-l-transparent opacity-75"
          : "border-l-primary bg-accent/20",
        className
      )}
      onClick={handleClick}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 mt-0.5",
          getPriorityColor(notification.priority)
        )}
      >
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4
            className={cn(
              "text-sm font-medium leading-tight",
              notification.isRead ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {notification.title}
          </h4>
          <div className="flex items-center gap-1 flex-shrink-0">
            {notification.priority !== "medium" && (
              <Badge
                variant={getPriorityBadgeVariant(notification.priority)}
                className="text-xs px-1.5 py-0.5"
              >
                {notification.priority}
              </Badge>
            )}
            {!notification.isRead && onMarkAsRead && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-accent"
                onClick={handleMarkAsRead}
                title="Mark as read"
              >
                <Check className="h-3 w-3" />
              </Button>
            )}
            {!notification.isRead && (
              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
            )}
          </div>
        </div>

        <p
          className={cn(
            "text-sm leading-relaxed",
            notification.isRead ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {notification.message}
        </p>

        {/* Metadata */}
        {notification.triggerUserName && (
          <p className="text-xs text-muted-foreground">
            by {notification.triggerUserName}
          </p>
        )}

        <span className="text-xs text-muted-foreground">{timeAgo}</span>
      </div>
    </div>
  );
}
