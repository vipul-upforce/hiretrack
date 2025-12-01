/**
 * Hook to manage candidate UI state
 * Consolidates candidate-related state from page.tsx
 * Single source of truth for candidate UI state
 */

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Candidate } from "@/types/candidate";

interface UseCandidateStateProps {
  jobId: string;
  candidates: Candidate[];
}

/**
 * Hook that manages candidate UI state including:
 * - Selected candidate
 * - Details dialog open state
 * - Remarks dialog state
 * - URL parameter sync
 */
export function useCandidateState({ jobId, candidates }: UseCandidateStateProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const candidateIdParam = searchParams.get("candidateId");

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [openRemarksFor, setOpenRemarksFor] = useState<string | null>(null);

  // Handle candidateId URL parameter to auto-open candidate dialog
  useEffect(() => {
    if (candidateIdParam && candidates && !selectedCandidate) {
      const candidate = candidates.find((c) => c._id === candidateIdParam);
      if (candidate) {
        setSelectedCandidate(candidate);
        setIsDetailsOpen(true);
      }
    }
  }, [candidateIdParam, candidates, selectedCandidate]);

  // Handle candidate details dialog close - clean up URL parameter
  const handleCandidateDialogClose = useCallback(
    (open: boolean) => {
      setIsDetailsOpen(open);
      if (!open && candidateIdParam) {
        // Remove candidateId parameter from URL when dialog is closed
        const params = new URLSearchParams(searchParams.toString());
        params.delete("candidateId");
        const newUrl = params.toString() ? `?${params.toString()}` : "";
        router.replace(`/dashboard/jobs/${jobId}${newUrl}`, { scroll: false });
      }
    },
    [candidateIdParam, searchParams, router, jobId]
  );

  // Open candidate details dialog
  const openCandidateDetails = useCallback((candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsDetailsOpen(true);
  }, []);

  // Close candidate details dialog
  const closeCandidateDetails = useCallback(() => {
    setIsDetailsOpen(false);
    setSelectedCandidate(null);
  }, []);

  return {
    selectedCandidate,
    setSelectedCandidate,
    isDetailsOpen,
    setIsDetailsOpen: handleCandidateDialogClose,
    openRemarksFor,
    setOpenRemarksFor,
    openCandidateDetails,
    closeCandidateDetails,
  };
}

