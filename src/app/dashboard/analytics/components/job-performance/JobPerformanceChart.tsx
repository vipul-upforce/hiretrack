"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCcwIcon } from "lucide-react";
import { useJobPerformance } from "../../hooks/useAnalytics";
import { AnalyticsFilters } from "../../hooks/useAnalytics";
import JobPerformanceSkeleton from "./../loading-skeletons/job-performance";
import SummaryCards from "./summary-cards";
import JobStatusBreakdown from "./job-status-breakdown";
import InsightsCards from "./insights-cards";
import JobPerformanceTabs from "./job-performance-tabs";
import JobPerformanceExport from "./job-performance-export";

export interface JobPerformanceChartProps {
  filters?: AnalyticsFilters;
  organizationId?: string;
}

export interface JobPerformanceData {
  jobId: string;
  title: string;
  applications: number;
  accepted: number;
  rejected: number;
  processing: number;
  timeToFill: number;
  successRate: number;
  status: string;
  createdAt: Date;
  closedAt?: Date;
  jobDuration: number;
  salaryRange?: {
    min?: number;
    max?: number;
    inText?: string;
  } | null;
  requiredExperience: number;
  skillsRequired: number;
}

export const JobPerformanceChart: React.FC<JobPerformanceChartProps> = ({
  filters,
  organizationId,
}) => {
  const { data, loading, error, refetch } = useJobPerformance(
    filters,
    organizationId
  );
  const [jobData, setJobData] = useState<JobPerformanceData[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    if (data) {
      setJobData(data.jobPerformanceData || []);
      setSummary(data.summary || null);
      setInsights(data.insights || null);
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
          <div className="h-64 flex items-center justify-center text-red-500">
            <div className="text-center">
              <p>Error loading job performance data</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleRefresh}
              >
                <RefreshCcwIcon className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
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
              <RefreshCcwIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <JobPerformanceExport jobData={jobData} summary={summary} />
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
};
