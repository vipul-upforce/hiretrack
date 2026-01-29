'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useCustomFields } from '@/Custom_Fields/hooks/use-customFields';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { setAllowMultipleOrgs } from '@/lib/features/org/orgSlice';
import { useLogoutUserMutation } from '@/lib/features/auth/authApi';
import { useGetPortalConfigsQuery } from '@/lib/features/settings';
import {
  useGetNotificationsQuery,
  useGetNotificationCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} from '@/lib/features/notifications/notificationsApi';
import {
  useGetOrganizationAllowanceQuery,
  useCheckOrgQuery,
} from '@/lib/features/org/orgApi';
import { useLazyFetchCandidateByIdQuery } from '@/lib/features/candidate/candidateApi';
import { useNotificationSSE } from '@/hooks/useNotificationSSE';
import { ILocalUser } from '@/lib/redux/authSlice';
import { INotification } from '@/lib/models/notification';
import { Candidate } from '@/types/candidate';
import logger from '@/lib/logger';
import { useTheme } from '@/components/theme-provider';

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

const darkenColor = (hex: string, percent: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = (100 - percent) / 100;
  const r = Math.round(rgb.r * factor);
  const g = Math.round(rgb.g * factor);
  const b = Math.round(rgb.b * factor);

  const result =
    r.toString(16).padStart(2, '0') +
    g.toString(16).padStart(2, '0') +
    b.toString(16).padStart(2, '0');
  return `#${result}`;
};

const lightenColor = (hex: string, percent: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = percent / 100;
  const r = Math.round(rgb.r + (255 - rgb.r) * factor);
  const g = Math.round(rgb.g + (255 - rgb.g) * factor);
  const b = Math.round(rgb.b + (255 - rgb.b) * factor);

  const result =
    r.toString(16).padStart(2, '0') +
    g.toString(16).padStart(2, '0') +
    b.toString(16).padStart(2, '0');
  return `#${result}`;
};

export const useDashboardLogic = () => {
  const router = useRouter();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { setUserLoggedIn } = useCustomFields();
  const { theme } = useTheme();

  // State
  const [userData, setUserData] = useState<ILocalUser | null>(null);
  const [hasMultipleOrgs, seHasMultipleOrgs] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notificationPage, setNotificationPage] = useState(1);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] =
    useState(false);
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );

  // API Queries
  const {
    data: portalConfigData,
    isLoading: isPortalLoading,
    refetch: refetchPortal,
  } = useGetPortalConfigsQuery(undefined);

  const { data: allowanceData } = useGetOrganizationAllowanceQuery();

  const { data: orgCheckData } = useCheckOrgQuery(
    user?.organizationId as string,
    { skip: !user },
  );

  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    refetch: fetchNotifications,
  } = useGetNotificationsQuery(
    { page: notificationPage, limit: 10 },
    { skip: !userData },
  );

  const { data: notificationCountData } = useGetNotificationCountQuery(
    undefined,
    { skip: !userData },
  );

  // Mutations
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [fetchCandidateById] = useLazyFetchCandidateByIdQuery();
  const [triggerLogout] = useLogoutUserMutation();

  // SSE
  const { unreadCount, totalCount } = useNotificationSSE(
    notificationCountData?.unreadCount || 0,
    notificationCountData?.totalCount || 0,
  );

  // Handle Org Allowance
  useEffect(() => {
    if (allowanceData) {
      seHasMultipleOrgs(allowanceData.allow);
      dispatch(setAllowMultipleOrgs(allowanceData.allow));
    }
  }, [allowanceData, dispatch]);

  // Handle Org Existence Check
  useEffect(() => {
    if (orgCheckData && !orgCheckData.exists) {
      triggerLogout().then(() => {
        router.push('/auth/login');
      });
    }
  }, [orgCheckData, triggerLogout, dispatch, router]);

  // Handle User Data
  useEffect(() => {
    if (user) {
      setUserLoggedIn(true);
      setUserData(user);
    }
  }, [user]);

  // Handle Notification Refresh via SSE
  // useEffect(() => {
  //   if (
  //     totalCount >= 0 &&
  //     notificationCountData &&
  //     totalCount !== notificationCountData.totalCount
  //   ) {
  //     fetchNotifications();
  //   }
  // }, [unreadCount]);

  // Handle Responsive Sidebar
  useEffect(() => {
    const handleResize = () => {
      const isSmallScreen = window.innerWidth < 1200;
      const userPreference = sessionStorage.getItem('sidebar-user-preference');

      if (isSmallScreen) {
        if (userPreference === 'expanded') {
          setIsCollapsed(false);
        } else {
          setIsCollapsed(true);
        }
      } else {
        if (userPreference === 'collapsed') {
          setIsCollapsed(true);
          return;
        }
        setIsCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Portal Colors Injection
  useEffect(() => {
    if (portalConfigData?.primaryColor && portalConfigData?.secondaryColor) {
      const root = document.documentElement;
      root.style.setProperty('--portal-primary', portalConfigData.primaryColor);
      root.style.setProperty(
        '--portal-secondary',
        portalConfigData.secondaryColor,
      );

      const primaryRgb = hexToRgb(portalConfigData.primaryColor);
      const secondaryRgb = hexToRgb(portalConfigData.secondaryColor);

      if (primaryRgb) {
        root.style.setProperty(
          '--portal-primary-rgb',
          `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`,
        );
        root.style.setProperty(
          '--portal-primary-hover',
          darkenColor(portalConfigData.primaryColor, 10),
        );
        root.style.setProperty(
          '--portal-primary-light',
          lightenColor(portalConfigData.primaryColor, 10),
        );
        root.style.setProperty(
          '--focus-ring-color',
          `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.2)`,
        );
        root.style.setProperty(
          '--input-border-focus',
          portalConfigData.primaryColor,
        );
      }

      if (secondaryRgb) {
        root.style.setProperty(
          '--portal-secondary-rgb',
          `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`,
        );
        root.style.setProperty(
          '--portal-secondary-hover',
          darkenColor(portalConfigData.secondaryColor, 10),
        );
        root.style.setProperty(
          '--portal-secondary-light',
          lightenColor(portalConfigData.secondaryColor, 10),
        );
      }
    }
  }, [portalConfigData]);

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const newState = !prev;
      sessionStorage.setItem(
        'sidebar-user-preference',
        newState ? 'collapsed' : 'expanded',
      );
      return newState;
    });
  }, []);

  const handleLogout = async () => {
    try {
      await triggerLogout().unwrap();
    } catch (error) {
      logger.error('Logout failed', error);
    }
    setUserData(null);
    setUserLoggedIn(false);
    refetchPortal();
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out',
    });
    router.push('/auth/login');
  };

  const handleNotificationClick = async (notification: INotification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    if (
      (notification.relatedEntity === 'candidate' ||
        notification.relatedEntity === 'followup' ||
        notification.relatedEntity === 'checklist' ||
        notification.relatedEntity === 'meeting') &&
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
        logger.error('Failed to fetch candidate:', error);
        toast({
          title: 'Error',
          description: 'Failed to load candidate details',
          variant: 'destructive',
        });
      }
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const generateShareOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedUser = user;
    if (parsedUser) {
      let url;
      if (hasMultipleOrgs) {
        url = `${window.location.origin}/apply-jobs?o=${parsedUser.organizationInfo?.name}`;
      } else {
        url = `${window.location.origin}/apply-jobs`;
      }
      navigator.clipboard
        .writeText(url)
        .then(() => {
          toast({
            title: 'Success',
            description: 'Organization sharing URL is copied to your clipboard',
            variant: 'default',
          });
        })
        .catch((err) => {
          toast({
            title: 'Error',
            description: err.message || 'Failed to get the org url.',
            variant: 'destructive',
          });
        });
    }
  };

  const handleMarkAsReadCallback = useCallback(
    async (id: string) => {
      try {
        await markAsRead(id).unwrap();
      } catch (error) {
        logger.error('Failed to mark notification as read:', error);
      }
    },
    [markAsRead],
  );

  const handleMarkAllAsReadCallback = useCallback(async () => {
    try {
      await markAllAsRead().unwrap();
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    }
  }, [markAllAsRead, toast]);

  return {
    userData,
    portalConfigData,
    isLoading: isPortalLoading,
    theme,
    isCollapsed,
    handleToggleCollapse,
    handleLogout,
    generateShareOrg,

    notifications: {
      data: notificationsData,
      countData: notificationCountData,
      isLoading: notificationsLoading,
      isOpen: isNotificationDropdownOpen,
      setIsOpen: setIsNotificationDropdownOpen,
      page: notificationPage,
      setPage: setNotificationPage,
      unreadCount,
      totalCount,
      onMarkAsRead: handleMarkAsReadCallback,
      onMarkAllAsRead: handleMarkAllAsReadCallback,
      onClick: handleNotificationClick,
      fetch: fetchNotifications,
    },
    candidateDialog: {
      isOpen: isCandidateDialogOpen,
      setIsOpen: setIsCandidateDialogOpen,
      selectedCandidate,
      refetch: () =>
        selectedCandidate && fetchCandidateById(selectedCandidate._id),
    },
  };
};
