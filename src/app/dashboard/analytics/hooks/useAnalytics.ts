"use client";

import { useState, useEffect, useCallback } from "react";
import { DateRange } from "react-day-picker";

export interface AnalyticsFilters {
  dateRange?: DateRange;
  jobIds?: string[];
  candidateStatuses?: string[];
  interviewerIds?: string[];
  locations?: string[];
  granularity?: "daily" | "weekly" | "monthly";
}

export interface UseAnalyticsOptions {
  endpoint: string;
  filters?: AnalyticsFilters;
  organizationId?: string;
  enabled?: boolean;
  refetchInterval?: number;
}

export interface AnalyticsResponse<T> {
  success: boolean;
  data: T;
  metadata?: {
    totalRecords?: number;
    dateRange?: {
      start: Date;
      end: Date;
    };
    generatedAt: Date;
    organizationId: string;
  };
  error?: string;
}

export function useAnalytics<T = any>({
  endpoint,
  filters,
  organizationId,
  enabled = true,
  refetchInterval,
}: UseAnalyticsOptions) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    
    // Only add organizationId if it's valid
    if (organizationId && organizationId.trim() !== '') {
      params.append("organizationId", organizationId);
    }
    
    if (filters?.dateRange?.from) {
      params.append("startDate", filters.dateRange.from.toISOString());
    }
    
    if (filters?.dateRange?.to) {
      params.append("endDate", filters.dateRange.to.toISOString());
    }
    
    if (filters?.jobIds?.length) {
      params.append("jobIds", filters.jobIds.join(","));
    }
    
    if (filters?.candidateStatuses?.length) {
      params.append("statuses", filters.candidateStatuses.join(","));
    }
    
    if (filters?.interviewerIds?.length) {
      params.append("interviewerIds", filters.interviewerIds.join(","));
    }
    
    if (filters?.locations?.length) {
      params.append("locations", filters.locations.join(","));
    }
    
    if (filters?.granularity) {
      params.append("granularity", filters.granularity);
    }
    
    return params.toString();
  }, [organizationId, filters]);

  const fetchData = useCallback(async (isRetry = false) => {
    if (!enabled) return;
    
    // Don't fetch if organizationId is undefined or empty
    // This prevents API calls with empty organizationId parameter
    if (!organizationId || organizationId.trim() === '') {
      return;
    }
    
    // Prevent infinite retries
    if (isRetry && retryCount >= maxRetries) {
      console.error(`Analytics API: Max retries (${maxRetries}) exceeded for ${endpoint}`);
      return;
    }

    setLoading(true);
    if (!isRetry) {
      setError(null);
      setRetryCount(0);
    }

    try {
      const queryParams = buildQueryParams();
      const url = `/api/analytics/${endpoint}${queryParams ? `?${queryParams}` : ""}`;
      
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // For authentication errors, don't retry
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Access denied: Please check your permissions`);
        }
        throw new Error(`Analytics API error: ${response.status} ${response.statusText}`);
      }

      const result: AnalyticsResponse<T> = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Analytics API returned error");
      }

      setData(result.data);
      setLastFetch(new Date());
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("Analytics fetch error:", err);
      
      // Only increment retry count for retriable errors (not auth errors)
      if (isRetry && !errorMessage.includes("Access denied")) {
        setRetryCount(prev => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, buildQueryParams, enabled, retryCount, maxRetries]);

  // Initial fetch and filter change handling
  useEffect(() => {
    // Only fetch if we have a valid organizationId
    if (organizationId && organizationId.trim() !== '' && enabled) {
      fetchData();
    }
  }, [fetchData]); // Keep fetchData in dependencies, but fetchData will only be recreated when its deps change

  // Auto-refresh interval - only if no errors
  useEffect(() => {
    if (!refetchInterval || !enabled || error) return;

    const interval = setInterval(() => {
      // Only auto-refresh if there's no error and we haven't exceeded retries
      if (!error && retryCount < maxRetries) {
        fetchData();
      }
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [fetchData, refetchInterval, enabled, error, retryCount, maxRetries]);

  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    lastFetch,
    refetch,
  };
}

// Specific hooks for different analytics endpoints
export function useCandidateFunnel(filters?: AnalyticsFilters, organizationId?: string) {
  return useAnalytics({
    endpoint: "candidate-funnel",
    filters,
    organizationId,
  });
}

export function useJobPerformance(filters?: AnalyticsFilters, organizationId?: string) {
  return useAnalytics({
    endpoint: "job-performance",
    filters,
    organizationId,
  });
}

export function useInterviewAssignments(filters?: AnalyticsFilters, organizationId?: string) {
  return useAnalytics({
    endpoint: "interview-assignments",
    filters,
    organizationId,
  });
}

export function useApplicationTrends(filters?: AnalyticsFilters, organizationId?: string) {
  return useAnalytics({
    endpoint: "application-trends",
    filters,
    organizationId,
  });
}

export function useAIScores(filters?: AnalyticsFilters, organizationId?: string) {
  return useAnalytics({
    endpoint: "ai-scores",
    filters,
    organizationId,
  });
}

export function useGeographicAnalytics(filters?: AnalyticsFilters, organizationId?: string) {
  return useAnalytics({
    endpoint: "geographic",
    filters,
    organizationId,
  });
}

export function useUserActivity(filters?: AnalyticsFilters, organizationId?: string) {
  return useAnalytics({
    endpoint: "user-activity",
    filters,
    organizationId,
  });
}

export function useCustomFieldUsage(filters?: AnalyticsFilters, organizationId?: string) {
  return useAnalytics({
    endpoint: "custom-fields",
    filters,
    organizationId,
  });
}