"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Bell } from "lucide-react";
import Link from "next/link";
import { INotification } from "@/lib/models/notification";
import { NotificationItem } from "@/components/ui/notifications/NotificationItem";
import { CustomScrollbar } from "@/components/ui/custom-scrollbar";
import UniqueLoading from "@/components/ui/morph-loading";

interface RecentActivitiesProps {
  notifications: INotification[];
  isLoading: boolean;
  onNotificationClick?: (notification: INotification) => void;
}

export default function RecentActivities({
  notifications,
  isLoading,
  onNotificationClick,
}: RecentActivitiesProps) {
  if (isLoading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center py-8">
          <UniqueLoading variant="morph" size="md" />
          <p className="mt-4 text-sm text-muted-foreground">Loading notifications...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Recent Notifications</CardTitle>
        <Link href="/dashboard/notifications">
          <Button variant="ghost" size="sm" className="h-8 text-xs">
            Show More
            <ChevronRight className="h-4 w-4 ml-1" />
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
                  className="hover:bg-muted/50 transition-colors"
                  disableReadStyling={true}
                />
              ))}
            </div>
          </CustomScrollbar>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No recent notifications</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
