import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, RefreshCw } from 'lucide-react';

interface NotificationsHeaderProps {
  unreadCount: number;
  onRefresh: () => void;
  onMarkAllRead: () => void;
}

export function NotificationsHeader({
  unreadCount,
  onRefresh,
  onMarkAllRead,
}: NotificationsHeaderProps) {
  return (
    <div className="flex-shrink-0 border-b border-gray-200 bg-gradient-to-r from-muted/40 via-background to-muted/20 px-4 py-4 dark:border-gray-700">
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="flex flex-col gap-y-3 px-0 py-0 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Stay on top of new activity, mentions, and interview progress.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {unreadCount > 0 && (
                <Badge
                  variant="secondary"
                  className="font-medium shadow-sm"
                >
                  {unreadCount} unread
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              {unreadCount > 0 && (
                <Button size="sm" onClick={onMarkAllRead} variant="default">
                  <Check className="mr-2 h-4 w-4" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
