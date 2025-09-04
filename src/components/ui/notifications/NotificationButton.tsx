"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { NotificationBadge } from "./NotificationBadge";
import { NotificationDropdown } from "./NotificationDropdown";
import { cn } from "@/lib/utils";
import { INotification } from "@/lib/models/notification";
import { useRouter } from "next/navigation";

interface NotificationButtonProps {
  notifications: INotification[];
  unreadCount: number;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  isOpen: boolean;
  onOpenChange: (x: boolean) => void;
  isLoading?: boolean;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onNotificationClick?: (notification: INotification) => void;
  onPageChange?: (page: number) => void;
  className?: string;
  buttonVariant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  fetchNotifications: () => void;
}

export function NotificationButton({
  notifications,
  unreadCount,
  totalCount,
  currentPage,
  totalPages,
  isLoading = false,
  isOpen,
  onOpenChange,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
  onPageChange,
  className,
  buttonVariant = "ghost",
  buttonSize = "icon",
  fetchNotifications,
}: NotificationButtonProps) {
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const router = useRouter();

  // Handle clicks outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onOpenChange]);

  const handleNotificationClick = (notification: INotification) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    onOpenChange(false);
  };

  const handleMarkAsRead = (id: string) => {
    if (onMarkAsRead) {
      onMarkAsRead(id);
    }
    // Don't close dropdown
  };

  const handleMarkAllAsRead = () => {
    if (onMarkAllAsRead) {
      onMarkAllAsRead();
    }
    // Don't close dropdown
  };

  const handleViewAll = () => {
    router.push("/dashboard/notifications");
    onOpenChange(false);
  };

  const handlePageChange = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    }
  };

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant={buttonVariant}
        size={buttonSize}
        className={cn(
          "relative",
          buttonSize === "icon" && "h-8 w-8 rounded-full",
          className
        )}
        onClick={() => {
          onOpenChange(!isOpen);
          if (!isOpen) {
            fetchNotifications();
          }
        }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-4 w-4" />
        <NotificationBadge count={unreadCount} />
      </Button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 z-50"
          style={{ transform: "translateX(280px) translateY(-495px)" }}
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
            onPageChange={handlePageChange}
            onClose={() => onOpenChange(false)}
            onViewAll={handleViewAll}
          />
        </div>
      )}
    </div>
  );
}
