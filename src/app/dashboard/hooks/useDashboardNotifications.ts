import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import { INotification } from '@/lib/notifications';
import {
  useLazyFetchCandidateByIdQuery,
} from '@/lib/features/candidate/candidateApi';
import { useMarkNotificationAsReadMutation } from '@/lib/features/notifications/notificationsApi';
import { Candidate } from '@/types/candidate';

interface UseDashboardNotificationsParams {
  markAsRead: ReturnType<typeof useMarkNotificationAsReadMutation>[0];
  fetchCandidateById: ReturnType<
    typeof useLazyFetchCandidateByIdQuery
  >[0];
  setSelectedCandidate: (candidate: Candidate | null) => void;
  setIsCandidateDialogOpen: (open: boolean) => void;
}

/**
 * Custom hook to handle notification interactions.
 */
export function useDashboardNotifications({
  markAsRead,
  fetchCandidateById,
  setSelectedCandidate,
  setIsCandidateDialogOpen,
}: UseDashboardNotificationsParams) {
  const router = useRouter();
  const { toast } = useToast();

  const handleNotificationClick = useCallback(
    async (notification: INotification) => {
      if (!notification.isRead) {
        markAsRead(notification._id);
      }

      // For candidate-related and meeting notifications, open dialog
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

      // For other notifications, navigate to the page
      if (notification.actionUrl) {
        router.push(notification.actionUrl);
      }
    },
    [
      markAsRead,
      fetchCandidateById,
      setSelectedCandidate,
      setIsCandidateDialogOpen,
      router,
      toast,
    ],
  );

  return {
    handleNotificationClick,
  };
}

