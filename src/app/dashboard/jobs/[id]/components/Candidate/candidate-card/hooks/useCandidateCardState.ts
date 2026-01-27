import { useState } from 'react';
import { Candidate } from '@/types/candidate';

/**
 * Manages all state for the CandidateCard component
 * @param candidate - Initial candidate data
 * @returns Object containing all state values and setters
 */
export function useCandidateCardState(candidate: Candidate) {
  // Local state for candidate data to handle sync updates
  const [localCandidate, setLocalCandidate] = useState(candidate);

  // Syncing state
  const [isSyncing, setIsSyncing] = useState(false);

  // Dialog states
  const [isEditing, setIsEditing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);
  const [confirmUnassignOpen, setConfirmUnassignOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isAddRemarkOpen, setIsAddRemarkOpen] = useState(false);
  const [removeFUOpen, setRemoveFUOpenLocal] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);

  // Assignment job state
  const [candidateToAssignJob, setCandidateToAssignJob] =
    useState<Candidate | null>(null);
  const [isAssignJobOpen, setIsAssignJobOpen] = useState(false);

  return {
    // Candidate state
    localCandidate,
    setLocalCandidate,

    // Syncing state
    isSyncing,
    setIsSyncing,

    // Dialog states
    isEditing,
    setIsEditing,
    isAssigning,
    setIsAssigning,
    isAddingFollowUp,
    setIsAddingFollowUp,
    confirmUnassignOpen,
    setConfirmUnassignOpen,
    isEmailDialogOpen,
    setIsEmailDialogOpen,
    isTagsOpen,
    setIsTagsOpen,
    isShareDialogOpen,
    setIsShareDialogOpen,
    isAddRemarkOpen,
    setIsAddRemarkOpen,
    removeFUOpen,
    setRemoveFUOpen: setRemoveFUOpenLocal,
    isDuplicateDialogOpen,
    setIsDuplicateDialogOpen,

    // Assignment job state
    candidateToAssignJob,
    setCandidateToAssignJob,
    isAssignJobOpen,
    setIsAssignJobOpen,
  };
}

