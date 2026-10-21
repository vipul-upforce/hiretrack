import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import {
  useCancelMeetingMutation,
  useCancelZoomMeetingMutation,
  useCancelTeamsMeetingMutation,
} from '@/lib/features/calendar/calendarApi';
import { Candidate } from '@/types/candidate';

type MeetingProvider = 'google' | 'zoom' | 'teams' | null;

interface UseCancelMeetingProps {
  candidate: Candidate;
  refetch?: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
}

/**
 * Custom hook to handle meeting cancellation logic for Google Meet, Zoom, and Microsoft Teams
 */
export function useCancelMeeting({
  candidate,
  refetch,
  onOpenChange,
}: UseCancelMeetingProps) {
  const { toast } = useToast();
  const [cancelMeetingProvider, setCancelMeetingProvider] =
    useState<MeetingProvider>(null);
  const [cancelNotes, setCancelNotes] = useState('');

  const [cancelMeeting, { isLoading: isCancelling }] =
    useCancelMeetingMutation();
  const [cancelZoomMeeting, { isLoading: isCancellingZoom }] =
    useCancelZoomMeetingMutation();
  const [cancelTeamsMeeting, { isLoading: isCancellingTeams }] =
    useCancelTeamsMeetingMutation();

  const cancelLabelByProvider: Record<'google' | 'zoom' | 'teams', string> = {
    google: 'Google Meet',
    zoom: 'Zoom',
    teams: 'Microsoft Teams',
  };

  const activeCancelLabel =
    cancelMeetingProvider !== null
      ? cancelLabelByProvider[cancelMeetingProvider]
      : 'Meeting';

  const isCancellingByProvider = {
    google: isCancelling,
    zoom: isCancellingZoom,
    teams: isCancellingTeams,
  };

  const isCancellingActive =
    cancelMeetingProvider !== null
      ? isCancellingByProvider[cancelMeetingProvider]
      : false;

  const handleCancelMeeting = async () => {
    if (!cancelMeetingProvider) return;

    try {
      if (cancelMeetingProvider === 'google') {
        if (!candidate.assignment?.googleMeet?.eventId) {
          toast({
            title: 'Error',
            description: 'Google Meet event ID not found',
            variant: 'destructive',
          });
          return;
        }

        await cancelMeeting({
          eventId: candidate.assignment.googleMeet.eventId,
          candidateId: candidate._id,
          cancelNotes,
        }).unwrap();

        toast({
          title: 'Success',
          description: 'Google Meet cancelled successfully',
        });
      } else if (cancelMeetingProvider === 'zoom') {
        if (!candidate.assignment?.zoomMeet?.meetingId) {
          toast({
            title: 'Error',
            description: 'Zoom meeting ID not found',
            variant: 'destructive',
          });
          return;
        }

        await cancelZoomMeeting({
          meetingId: candidate.assignment.zoomMeet.meetingId,
          eventId: candidate.assignment.zoomMeet.eventId || '',
          candidateId: candidate._id,
          cancelNotes,
        }).unwrap();

        toast({
          title: 'Success',
          description: 'Zoom meeting cancelled successfully',
        });
      } else if (cancelMeetingProvider === 'teams') {
        if (!candidate.assignment?.microsoftTeams?.meetingId) {
          toast({
            title: 'Error',
            description: 'Microsoft Teams meeting ID not found',
            variant: 'destructive',
          });
          return;
        }

        await cancelTeamsMeeting({
          meetingId: candidate.assignment.microsoftTeams.meetingId,
          eventId: candidate.assignment.microsoftTeams.eventId || '',
          candidateId: candidate._id,
          cancelNotes,
        }).unwrap();

        toast({
          title: 'Success',
          description: 'Microsoft Teams meeting cancelled successfully',
        });
      }

      if (refetch) await refetch();
      onOpenChange(false);
      setCancelMeetingProvider(null);
      setCancelNotes('');
    } catch (error) {
      logger.error('Error cancelling meeting:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel meeting',
        variant: 'destructive',
      });
    }
  };

  const handleOpenCancelDialog = (provider: 'google' | 'zoom' | 'teams') => {
    setCancelMeetingProvider(provider);
  };

  const handleCloseCancelDialog = () => {
    setCancelMeetingProvider(null);
    setCancelNotes('');
  };

  return {
    cancelMeetingProvider,
    cancelNotes,
    setCancelNotes,
    activeCancelLabel,
    isCancellingActive,
    showCancelMeetDialog: cancelMeetingProvider !== null,
    handleCancelMeeting,
    handleOpenCancelDialog,
    handleCloseCancelDialog,
  };
}
