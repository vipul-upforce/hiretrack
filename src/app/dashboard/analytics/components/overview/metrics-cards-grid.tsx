"use client";
import { MetricCard } from "./metric-card";
import {
  UsersIcon,
  BriefcaseIcon,
  ClockIcon,
  BarChartIcon,
} from "lucide-react";
import type { FunnelData, JobData, InterviewData, TrendsData } from "../types";

interface MetricsCardsGridProps {
  funnelData: FunnelData;
  jobData: JobData;
  interviewData: InterviewData;
  trendsData: TrendsData;
  isLoadingFunnel: boolean;
  isLoadingJob: boolean;
  isLoadingInterview: boolean;
  isLoadingTrends: boolean;
  onNavigateToTab: (tabValue: string) => void;
}

export function MetricsCardsGrid({
  funnelData,
  jobData,
  interviewData,
  trendsData,
  isLoadingFunnel,
  isLoadingJob,
  isLoadingInterview,
  isLoadingTrends,
  onNavigateToTab,
}: MetricsCardsGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Candidate Funnel Card */}
      <MetricCard
        title="Candidate Funnel"
        description="Selection ratio"
        icon={
          <UsersIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        }
        iconBgColor="bg-blue-100 dark:bg-blue-950/20"
        mainValue={`${funnelData?.summary?.overallConversionRate || 0}%`}
        showTrendIcon={
          !isLoadingFunnel &&
          (funnelData?.summary?.overallConversionRate || 0) > 10
        }
        trendIsPositive
        secondaryMetrics={[
          {
            label: "Total",
            value: `${funnelData?.summary?.totalCandidates || 0} candidates`,
          },
          {
            label: "Accepted",
            value: funnelData?.summary?.acceptedCandidates || 0,
          },
        ]}
        onDetailsClick={() => onNavigateToTab("funnel")}
        isLoading={isLoadingFunnel}
      />

      {/* Job Performance Card */}
      <MetricCard
        title="Job Performance"
        description="Hiring effectiveness"
        icon={
          <BriefcaseIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
        }
        iconBgColor="bg-green-100 dark:bg-green-950/20"
        mainValue={jobData?.summary?.openJobs || 0}
        showTrendIcon={false}
        secondaryMetrics={[
          {
            label: "Success Rate",
            value: `${jobData?.summary?.overallSuccessRate || 0}%`,
          },
          {
            label: "Applications",
            value: jobData?.summary?.totalApplications || 0,
          },
        ]}
        onDetailsClick={() => onNavigateToTab("jobs")}
        isLoading={isLoadingJob}
        detailsButtonLabel="Show Details"
      />

      {/* Interview Assignments Card */}
      <MetricCard
        title="Interview Assignments"
        description="Interviewer workload"
        icon={
          <ClockIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        }
        iconBgColor="bg-purple-100 dark:bg-purple-950/20"
        mainValue={`${interviewData?.summary?.overallCompletionRate || 0}%`}
        showTrendIcon={
          !isLoadingInterview &&
          (interviewData?.summary?.overallCompletionRate || 0) > 80
        }
        trendIsPositive
        secondaryMetrics={[
          {
            label: "Interviewers",
            value: interviewData?.summary?.totalInterviewers || 0,
          },
          {
            label: "Total Assignments",
            value: interviewData?.summary?.totalAssignments || 0,
          },
        ]}
        onDetailsClick={() => onNavigateToTab("interviews")}
        isLoading={isLoadingInterview}
      />

      {/* Application Trends Card */}
      <MetricCard
        title="Application Trends"
        description="Growth patterns"
        icon={
          <BarChartIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        }
        iconBgColor="bg-orange-100 dark:bg-orange-950/20"
        mainValue={trendsData?.summary?.totalApplications || 0}
        showTrendIcon={false}
        secondaryMetrics={[
          {
            label: "Conversion",
            value: `${trendsData?.summary?.overallConversionRate || 0}%`,
          },
          {
            label: "Daily Avg",
            value: trendsData?.summary?.avgApplicationsPerPeriod || 0,
          },
        ]}
        onDetailsClick={() => onNavigateToTab("trends")}
        isLoading={isLoadingTrends}
      />
    </div>
  );
}
