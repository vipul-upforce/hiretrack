import React, { useEffect } from 'react';
import dayjs from 'dayjs';
import { Candidate } from '@/types/candidate';
import { followUpSepretorPatternRegex } from '@/lib/constants';

interface UseCandidateCardEffectsParams {
  candidate: Candidate;
  localCandidate: Candidate;
  isAddingFollowUp: boolean;
  setLocalCandidate: React.Dispatch<React.SetStateAction<Candidate>>;
  setNewFollowUp: (value: string) => void;
  setNewFollowUpDate: (value: dayjs.Dayjs | null) => void;
  setMADFollowup: (value: string) => void;
}

/**
 * Manages side effects for the CandidateCard component
 * - Syncs local candidate state with prop changes
 * - Parses follow-up notes when editing
 * @param params - Object containing candidate data and setters
 */
export function useCandidateCardEffects({
  candidate,
  localCandidate,
  isAddingFollowUp,
  setLocalCandidate,
  setNewFollowUp,
  setNewFollowUpDate,
  setMADFollowup,
}: UseCandidateCardEffectsParams) {
  // Update local candidate when prop changes
  useEffect(() => {
    setLocalCandidate(candidate);
    // debugger;
  }, [candidate, setLocalCandidate]);

  // Parse follow-up notes when adding/editing follow-up
  useEffect(() => {
    if (isAddingFollowUp) {
      const parts = localCandidate?.followUp?.note
        ? localCandidate.followUp.note
            .split(followUpSepretorPatternRegex)
            .map((p) => p.trim())
            .filter(Boolean)
        : [];

      const followUpParts = parts.filter((p) => {
        if (p.endsWith('has completed the last step.')) {
          setMADFollowup(p);
          return false;
        }
        return true;
      });

      // use the most recent follow-up note for editing, or empty string
      const userNote =
        followUpParts.length > 0 ? followUpParts[followUpParts.length - 1] : '';
      setNewFollowUp(userNote);

      if (localCandidate?.followUp?.date) {
        setNewFollowUpDate(dayjs(localCandidate.followUp.date));
      } else {
        setNewFollowUpDate(null);
      }
    }
  }, [
    isAddingFollowUp,
    localCandidate,
    setNewFollowUp,
    setNewFollowUpDate,
    setMADFollowup,
  ]);
}
