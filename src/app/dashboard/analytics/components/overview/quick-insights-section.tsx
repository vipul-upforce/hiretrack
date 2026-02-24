'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { InterviewData, JobData, TrendsData } from '../types';

interface QuickInsightsSectionProps {
  jobData: JobData;
  trendsData: TrendsData;
  interviewData: InterviewData;
  dateRange: Date[] | null;
  isLoadingJob: boolean;
  isLoadingTrends: boolean;
  isLoadingInterview: boolean;
}

export function QuickInsightsSection({
  jobData,
  trendsData,
  interviewData,
  dateRange,
  isLoadingJob,
  isLoadingTrends,
  isLoadingInterview,
}: QuickInsightsSectionProps) {
  // Helper function to format date range
  const formatDateRange = () => {
    if (!dateRange || dateRange.length !== 2) return 'Selected date range';
    try {
      const fromDate = dateRange[0];
      const toDate = dateRange[1];
      return fromDate && toDate
        ? `${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}`
        : 'Selected date range';
    } catch {
      return 'Selected date range';
    }
  };

  const renderAvgTimeToFill = () => {
    if (isLoadingJob) {
      return <Skeleton className="h-6 w-10 rounded-lg" />;
    }

    const avgTime = jobData?.summary?.avgTimeToFill;

    if (typeof avgTime === 'number' && avgTime > 0) {
      return `${avgTime} days`;
    }

    return 'No hires yet';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Quick Insights Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Insights</CardTitle>
          <CardDescription>
            {jobData?.summary?.totalJobs === 0
              ? 'Create some jobs and receive applications to see insights'
              : 'Key trends and highlights'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Top Performing Job */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 dark:bg-muted/20">
            <div>
              <div className="font-medium">Top Performing Job</div>
              <div className="text-sm text-muted-foreground">
                {isLoadingJob ? (
                  <Skeleton className="mt-1 h-4 w-20 rounded-lg" />
                ) : (
                  jobData?.insights?.topPerformingJobs?.[0]?.title ||
                  jobData?.jobPerformanceData?.[0]?.title ||
                  'No jobs available'
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-green-600 dark:text-green-400">
                {isLoadingJob ? (
                  <Skeleton className="h-6 w-10 rounded-lg" />
                ) : (
                  `${
                    jobData?.insights?.topPerformingJobs?.[0]?.successRate ||
                    jobData?.jobPerformanceData?.[0]?.successRate ||
                    0
                  }%`
                )}
              </div>
            </div>
          </div>

          {/* Average Time to Fill */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 dark:bg-muted/20">
            <div>
              <div className="font-medium">Average Time to Fill</div>
              <div className="text-sm text-muted-foreground">
                {jobData?.summary?.totalJobs
                  ? `Across ${jobData.summary.totalJobs} jobs`
                  : 'Across all jobs'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                {/* Use the helper function here */}
                {renderAvgTimeToFill()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>Latest hiring metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Applications This Period */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 dark:bg-muted/20">
            <div>
              <div className="font-medium">Applications This Period</div>
              <div className="text-sm text-muted-foreground">
                {formatDateRange()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                {isLoadingTrends ? (
                  <Skeleton className="h-6 w-10 rounded-lg" />
                ) : (
                  trendsData?.summary?.totalApplications || 0
                )}
              </div>
            </div>
          </div>

          {/* Active Interviewers */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 dark:bg-muted/20">
            <div>
              <div className="font-medium">Active Interviewers</div>
              <div className="text-sm text-muted-foreground">
                Currently assigned
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                {isLoadingInterview ? (
                  <Skeleton className="h-6 w-10 rounded-lg" />
                ) : (
                  interviewData?.summary?.totalInterviewers || 0
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
