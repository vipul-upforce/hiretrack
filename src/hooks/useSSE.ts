import logger from '@/lib/logger';
import { verifyAndDecrypCaptcha, verifyAndDecryptSSE } from '@/lib/auth';
import { Candidate } from '@/types/candidate';
import { useEffect, useRef } from 'react';
import Cookies from 'js-cookie';

import { useNotificationSSE } from './useNotificationSSE';

export async function getDecodedSSE(encodedData: string) {
  const orgId = Cookies.get('org_id');
  if (!orgId || orgId.trim() === '') {
    logger.warn('org_id cookie missing, cannot decrypt SSE data');
    return null; // Return null instead of attempting with empty string
  }
  try {
    const data = await verifyAndDecryptSSE(encodedData, orgId);
    
    // Check if verifyAndDecryptSSE returned an error object
    // It returns { success: false, error: "..." } on failure
    if (
      data &&
      typeof data === 'object' &&
      ('success' in data || 'error' in data)
    ) {
      const errorData = data as { success?: boolean; error?: string };
      if (errorData.success === false || errorData.error) {
        logger.error('SSE decryption returned error:', errorData.error || 'Unknown error');
        return null;
      }
    }
    
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
/**
 * Optional callback to transform a Candidate update into a different type.
 * Used by calendar page to convert Candidate to CustomCalendarEvent.
 */
export type TransformCandidateCallback<T = Candidate> = (
  updatedCandidate: Candidate,
  currentSelected: T | null,
) => T | null;

export const useSSE = <T = Candidate>(
  setSelectedCandidate: (candidate: T | null) => void,
  selectedCandidate: T | null,
  jobId?: string,
  transformCandidate?: TransformCandidateCallback<T>,
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

  // Use refs to store the latest setSelectedCandidate and selectedCandidate
  const selectedCandidateRef = useRef<T | null>(selectedCandidate);
  const setSelectedCandidateRef = useRef(setSelectedCandidate);
  const transformCandidateRef = useRef(transformCandidate);

  // Update refs whenever values change
  useEffect(() => {
    selectedCandidateRef.current = selectedCandidate;
    setSelectedCandidateRef.current = setSelectedCandidate;
    transformCandidateRef.current = transformCandidate;
  }, [selectedCandidate, setSelectedCandidate, transformCandidate]);

  // Handle selectedCandidate updates when candidates change
  useEffect(() => {
    const currentSelected = selectedCandidateRef.current;
    if (!currentSelected || candidates.length === 0) return;

    // Get the candidate ID - handle both Candidate and transformed types
    // Check if it's a Candidate (has _id directly) or a transformed type (has extendedProps.candidate._id)
    let currentSelectedId: string | undefined;

    // Type guard: check if it's a Candidate
    if (
      typeof currentSelected === 'object' &&
      currentSelected !== null &&
      '_id' in currentSelected &&
      typeof (currentSelected as { _id?: unknown })._id === 'string'
    ) {
      // It's a Candidate
      currentSelectedId = (currentSelected as unknown as Candidate)._id;
    } else if (
      typeof currentSelected === 'object' &&
      currentSelected !== null &&
      'extendedProps' in currentSelected
    ) {
      // It's a transformed type (like CustomCalendarEvent)
      const extendedProps = (
        currentSelected as {
          extendedProps?: { candidate?: { _id?: string } };
        }
      )?.extendedProps;
      currentSelectedId = extendedProps?.candidate?._id;
    }

    if (!currentSelectedId) return;

    // Find if the selected candidate was updated
    const updatedCandidate = candidates.find(
      (c) => c._id === currentSelectedId,
    );
    if (updatedCandidate && currentSelectedId === updatedCandidate._id) {
      // Use transform callback if provided, otherwise use candidate directly
      const transform = transformCandidateRef.current;
      if (transform) {
        const transformed = transform(updatedCandidate, currentSelected);
        if (transformed !== null) {
          setSelectedCandidateRef.current(transformed);
        }
      } else {
        // Default: just pass the candidate (for job pages)
        setSelectedCandidateRef.current(updatedCandidate as T);
      }
    }
  }, [candidates]);

  return {
    candidates,
    setCandidates,
    clients,
    lanes,
    isConnected,
  };
};
