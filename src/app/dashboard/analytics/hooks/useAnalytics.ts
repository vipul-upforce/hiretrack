'use client';

import { useMemo } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';
import type {
  AssignmentData,
  FunnelData as FunnelStage,
  JobPerformanceData,
  TrendData,
  ScoreData,
  GeographicData,
  ActivityData,
  CustomFieldData,
} from '@/app/api/analytics/types';
import {
  AnalyticsFilters,
  SerializedAnalyticsFilters,
  useFetchAnalyticsQuery,
} from '@/lib/features/analytics/analyticsApi';

import type {
  JobSummary,
  JobData,
  FunnelSummary,
  TrendsSummary,
} from '../components/types';

export type { AnalyticsFilters } from '@/lib/features/analytics/analyticsApi';

type FetchAnalyticsHookResult = ReturnType<typeof useFetchAnalyticsQuery>;

export interface CandidateFunnelAnalytics {
  funnelData?: FunnelStage[];
  summary?: FunnelSummary | null;
}

export interface JobPerformanceSummary extends JobSummary {
  totalAccepted?: number;
  totalRejected?: number;
  avgApplicationsPerJob?: number;
  draftJobs?: number;
  unpublishedJobs?: number;
  activeJobs?: number;
}

export interface JobPerformanceInsights {
  topPerformingJobs?: JobPerformanceData[];
  underperformingJobs?: JobPerformanceData[];
  avgJobDuration?: number;
}

export type JobPerformanceAnalytics = JobData & {
  summary?: JobPerformanceSummary | null;
  insights?: JobPerformanceInsights | null;
};

export interface InterviewSummary {
  totalInterviewers: number;
  totalAssignments: number;
  overallCompletionRate: number;
  overallSuccessRate: number;
  completedAssignments?: number;
  pendingAssignments?: number;
}

export interface InterviewAssignmentAnalytics {
  assignmentData?: AssignmentData[];
  summary?: InterviewSummary | null;
  insights?: Record<string, unknown> | null;
}

export interface ApplicationTrendsAnalytics {
  trendData?: TrendData[];
  summary?: TrendsSummary | null;
  insights?: Record<string, unknown> | null;
}

export interface AIScoreAnalytics {
  scoreData?: ScoreData[];
  summary?: Record<string, number>;
}

export interface GeographicAnalytics {
  data?: GeographicData[];
  summary?: Record<string, number>;
}

export interface UserActivityAnalytics {
  activityData?: ActivityData[];
  summary?: Record<string, number>;
}

export interface CustomFieldUsageAnalytics {
  fields?: CustomFieldData[];
  summary?: Record<string, number>;
}

export interface UseAnalyticsResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
  refetch: FetchAnalyticsHookResult['refetch'];
}

export interface UseAnalyticsOptions {
  endpoint: string;
  filters?: AnalyticsFilters;
  organizationId?: string;
  enabled?: boolean;
  refetchInterval?: number;
}

function serializeFilters(
  filters?: AnalyticsFilters,
): SerializedAnalyticsFilters | undefined {
  if (!filters) {
    return undefined;
  }

  return {
    jobIds: filters.jobIds,
    candidateStatuses: filters.candidateStatuses,
    interviewerIds: filters.interviewerIds,
    locations: filters.locations,
    granularity: filters.granularity,
    dateRange: {
      from: filters.dateRange?.from?.toISOString(),
      to: filters.dateRange?.to?.toISOString(),
    },
  };
}

export function useAnalytics<T = unknown>({
  endpoint,
  filters,
  organizationId,
  enabled = true,
  refetchInterval,
}: UseAnalyticsOptions): UseAnalyticsResult<T> {
  const trimmedOrgId = organizationId?.trim();
  const shouldSkip = !enabled || !trimmedOrgId;

  const queryArgs = useMemo(() => {
    if (!trimmedOrgId) {
      return null;
    }

    return {
      endpoint,
      organizationId: trimmedOrgId,
      filters: serializeFilters(filters),
    };
  }, [endpoint, trimmedOrgId, filters]);

  const queryResult = useFetchAnalyticsQuery(
    shouldSkip || !queryArgs ? skipToken : queryArgs,
    refetchInterval
      ? {
          pollingInterval: refetchInterval,
        }
      : undefined,
  );

  function formatError(
    error: FetchBaseQueryError | SerializedError | undefined,
  ): string | null {
    if (!error) {
      return null;
    }

    if ('status' in error) {
      const errorData = error.data as
        | { message?: string; error?: string }
        | string
        | undefined;

      if (typeof errorData === 'string') {
        return errorData;
      }

      if (errorData?.message || errorData?.error) {
        return errorData.message ?? errorData.error ?? null;
      }

      return typeof error.status === 'number'
        ? `Analytics API error: ${error.status}`
        : 'Analytics API error';
    }

    return error.message ?? 'Unknown error';
  }

  const normalizedError = useMemo(
    () => formatError(queryResult.error),
    [queryResult.error],
  );

  const lastFetch = useMemo(() => {
    const generatedAt = queryResult.data?.metadata?.generatedAt;

    if (generatedAt) {
      return new Date(generatedAt);
    }

    return queryResult.fulfilledTimeStamp
      ? new Date(queryResult.fulfilledTimeStamp)
      : null;
  }, [queryResult.data?.metadata?.generatedAt, queryResult.fulfilledTimeStamp]);

  const typedData = (queryResult.data?.data as T) ?? null;

  return {
    data: typedData,
    loading: queryResult.isLoading || queryResult.isFetching,
    error: normalizedError,
    lastFetch,
    refetch: queryResult.refetch,
  };
}

export function useCandidateFunnel(
  filters?: AnalyticsFilters,
  organizationId?: string,
  enabled?: boolean,
) {
  return useAnalytics<CandidateFunnelAnalytics>({
    endpoint: 'candidate-funnel',
    filters,
    organizationId,
    enabled,
  });
}

export function useJobPerformance(
  filters?: AnalyticsFilters,
  organizationId?: string,
) {
  return useAnalytics<JobPerformanceAnalytics>({
    endpoint: 'job-performance',
    filters,
    organizationId,
  });
}

export function useInterviewAssignments(
  filters?: AnalyticsFilters,
  organizationId?: string,
  enabled?: boolean,
) {
  return useAnalytics<InterviewAssignmentAnalytics>({
    endpoint: 'interview-assignments',
    filters,
    organizationId,
    enabled,
  });
}

export function useApplicationTrends(
  filters?: AnalyticsFilters,
  organizationId?: string,
  enabled?: boolean,
) {
  return useAnalytics<ApplicationTrendsAnalytics>({
    endpoint: 'application-trends',
    filters,
    organizationId,
    enabled,
  });
}
