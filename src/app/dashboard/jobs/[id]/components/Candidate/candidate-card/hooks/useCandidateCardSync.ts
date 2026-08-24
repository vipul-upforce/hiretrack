import React, { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import { Candidate } from '@/types/candidate';
import { useSyncEventMutation } from '@/lib/features/calendar/calendarApi';

interface UseCandidateCardSyncParams {
  localCandidate: Candidate;
  setLocalCandidate: React.Dispatch<React.SetStateAction<Candidate>>;
  setIsSyncing: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Handles Google Calendar event sync functionality
 * @param params - Object containing candidate state and setters
 * @returns Sync handler function
 */
export function useCandidateCardSync({
  localCandidate,
  setLocalCandidate,
  setIsSyncing,
}: UseCandidateCardSyncParams) {
  const { toast } = useToast();
  const [syncEvent] = useSyncEventMutation();

  const handleSyncAttendeeResponses = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();

      if (!localCandidate.assignment?.googleMeet?.eventId) {
        toast({
          title: 'Sync Failed',
          description: 'No event ID found for this meeting.',
          variant: 'destructive',
        });
        return;
      }

      setIsSyncing(true);

      try {
        const syncData = await syncEvent({
          candidateId: localCandidate._id,
          eventId: localCandidate.assignment.googleMeet.eventId,
        }).unwrap();

        if (syncData.success && syncData.data.attendeeResponses) {
          setLocalCandidate((prevCandidate) => ({
            ...prevCandidate,
            assignment: {
              ...prevCandidate.assignment!,
              googleMeet: {
                ...prevCandidate.assignment!.googleMeet!,
                attendeeResponses: syncData.data.attendeeResponses.map(
                  (response) => ({
                    ...response,
                    lastUpdated: new Date(response.lastUpdated),
                  }),
                ),
              },
            },
          }));
        }

        let description: string;
        if (syncData.data.notificationsSent > 0) {
          description = `Updated attendee responses. ${syncData.data.notificationsSent} notifications sent.`;
        } else if (syncData.data.changesDetected) {
          description = 'Attendee responses updated successfully.';
        } else {
          description = 'Attendee responses are up to date.';
        }

        toast({
          title: 'Sync Successful',
          description,
        });
      } catch (err) {
        logger.error('Error syncing attendee responses:', err);
        toast({
          title: 'Sync Failed',
          description: 'Unable to sync attendee responses. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsSyncing(false);
      }
    },
    [
      localCandidate._id,
      localCandidate.assignment?.googleMeet?.eventId,
      setLocalCandidate,
      setIsSyncing,
      toast,
      syncEvent,
    ],
  );

  return {
    handleSyncAttendeeResponses,
  };
}
