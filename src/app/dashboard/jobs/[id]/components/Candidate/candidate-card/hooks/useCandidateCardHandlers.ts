import React, { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Candidate } from '@/types/candidate';

interface UseCandidateCardHandlersParams {
  localCandidate: Candidate;
  onViewDetails: (candidate: Candidate) => void;
  setCandidateToAssignJob: React.Dispatch<
    React.SetStateAction<Candidate | null>
  >;
  setIsAssignJobOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Provides event handlers for the CandidateCard component
 * @param params - Object containing candidate data and callback functions
 * @returns Object containing all event handlers
 */
export function useCandidateCardHandlers({
  localCandidate,
  onViewDetails,
  setCandidateToAssignJob,
  setIsAssignJobOpen,
}: UseCandidateCardHandlersParams) {
  const { toast } = useToast();

  /**
   * Copies text to clipboard and shows toast notification
   */
  const copyToClipboard = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast({
          title: 'Copied!',
          description: `${label} copied to clipboard`,
          duration: 2000,
        });
      } catch {
        toast({
          title: 'Failed to copy',
          description: 'Could not copy to clipboard',
          variant: 'destructive',
          duration: 2000,
        });
      }
    },
    [toast],
  );

  /**
   * Stops event propagation for popover content clicks
   */
  const handlePopoverContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  /**
   * Handles job assignment action
   */
  const handleAssignJob = useCallback(
    (candidate: Candidate, e: React.MouseEvent) => {
      e.stopPropagation();
      setCandidateToAssignJob(candidate);
      setIsAssignJobOpen(true);
    },
    [setCandidateToAssignJob, setIsAssignJobOpen],
  );

  /**
   * Handles card click for dashboard view
   * Prevents opening details when clicking on interactive elements
   */
  const handleDashboardCardClick = useCallback(
    (e: React.MouseEvent) => {
      // Check if click target is a button or inside a dropdown/interactive element
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('[role="menuitem"]') ||
        target.closest('[data-radix-collection-item]') ||
        target.closest('[data-radix-popper-content]') ||
        target.closest('[data-state]') ||
        target.closest(
          '.cursor-pointer:not(.bg-white):not(.dark\\:bg-black)',
        ) ||
        target.closest('a') ||
        target.tagName === 'BUTTON'
      ) {
        return; // Don't open details if clicking on interactive elements
      }

      // Always open details when clicking on card content
      onViewDetails(localCandidate);
    },
    [onViewDetails, localCandidate],
  );

  /**
   * Handles card click for draggable view
   * Prevents opening details when clicking on interactive elements or during drag
   */
  const handleDraggableCardClick = useCallback(
    (e: React.MouseEvent) => {
      // Only trigger on actual click, not on drag
      if (e.detail === 0) return; // Ignore programmatic clicks

      // Check if click target is a button or inside a dropdown/interactive element
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('[role="menuitem"]') ||
        target.closest('[data-radix-collection-item]') ||
        target.closest('[data-radix-popper-content]') ||
        target.closest('[data-state]') ||
        target.closest(
          '.cursor-pointer:not(.bg-white):not(.dark\\:bg-black)',
        ) ||
        target.closest('a') ||
        target.tagName === 'BUTTON'
      ) {
        return; // Don't open details if clicking on interactive elements
      }

      // Always open details when clicking on card content
      onViewDetails(localCandidate);
    },
    [onViewDetails, localCandidate],
  );

  return {
    copyToClipboard,
    handlePopoverContentClick,
    handleAssignJob,
    handleDashboardCardClick,
    handleDraggableCardClick,
  };
}
