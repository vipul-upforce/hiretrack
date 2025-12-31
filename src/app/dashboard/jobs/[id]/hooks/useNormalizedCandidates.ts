/**
 * Hook to fetch and normalize candidates from multiple sources
 * Provides single source of truth for candidate data
 */

import { useMemo } from 'react';
import { useFetchCandidatesQuery } from '@/lib/features/candidate/candidateApi';
import { useSSE } from '@/hooks/useSSE';
import { Candidate } from '@/types/candidate';
import {
  normalizeCandidate,
  NormalizedCandidate,
} from '../utils/candidateNormalizer';

interface UseNormalizedCandidatesProps {
  jobId: string;
  setSelectedCandidate: (candidate: Candidate | null) => void;
  selectedCandidate: Candidate | null;
}

/**
 * Hook that normalizes candidates from API and SSE sources
 * Returns normalized candidates array as single source of truth
 */
export function useNormalizedCandidates({
  jobId,
  setSelectedCandidate,
  selectedCandidate,
}: UseNormalizedCandidatesProps) {
  // Fetch candidates from API
  const {
    data: candidatesFromQuery,
    isLoading: isCandidatesLoading,
    refetch,
  } = useFetchCandidatesQuery(jobId);

  // Get SSE candidates (only if setSelectedCandidate is provided)
  const { candidates: sseCandidates } = useSSE(
    setSelectedCandidate,
    selectedCandidate || null,
    jobId,
  );

  // Normalize and merge candidates
  const normalizedCandidates = useMemo(() => {
    const candidateMap = new Map<string, NormalizedCandidate>();

    // Normalize and add candidates from API query
    if (candidatesFromQuery) {
      candidatesFromQuery.forEach((candidate) => {
        const normalized = normalizeCandidate(candidate);
        if (normalized) {
          candidateMap.set(normalized._id, normalized);
        }
      });
    }

    // Normalize and update/add candidates from SSE (SSE takes precedence)
    if (sseCandidates) {
      sseCandidates.forEach((sseCandidate) => {
        const normalized = normalizeCandidate(sseCandidate);
        if (normalized) {
          candidateMap.set(normalized._id, normalized);
        }
      });
    }

    // Convert to array and cast to Candidate[] for backward compatibility
    // The normalized candidates are compatible with Candidate type
    return Array.from(candidateMap.values()) as unknown as Candidate[];
  }, [candidatesFromQuery, sseCandidates]);

  return {
    candidates: normalizedCandidates,
    isLoading: isCandidatesLoading,
    refetch,
  };
}
