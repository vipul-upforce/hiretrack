/**
 * Centralized Lane Management Hook
 *
 * Single source of truth for lane data. Handles:
 * - Lane resolution (job-specific → organization default → hardcoded)
 * - SSE integration for real-time updates
 * - Cache invalidation and refetching
 * - Error handling and loading states
 */

import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useGetJobLanesQuery } from '@/lib/features/lane/laneApi';
import {
  LaneSource,
  LaneResolutionResult,
  DEFAULT_LANES,
  type LaneData,
} from '@/types/lanes';

import { RootState } from '@/lib/store';
import { useNotificationSSE } from './useNotificationSSE';

interface UseLanesOptions {
  /** Job ID - required for job-specific lanes */
  jobId: string;
  /** Whether to skip the query */
  skip?: boolean;
}

/**
 * Centralized hook for managing lanes
 *
 * Resolution priority:
 * 1. Job-specific lanes (if job.useCustomLanes === true)
 * 2. Organization default lanes
 * 3. Hardcoded DEFAULT_LANES
 *
 * @param options - Configuration options
 * @returns Lane resolution result with lanes, source, loading state, and refetch function
 */
export function useLanes(options: UseLanesOptions): LaneResolutionResult {
  const { jobId, skip = false } = options;
  const { user } = useSelector((state: RootState) => state.auth || {});

  // Fetch job-specific lanes
  const {
    data: jobLanesData,
    isLoading: isJobLanesLoading,
    error: jobLanesError,
    refetch: refetchJobLanes,
  } = useGetJobLanesQuery(jobId, {
    skip: skip || !jobId,
  });

  // Get SSE lane updates
  const { lanes: sseLanes, jobId: sseJobId } = useNotificationSSE(0, 0);

  // Determine effective lanes and source
  const laneResolution = useMemo((): {
    lanes: string[];
    source: LaneSource;
    useCustomLanes?: boolean;
  } => {
    // Priority 1: SSE updates (if they match current job)
    if (sseLanes && sseJobId === jobId) {
      return {
        lanes: sseLanes,
        source: LaneSource.JOB_SPECIFIC,
        useCustomLanes: true,
      };
    }

    // Priority 2: Job-specific lanes (if useCustomLanes is true)
    if (jobLanesData?.useCustomLanes && jobLanesData?.lanes) {
      return {
        lanes: jobLanesData.lanes,
        source: LaneSource.JOB_SPECIFIC,
        useCustomLanes: true,
      };
    }

    // Priority 3: Organization default lanes (from jobLanesData when useCustomLanes is false)
    if (jobLanesData?.lanes && !jobLanesData.useCustomLanes) {
      return {
        lanes: jobLanesData.lanes,
        source: LaneSource.ORGANIZATION_DEFAULT,
        useCustomLanes: false,
      };
    }

    // Priority 4: Hardcoded fallback
    return {
      lanes: [...DEFAULT_LANES],
      source: LaneSource.HARDCODED,
      useCustomLanes: false,
    };
  }, [jobLanesData, sseLanes, sseJobId, jobId]);

  // Handle SSE updates - refetch when lanes update for this job
  useEffect(() => {
    if (sseLanes && sseJobId === jobId) {
      refetchJobLanes();
    }
  }, [sseLanes, sseJobId, jobId, refetchJobLanes]);

  // Build result object
  const result: LaneResolutionResult = {
    lanes: laneResolution.lanes,
    source: laneResolution.source,
    isLoading: isJobLanesLoading,
    error: jobLanesError,
    refetch: refetchJobLanes,
    jobId,
    organizationId: user?.organizationId as string,
  };

  return result;
}

/**
 * Get lane data structure with full metadata
 *
 * @param resolutionResult - Result from useLanes hook
 * @returns LaneData object with full metadata
 */
export function getLaneData(resolutionResult: LaneResolutionResult): LaneData {
  return {
    lanes: resolutionResult.lanes,
    source: resolutionResult.source,
    jobId: resolutionResult.jobId,
    organizationId: resolutionResult.organizationId || '',
    useCustomLanes:
      resolutionResult.source === LaneSource.JOB_SPECIFIC ? true : undefined,
  };
}
