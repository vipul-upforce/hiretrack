'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import {
  AtSign,
  CalendarCheck,
  CheckCircle,
  FilePlus,
  User,
  Briefcase,
  Calendar,
  MessageSquare,
  UserPlus,
  Clock,
  FileText,
  Check,
} from 'lucide-react';
import { INotification, NotificationType } from '@/lib/models/notification';

interface NotificationItemProps {
  notification: INotification;
  onMarkAsRead?: (id: string) => void;
  onClick?: (notification: INotification) => void;
  className?: string;
  disableReadStyling?: boolean;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.NEW_APPLICATIONS:
      return <FilePlus className="h-4 w-4" />;
    case NotificationType.MENTIONS:
      return <AtSign className="h-4 w-4" />;
    case NotificationType.INTERVIEW_COMPLETED:
      return <CheckCircle className="h-4 w-4" />;
    case NotificationType.MEETING_SCHEDULED:
      return <CalendarCheck className="h-4 w-4" />;
    case NotificationType.INTERVIEW_ASSIGNMENTS:
    case NotificationType.STEP_COMPLETED:
    case NotificationType.STATUS_UPDATES:
    case NotificationType.CANDIDATE_DETAILS_UPDATED:
      return <User className="h-4 w-4" />;
    case NotificationType.JOB_CREATED:
    case NotificationType.JOB_UPDATED:
      return <Briefcase className="h-4 w-4" />;
    case NotificationType.MEETING_UPDATED:
    case NotificationType.MEETING_CANCELLED:
      return <Calendar className="h-4 w-4" />;
    case NotificationType.NEW_REMARKS:
      return <MessageSquare className="h-4 w-4" />;
    case NotificationType.USER_ADDED:
      return <UserPlus className="h-4 w-4" />;
    case NotificationType.FOLLOWUP_ADDED:
    case NotificationType.FOLLOWUP_UPDATED:
    case NotificationType.FOLLOWUP_REMOVED:
      return <Clock className="h-4 w-4" />;
    case NotificationType.CANDIDATE_MOVED:
      return <Briefcase className="h-4 w-4" />;
    // case NotificationType.EMAIL_FAILED:
    //   return <AlertCircle className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'text-red-500';
    case 'medium':
      return 'text-yellow-500';
    case 'low':
      return 'text-blue-500';
    default:
      return 'text-gray-500';
  }
};

const getPriorityBadgeVariant = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'destructive' as const;
    case 'medium':
      return 'secondary' as const;
    case 'low':
      return 'outline' as const;
    default:
      return 'outline' as const;
  }
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
  className,
  disableReadStyling = false,
}: NotificationItemProps) {
  const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const highlightValues = [
    notification.metadata?.candidateName,
    notification.metadata?.jobTitle,
    notification.metadata?.interviewerName,
  ]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);

  const uniqueHighlights = Array.from(new Set(highlightValues));

  const renderMessage = (message: string) => {
    if (uniqueHighlights.length === 0) return message;

    const pattern = uniqueHighlights
      .map((value) => escapeRegExp(value))
      .sort((a, b) => b.length - a.length)
      .join('|');

    const regex = new RegExp(`(${pattern})`, 'gi');
    const parts = message.split(regex);

    return parts.map((part, index) => {
      const isMatch = uniqueHighlights.some(
        (value) => value.toLowerCase() === part.toLowerCase(),
      );

      if (!isMatch) {
        // eslint-disable-next-line react/no-array-index-key
        return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
      }

      return (
        // eslint-disable-next-line react/no-array-index-key
        <strong key={`${part}-${index}`} className="font-bold">
          {part}
        </strong>
      );
    });
  };
  const handleClick = () => {
    // Only perform the action, don't mark as read automatically
    if (onClick) {
      onClick(notification);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
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
      {...(onClick && {
        role: 'button',
        tabIndex: 0,
        onClick: handleClick,
        onKeyDown: handleKeyDown,
        'aria-label': `${notification.title}. ${notification.message}`,
      })}
      className={cn(
        'flex items-start gap-3 border-l-2 p-3 transition-colors',
        onClick &&
        'cursor-pointer hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        notification.isRead
          ? 'border-l-transparent opacity-75'
          : 'border-l-primary bg-accent/20',
        className,
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'mt-0.5 flex-shrink-0',
          getPriorityColor(notification.priority),
        )}
      >
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4
            className={cn(
              'text-sm font-medium leading-tight',
              !disableReadStyling && notification.isRead
                ? 'text-muted-foreground'
                : 'text-foreground',
            )}
          >
            {notification.title}
          </h4>
          <div className="flex flex-shrink-0 items-center gap-1">
            {notification.priority !== 'medium' && (
              <Badge
                variant={getPriorityBadgeVariant(notification.priority)}
                className="px-1.5 py-0.5 text-xs"
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
              <div className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
            )}
          </div>
        </div>

        <p
          className={cn(
            'text-sm leading-relaxed',
            !disableReadStyling && notification.isRead
              ? 'text-muted-foreground'
              : 'text-foreground',
          )}
        >
          {renderMessage(notification.message)}
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
