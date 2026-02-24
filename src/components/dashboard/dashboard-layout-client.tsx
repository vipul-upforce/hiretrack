'use client';

import React from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Menu,
  KanbanSquare,
  Calendar,
  Home,
  Users,
  Settings,
  SearchCheckIcon,
  UploadIcon,
  BarChart3Icon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PortalHead from '@/components/layouts/PortalHead';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import SidebarContent from '@/components/layouts/SidebarContent';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { useDashboardLogic } from '@/app/hooks/useDashboardLogic';
import { CandidateDetailsDialog } from '@/app/dashboard/jobs/[id]/components/Dialogs/candidate-details-dialog';

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  role?: string;
}

const sidebarItems: SidebarItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: <Home className="h-5 w-5" />,
  },
  {
    title: 'Search',
    href: '/dashboard/search',
    icon: <SearchCheckIcon className="h-5 w-5" />,
    role: 'interviewer',
  },
  {
    title: 'Jobs',
    href: '/dashboard/jobs-board',
    icon: <KanbanSquare className="h-5 w-5" />,
  },
  {
    title: 'Calendar',
    href: '/dashboard/calendar',
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: <BarChart3Icon className="h-5 w-5" />,
    role: 'admin',
  },
  {
    title: 'Users',
    href: '/dashboard/users',
    icon: <Users className="h-5 w-5" />,
    role: 'admin',
  },
  {
    title: 'CV Upload',
    href: '/dashboard/cv-upload',
    icon: <UploadIcon className="h-5 w-5" />,
    role: 'interviewer',
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: <Settings className="h-5 w-5" />,
    role: 'admin',
  },
];

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    userData,
    portalConfigData,
    isLoading,
    theme,
    isCollapsed,
    handleToggleCollapse,
    handleLogout,
    generateShareOrg,
    notifications,
    candidateDialog,
  } = useDashboardLogic();

  return (
    <OnboardingProvider>
      <div className="flex h-screen w-full max-w-full flex-col overflow-hidden">
        {/* Connection Limit Alert (Handles both Warning and Blocking Overlay) */}
      

        {/* Debug: Optional - remove in production */}
        {/* <div className="absolute top-0 right-0 z-50 bg-black text-white p-2">{activeTabCount}</div> */}

        <div className="flex w-full flex-1 overflow-hidden">
          <PortalHead isLoading={isLoading} />

          {/* Desktop Sidebar */}
          <aside
            className={cn(
              'hidden h-full border-r bg-background transition-all duration-300 md:block',
              isCollapsed ? 'w-[70px]' : 'w-[240px]',
            )}
          >
            <SidebarContent
              isCollapsed={isCollapsed}
              onToggleCollapse={handleToggleCollapse}
              userData={userData}
              portalConfigData={portalConfigData ?? null}
              isLoading={isLoading}
              theme={theme}
              sidebarItems={sidebarItems}
              notificationsData={notifications.data}
              notificationCountData={notifications.countData}
              notificationsLoading={notifications.isLoading}
              isNotificationDropdownOpen={notifications.isOpen}
              onNotificationDropdownChange={notifications.setIsOpen}
              onMarkAsRead={notifications.onMarkAsRead}
              fetchNotifications={notifications.fetch}
              onMarkAllAsRead={notifications.onMarkAllAsRead}
              onNotificationClick={notifications.onClick}
              onPageChange={notifications.setPage}
              onGenerateShareOrg={generateShareOrg}
              onLogout={handleLogout}
              unreadCount={notifications.unreadCount}
              totalCount={notifications.totalCount}
            />
          </aside>

          {/* Mobile Sidebar */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="fixed left-4 top-4 z-40 md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] p-0">
              <SidebarContent
                isCollapsed={false}
                onToggleCollapse={handleToggleCollapse}
                userData={userData}
                portalConfigData={portalConfigData ?? null}
                isLoading={isLoading}
                theme={theme}
                sidebarItems={sidebarItems}
                notificationsData={notifications.data}
                notificationCountData={notifications.countData}
                notificationsLoading={notifications.isLoading}
                isNotificationDropdownOpen={notifications.isOpen}
                onNotificationDropdownChange={notifications.setIsOpen}
                onMarkAsRead={notifications.onMarkAsRead}
                fetchNotifications={notifications.fetch}
                onMarkAllAsRead={notifications.onMarkAllAsRead}
                onNotificationClick={notifications.onClick}
                onPageChange={notifications.setPage}
                onGenerateShareOrg={generateShareOrg}
                onLogout={handleLogout}
                unreadCount={notifications.unreadCount}
                totalCount={notifications.totalCount}
              />
            </SheetContent>
          </Sheet>

          {/* Main Content */}
          <main className="relative h-full w-full flex-1 overflow-hidden">
            <div className="h-full w-full overflow-hidden">
              <NotificationsProvider
                notifications={notifications.data?.notifications || []}
                isLoading={notifications.isLoading}
                refetch={notifications.fetch}
              >
                {children}
              </NotificationsProvider>
            </div>
          </main>

          {/* Candidate Details Dialog for Interviewers */}
          <CandidateDetailsDialog
            candidate={candidateDialog.selectedCandidate}
            isOpen={candidateDialog.isOpen}
            onOpenChange={candidateDialog.setIsOpen}
            onUpdate={candidateDialog.refetch}
            hideEditButton={userData?.role === 'interviewer'}
            hideCloseButtons={false}
          />

          {/* Onboarding Modal */}
          <OnboardingModal />
        </div>
      </div>
    </OnboardingProvider>
  );
}
