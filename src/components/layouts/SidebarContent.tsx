import React, { memo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, LogOut, Link2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationButton } from '@/components/ui/notifications';
import OnboardingSidebar from '@/components/onboarding/OnboardingSidebar';
import type { IUser } from '@/lib/models/user';
import { ILocalUser } from '@/lib/redux/authSlice';
import { PortalConfigData } from '@/lib/features/settings';
import type { INotification } from '@/lib/models/notification';
import type {
  NotificationsResponse,
  NotificationCountResponse,
} from '@/lib/features/notifications/notificationsApi';
import SidebarLogo from './SidebarLogo';

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  role?: string;
}

interface SidebarContentProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  userData: ILocalUser | IUser | null;
  portalConfigData: PortalConfigData | null;
  isLoading: boolean;
  theme: string;
  sidebarItems: SidebarItem[];
  notificationsData: NotificationsResponse | undefined;
  notificationCountData: NotificationCountResponse | undefined;
  notificationsLoading: boolean;
  isNotificationDropdownOpen: boolean;
  onNotificationDropdownChange: (open: boolean) => void;
  onMarkAsRead: (id: string) => void;
  fetchNotifications: () => void;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: INotification) => void;
  onPageChange: (page: number) => void;
  onGenerateShareOrg: (e: React.FormEvent) => void;
  onLogout: () => void;
  unreadCount: number;
  totalCount: number;
}

/**
 * Memoized Sidebar Content Component
 * Only re-renders when specific props actually change
 */
const SidebarContent = memo(
  ({
    isCollapsed,
    onToggleCollapse,
    userData,
    portalConfigData,
    isLoading,
    theme,
    sidebarItems,
    notificationsData,
    notificationCountData,
    notificationsLoading,
    isNotificationDropdownOpen,
    onNotificationDropdownChange,
    onMarkAsRead,
    fetchNotifications,
    onMarkAllAsRead,
    onNotificationClick,
    onPageChange,
    onGenerateShareOrg,
    onLogout,
    unreadCount,
    totalCount,
  }: SidebarContentProps) => {
    const pathname = usePathname();
    const STORAGE_KEY = 'portal_sidebar_collapsed';

    // Save state to Local Storage whenever isCollapsed changes
    useEffect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(isCollapsed));
    }, [isCollapsed]);

    // Load state from Local Storage on initial mount
    useEffect(() => {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState !== null) {
        const shouldBeCollapsed = JSON.parse(savedState);
        
        if (shouldBeCollapsed !== isCollapsed) {
          onToggleCollapse();
        }
      }
    }, []);

    const getUserInitials = (name?: string) => {
      if (!name) return 'U';
      return name
        .split(' ')
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    return (
      <div className="flex h-full flex-col">
        <div
          className={cn(
            'flex items-center transition-all duration-200',
            isCollapsed
              ? 'h-16 justify-center px-2'
              : 'h-16 justify-between px-4',
          )}
        >
          {isCollapsed ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-8 w-8 flex-shrink-0 rounded-full"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4 rotate-0 transition-transform duration-1000 ease-in-out" />
            </Button>
          ) : (
            <>
              <div className="flex flex-1 items-center justify-center">
                <SidebarLogo
                  portalLogo={portalConfigData?.portalLogo?.url}
                  portalLogoDark={portalConfigData?.portalLogoDark?.url}
                  portalName={portalConfigData?.portalName}
                  theme={theme}
                  isLoading={isLoading}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="h-8 w-8 flex-shrink-0 rounded-full"
                aria-label="Collapse sidebar"
              >
                <ChevronRight className="h-4 w-4 rotate-180 transition-transform duration-1000 ease-in-out" />
              </Button>
            </>
          )}
        </div>
        <div className="mt-2 flex-1 px-3">
          <div className="space-y-2">
            {sidebarItems.map((item) => {
              if (
                (item.role === 'admin' && userData?.role !== 'admin') ||
                (item.role === 'hr' &&
                  userData?.role !== 'admin' &&
                  userData?.role !== 'hr') ||
                (userData?.role === 'interviewer' && item.title === 'Jobs') ||
                (userData?.role === 'interviewer' && item.title === 'Search') ||
                (userData?.role === 'interviewer' && item.title === 'CV Upload')
              ) {
                return null;
              }
              const isActive =
                (item.title === 'Settings' &&
                  pathname &&
                  pathname.startsWith('/dashboard/settings')) ||
                (item.title === 'Analytics' &&
                  pathname &&
                  pathname.startsWith('/dashboard/analytics')) ||
                (item.title === 'Email History' &&
                  pathname &&
                  pathname.startsWith('/dashboard/email-history')) ||
                pathname === item.href;

              return (
                <Link key={item.href} href={item.href}>
                  <span
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent',
                      isActive && 'portal-nav-active',
                      isCollapsed ? 'justify-center' : 'justify-start',
                    )}
                    style={
                      isActive
                        ? {
                            backgroundColor:
                              'rgba(var(--portal-primary-rgb, 99, 102, 241), 0.1)',
                            color: 'var(--portal-primary, #6366f1)',
                            borderLeft:
                              '3px solid var(--portal-primary, #6366f1)',
                          }
                        : {}
                    }
                  >
                    {item.icon}
                    <span className={cn('', isCollapsed && 'hidden')}>
                      {item.title}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Onboarding Widget - only show for admin users */}
          {userData?.role === 'admin' && (
            <OnboardingSidebar isCollapsed={isCollapsed} />
          )}
        </div>
        <div className="mt-auto space-y-2 px-3 pb-4">
          {/* Notifications and Theme Toggle */}
          <div
            className={cn(
              'mb-2 flex items-center justify-start gap-2',
              isCollapsed ? 'flex-col' : 'flex-row',
            )}
          >
            {userData && (
              <NotificationButton
                notifications={notificationsData?.notifications || []}
                unreadCount={
                  unreadCount || notificationCountData?.unreadCount || 0
                }
                totalCount={
                  totalCount || notificationCountData?.totalCount || 0
                }
                currentPage={notificationsData?.pagination?.currentPage || 1}
                totalPages={notificationsData?.pagination?.totalPages || 1}
                isLoading={notificationsLoading}
                onMarkAsRead={onMarkAsRead}
                fetchNotifications={fetchNotifications}
                onMarkAllAsRead={onMarkAllAsRead}
                onNotificationClick={onNotificationClick}
                onPageChange={onPageChange}
                isOpen={isNotificationDropdownOpen}
                onOpenChange={onNotificationDropdownChange}
                className="mr-1"
              />
            )}
            <ThemeToggle
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
            />
          </div>
          <div className="mt-auto space-y-2">
            <div
              className={cn(
                'flex items-center gap-3 rounded-lg border border-border bg-card p-2 transition-all',
                isCollapsed ? 'flex-col justify-center' : 'justify-start',
              )}
            >
              <div className="flex-shrink-0">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ${isCollapsed ? 'aspect-ratio-square h-6 w-6' : 'ring-2 ring-border'}`}
                >
                  {getUserInitials(userData?.name)}
                </div>
              </div>
              {!isCollapsed && (
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {userData?.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {userData?.email}
                  </p>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-full ${isCollapsed ? 'ml-0' : 'ml-auto'}`}
                onClick={onGenerateShareOrg}
                title="Copy Portal URL"
              >
                <Link2Icon className="h-4 w-4" />
                <span className="sr-only">Copy Portal URL</span>
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive transition-all hover:bg-destructive/10 hover:text-destructive',
              isCollapsed ? 'justify-center' : 'justify-start',
            )}
            onClick={onLogout}
          >
            <LogOut className="h-5 w-5" />
            <span className={cn('', isCollapsed && 'hidden')}>Logout</span>
          </Button>
        </div>
      </div>
    );
  },
  // Custom comparison - only re-render when these change
  (prevProps, nextProps) =>
    prevProps.isCollapsed === nextProps.isCollapsed &&
    prevProps.userData?.role === nextProps.userData?.role &&
    prevProps.userData?.name === nextProps.userData?.name &&
    prevProps.userData?.email === nextProps.userData?.email &&
    prevProps.portalConfigData?.portalLogo?.url ===
      nextProps.portalConfigData?.portalLogo?.url &&
    prevProps.portalConfigData?.portalLogoDark?.url ===
      nextProps.portalConfigData?.portalLogoDark?.url &&
    prevProps.portalConfigData?.portalName ===
      nextProps.portalConfigData?.portalName &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.theme === nextProps.theme &&
    prevProps.notificationCountData?.unreadCount ===
      nextProps.notificationCountData?.unreadCount &&
    prevProps.notificationCountData?.totalCount ===
      nextProps.notificationCountData?.totalCount &&
    prevProps.isNotificationDropdownOpen ===
      nextProps.isNotificationDropdownOpen &&
    prevProps.totalCount === nextProps.totalCount &&
    prevProps.unreadCount === nextProps.unreadCount &&
    prevProps.onMarkAllAsRead === nextProps.onMarkAllAsRead &&
    prevProps.onMarkAsRead === nextProps.onMarkAsRead &&
    prevProps.onNotificationClick === nextProps.onNotificationClick &&
    prevProps.onPageChange === nextProps.onPageChange &&
    prevProps.onLogout === nextProps.onLogout,
);

SidebarContent.displayName = 'SidebarContent';

export default SidebarContent;
