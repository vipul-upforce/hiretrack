'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcwIcon } from 'lucide-react';
import {
  useJobPerformance,
  AnalyticsFilters,
  JobPerformanceSummary,
  JobPerformanceInsights,
} from '../../hooks/useAnalytics';
import JobPerformanceSkeleton from '../loading-skeletons/job-performance';
import SummaryCards from './summary-cards';
import JobStatusBreakdown from './job-status-breakdown';
import InsightsCards from './insights-cards';
import JobPerformanceTabs from './job-performance-tabs';
import JobPerformanceExport from './job-performance-export';
import EmptyState from '../empty-state';
import type { JobPerformanceData } from '../types';

export interface JobPerformanceChartProps {
  filters?: AnalyticsFilters;
  organizationId?: string;
}

export function JobPerformanceChart({
  filters,
  organizationId,
}: JobPerformanceChartProps) {
  const { data, loading, error, refetch } = useJobPerformance(
    filters,
    organizationId,
  );

  const [jobData, setJobData] = useState<JobPerformanceData[]>([]);

  const [summary, setSummary] = useState<JobPerformanceSummary | null>(null);
  const [insights, setInsights] = useState<JobPerformanceInsights | null>(null);

  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    if (data) {
      setJobData(data.jobPerformanceData || []);
      setSummary(data.summary || null);
      setInsights(data.insights || null);
      setDataReady(true);
    }
  }, [data]);

  const handleRefresh = () => {
    refetch();
  };

  if (loading) {
    return <JobPerformanceSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Performance Analytics</CardTitle>
          <CardDescription>
            Analyze job posting effectiveness and hiring success
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-red-500">
            <div className="text-center">
              <p>Error loading job performance data</p>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleRefresh}
              >
                <RefreshCcwIcon className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (jobData.length === 0 && dataReady) {
    return (
      <EmptyState
        title="No Job Performance Data"
        description="Analyze job posting effectiveness and hiring success"
        message="No Data available."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Job Performance Analytics</CardTitle>
            <CardDescription>
              Track job posting effectiveness and hiring metrics
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCcwIcon className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <JobPerformanceExport
              jobData={jobData}
              summary={summary as JobPerformanceSummary}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        {summary && <SummaryCards summary={summary} />}

        {/* Job Status Breakdown */}
        {summary && <JobStatusBreakdown summary={summary} />}

        {/* Insights Cards */}
        {insights && <InsightsCards insights={insights} />}

        {/* Charts */}
        <JobPerformanceTabs jobData={jobData} />
      </CardContent>
    </Card>
  );
}
