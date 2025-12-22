import logger from '@/lib/logger';
import { verifyAndDecrypCaptcha, verifyAndDecryptSSE } from '@/lib/auth';
import { Candidate } from '@/types/candidate';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { CustomCalendarEvent } from '@/app/dashboard/calendar/page';

import { useNotificationSSE } from './useNotificationSSE';

export async function getDecodedSSE(encodedData: string) {
  const orgId = Cookies.get('org_id');

  try {
    const data = await verifyAndDecryptSSE(encodedData, orgId || '');
    return data;
  } catch (error) {
    logger.error('SSE decryption error:', error);
    return null;
  }
}
export async function getDecodedCaptcha(encodedData: string, orgId: string) {
  try {
    const data = await verifyAndDecrypCaptcha(encodedData, orgId);
    return data;
  } catch (error) {
    logger.error('SSE decryption error:', error);
    return null;
  }
}
export const useSSE = (
  // role: string,
  setSelectedCandidate: (
    candidate: Candidate | CustomCalendarEvent | null,
  ) => void,
  selectedCandidate: Candidate | CustomCalendarEvent | null,
  jobId?: string,
) => {
  // Use the consolidated notification SSE connection
  const {
    candidates,
    setCandidates,
    clients,
    lanes: sseLanes,
    isConnected,
    jobId: sseJobId,
  } = useNotificationSSE(0, 0);

  let lanes = sseLanes;

  if (jobId && sseJobId && sseJobId !== jobId) {
    lanes = undefined;
  }
  const pathname = usePathname();

  // Use refs to store the latest setSelectedCandidate and selectedCandidate
  const selectedCandidateRef = useRef<Candidate | CustomCalendarEvent | null>(
    selectedCandidate,
  );
  const setSelectedCandidateRef = useRef(setSelectedCandidate);

  // Update refs whenever selectedCandidate or setSelectedCandidate changes
  useEffect(() => {
    selectedCandidateRef.current = selectedCandidate;
    setSelectedCandidateRef.current = setSelectedCandidate;
  }, [selectedCandidate, setSelectedCandidate]);

  // Handle selectedCandidate updates when candidates change
  useEffect(() => {
    const currentSelected = selectedCandidateRef.current;
    if (!currentSelected || candidates.length === 0) return;

    let currentSelectedId: string | undefined;
    if (currentSelected) {
      if (pathname?.includes('/calendar')) {
        currentSelectedId =
          (currentSelected as CustomCalendarEvent)?.extendedProps?.candidate
            ?._id || (currentSelected as Candidate)?._def?.publicId; // eslint-disable-line no-underscore-dangle
      } else {
        currentSelectedId = (currentSelected as Candidate)?._id;
      }
    }

    // Find if the selected candidate was updated
    const updatedCandidate = candidates.find(
      (c) => c._id === currentSelectedId,
    );
    if (updatedCandidate && currentSelectedId === updatedCandidate._id) {
      if (!pathname?.includes('/calendar')) {
        setSelectedCandidateRef.current(updatedCandidate);
      } else {
        // Construct calendar event for calendar views
        const currentEvent = currentSelected as CustomCalendarEvent;
        const startTime = updatedCandidate?.assignment?.time
          ? new Date(updatedCandidate?.assignment?.time)
          : currentEvent?.start || new Date();
        const endTime = updatedCandidate?.assignment?.time
          ? new Date(new Date(startTime).setHours(startTime.getHours() + 1)) // Default to 1-hour duration
          : currentEvent?.end || new Date();

        const updatedEvent: CustomCalendarEvent = {
          ...currentEvent,
          id: updatedCandidate._id,
          title:
            typeof updatedCandidate.jobId === 'object'
              ? updatedCandidate.jobId?.title || 'Unknown'
              : 'Unknown',
          start: startTime,
          end: endTime,
          startStr: startTime.toISOString(),
          endStr: endTime.toISOString(),
          extendedProps: {
            ...currentEvent?.extendedProps,
            candidate: {
              ...updatedCandidate,
              jobId:
                typeof updatedCandidate.jobId === 'string'
                  ? updatedCandidate.jobId
                  : updatedCandidate.jobId?._id,
              jobDetails:
                typeof updatedCandidate.jobId === 'object'
                  ? {
                      title: updatedCandidate.jobId?.title || '',
                      description: updatedCandidate.jobId?.description || '',
                    }
                  : undefined,
            },
            interviewer:
              typeof updatedCandidate?.assignment?.interviewerId === 'string'
                ? {
                    _id: updatedCandidate?.assignment?.interviewerId,
                    name: 'Unknown',
                    email: 'Unknown',
                  }
                : updatedCandidate?.assignment?.interviewerId || {
                    _id: '',
                    name: 'Unknown',
                    email: 'Unknown',
                  },
          },
        };
        setSelectedCandidateRef.current(updatedEvent);
      }
    }
  }, [candidates, pathname]);

  return {
    candidates,
    setCandidates,
    clients,
    lanes,
    isConnected,
  };
};
