"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { NotificationBadge } from "./NotificationBadge";
import { NotificationDropdown } from "./NotificationDropdown";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { INotification } from "@/lib/models/notification";
import { useRouter } from "next/navigation";

interface NotificationButtonProps {
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
  className?: string;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  buttonSize?: "default" | "sm" | "lg" | "icon";
}

export function NotificationButton({
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
  className,
  buttonVariant = "ghost",
  buttonSize = "icon"
}: NotificationButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const router = useRouter();

  const handleNotificationClick = (notification: INotification) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    setIsOpen(false);
  };

  const handleMarkAsRead = (id: string) => {
    if (onMarkAsRead) {
      onMarkAsRead(id);
    }
  };

  const handleMarkAllAsRead = () => {
    if (onMarkAllAsRead) {
      onMarkAllAsRead();
    }
  };

  const handleViewAll = () => {
    router.push("/dashboard/notifications");
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={buttonVariant}
          size={buttonSize}
          className={cn(
            "relative",
            buttonSize === "icon" && "h-8 w-8 rounded-full",
            className
          )}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-4 w-4" />
          <NotificationBadge count={unreadCount} />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        side="bottom" 
        align="end" 
        className="w-80 p-0"
        sideOffset={8}
      >
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          totalCount={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
          isLoading={isLoading}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onNotificationClick={handleNotificationClick}
          onPageChange={onPageChange}
          onClose={() => setIsOpen(false)}
          onViewAll={handleViewAll}
        />
      </PopoverContent>
    </Popover>
  );
}