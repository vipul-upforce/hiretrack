import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import {
  useGetNotificationsQuery,
  useGetNotificationCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} from '@/lib/features/notifications/notificationsApi';
import { useLazyFetchCandidateByIdQuery } from '@/lib/features/candidate/candidateApi';
import { INotification } from '@/lib/models/notification';
import { Candidate } from '@/types/candidate';
import { useAppSelector } from '@/lib/redux/hooks';
import { getNotificationTypesForRole } from '../utils';

export const useNotificationsPage = () => {
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = useState(false);
  const ITEMS_PER_PAGE = 20;
  const { user } = useAppSelector((state) => state.auth || {});

  // Query Parameters Construction
  const queryParams = {
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    ...(filterType !== 'all' && { type: filterType }),
    ...(filterRead !== 'all' && { isRead: filterRead === 'read' }),
    ...(filterPriority !== 'all' && { priority: filterPriority }),
  };

  // API Hooks
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    refetch: refetchNotifications,
  } = useGetNotificationsQuery(queryParams);

  const { data: notificationCountData } = useGetNotificationCountQuery(
    undefined,
    {
      pollingInterval: 30000,
    },
  );

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [fetchCandidateById] = useLazyFetchCandidateByIdQuery();

  // Derived Data
  const notifications = notificationsData?.notifications || [];
  const pagination = notificationsData?.pagination;
  const unreadCount = notificationCountData?.unreadCount || 0;
  const availableNotificationTypes = getNotificationTypesForRole(user?.role);

  // Handlers
  const handleRefresh = () => refetchNotifications();

  const handleClearFilters = () => {
    setFilterType('all');
    setFilterRead('all');
    setFilterPriority('all');
    setCurrentPage(1);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id).unwrap();
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
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
  };

  const handleNotificationClick = async (notification: INotification) => {
    // Optimistic read status update
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    // Logic for opening candidate dialog
    const relatedEntities = ['candidate', 'meeting', 'checklist', 'followup'];
    if (
      relatedEntities.includes(notification.relatedEntity) &&
      notification.relatedId
    ) {
      try {
        // Force fresh fetch to avoid stale cached data
        const result = await fetchCandidateById(notification.relatedId, false);
        if (result.data) {
          setSelectedCandidate(result.data);
          setIsCandidateDialogOpen(true);
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
  };

  const handleCandidateUpdate = async () => {
    if (selectedCandidate) {
      // Force fresh fetch to get latest candidate data
      const result = await fetchCandidateById(selectedCandidate._id, false);
      if (result.data) {
        setSelectedCandidate(result.data);
      }
    }
  };

  return {
    // State
    currentPage,
    setCurrentPage,
    filterType,
    setFilterType,
    filterRead,
    setFilterRead,
    filterPriority,
    setFilterPriority,
    isCandidateDialogOpen,
    setIsCandidateDialogOpen,
    selectedCandidate,
    user,

    // Data
    notifications,
    pagination,
    unreadCount,
    notificationsLoading,
    availableNotificationTypes,
    limit: ITEMS_PER_PAGE,

    // Actions
    handleRefresh,
    handleClearFilters,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleNotificationClick,
    handleCandidateUpdate,
  };
};
