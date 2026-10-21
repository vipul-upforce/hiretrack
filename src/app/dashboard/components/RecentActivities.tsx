'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton'; // Ensure this import exists
import { ChevronRight, Bell } from 'lucide-react';
import Link from 'next/link';
import { INotification } from '@/lib/models/notification';
import { NotificationItem } from '@/components/ui/notifications/NotificationItem';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';

interface RecentActivitiesProps {
  notifications: INotification[];
  isLoading: boolean;
  onNotificationClick?: (notification: INotification) => void;
}

function NotificationSkeletonItem() {
  return (
    <div className="flex items-start gap-3 border-l-2 border-l-transparent p-3">
      {/* Icon Placeholder */}
      <Skeleton className="mt-1 h-4 w-4 rounded-full" />

      {/* Content Placeholder */}
      <div className="min-w-0 flex-1 space-y-2">
        {/* Title Row */}
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-1/3" />
          <div className="flex gap-1">
            <Skeleton className="h-4 w-12 rounded-full" /> {/* Badge */}
            <Skeleton className="h-2 w-2 rounded-full" /> {/* Dot */}
          </div>
        </div>

        {/* Message Rows */}
        <div className="space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>

        {/* Footer/Metadata */}
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

export default function RecentActivities({
  notifications,
  isLoading,
  onNotificationClick,
}: RecentActivitiesProps) {
  if (isLoading) {
    return (
      <Card className="flex h-full flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Recent Notifications</CardTitle>
          <Button variant="ghost" size="sm" className="h-8 text-xs" disabled>
            Show More
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="divide-y divide-border">
            {/* Render 5 skeleton items to fill space */}
            {Array.from({ length: 9 }).map((_, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <NotificationSkeletonItem key={index} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Recent Notifications</CardTitle>
        <Link href="/dashboard/notifications">
          <Button variant="ghost" size="sm" className="h-8 text-xs">
            Show More
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        {notifications && notifications.length > 0 ? (
          <CustomScrollbar className="h-full">
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  onClick={onNotificationClick}
                  className="transition-colors hover:bg-muted/50"
                  disableReadStyling
                />
              ))}
            </div>
          </CustomScrollbar>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <Bell className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No recent notifications
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
