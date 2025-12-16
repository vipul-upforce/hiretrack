/**
 * Centralized data management hook for job page
 * Combines job, candidates, lanes, and config data fetching
 * Provides single source of truth for all page data
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useFetchJobByIdQuery } from '@/lib/features/job/jobApi';
import { useFetchCandidatesQuery } from '@/lib/features/candidate/candidateApi';
import {
  useGetLanesQuery,
  useGetJobLanesQuery,
} from '@/lib/features/lane/laneApi';
import { useGetJobLaneConfigQuery } from '@/lib/features/checklist/checklistApi';
import { useSSE } from '@/hooks/useSSE';
import { Candidate } from '@/types/candidate';
import { RootState } from '@/lib/store';
import { IJobLaneConfig } from '@/lib/models/JobLaneConfig';
import { Job } from '@/types/job';
import {
  normalizeCandidate,
  NormalizedCandidate,
} from '../utils/candidateNormalizer';
// import { JobLaneConfig } from '@/lib/models/JobLaneConfig';

interface UseJobPageDataProps {
  jobId: string;
  onCandidateSelect?: (candidate: Candidate | null) => void;
  selectedCandidate?: Candidate | null;
}

interface UseJobPageDataReturn {
  job?: Job;
  candidates: Candidate[];
  lanes: { lanes: string[] } | undefined;
  jobLaneConfig: IJobLaneConfig | null;
  isLoading: boolean;
  error: unknown;
  isJobLoading: boolean;
  isCandidatesLoading: boolean;
  isLanesLoading: boolean;
}

/**
 * Centralized hook that manages all data fetching for the job page
 * Handles job, candidates, lanes, and config data
 * Integrates SSE updates seamlessly
 */
export function useJobPageData({
  jobId,
  onCandidateSelect,
  selectedCandidate,
}: UseJobPageDataProps): UseJobPageDataReturn {
  const { user } = useSelector((state: RootState) => state.auth || {});

  // Fetch job data
  const {
    data: job,
    isLoading: isJobLoading,
    error: jobError,
  } = useFetchJobByIdQuery(jobId);

  // Fetch candidates from API
  const { data: candidatesFromQuery, isLoading: isCandidatesLoading } =
    useFetchCandidatesQuery(jobId);

  // Get SSE candidates (real-time updates)
  const { candidates: sseCandidates } = useSSE(
    user?.role || '',
    onCandidateSelect || (() => {}),
    selectedCandidate || null,
    jobId,
  );

  // Normalize and merge candidates from API and SSE
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
    return Array.from(candidateMap.values()) as unknown as Candidate[];
  }, [candidatesFromQuery, sseCandidates]);

  // Fetch job-specific lanes with fallback to user lanes
  const {
    data: jobLanes,
    isLoading: isJobLanesLoading,
    error: jobLanesError,
  } = useGetJobLanesQuery(jobId, { skip: !jobId });

  const { data: userLanes, isLoading: isUserLanesLoading } = useGetLanesQuery(
    { userId: user?.id, jobId },
    { skip: !user?.id || !jobId },
  );

  // Use job-specific lanes if available, fallback to user lanes
  const lanes = jobLanes || userLanes;
  const isLanesLoading = isJobLanesLoading || isUserLanesLoading;

  // Fetch job lane configuration for checklist indicators
  const { data: jobLaneConfig } = useGetJobLaneConfigQuery(jobId, {
    skip: !jobId,
  });

  // Combined loading state
  const isLoading = isJobLoading || isCandidatesLoading || isLanesLoading;

  // Combined error state
  const error = jobError || jobLanesError;

  return {
    job,
    candidates: normalizedCandidates,
    lanes,
    jobLaneConfig: jobLaneConfig || null,
    isLoading,
    error: error || null,
    isJobLoading,
    isCandidatesLoading,
    isLanesLoading,
  };
}
