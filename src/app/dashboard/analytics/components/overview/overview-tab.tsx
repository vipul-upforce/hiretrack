'use client';

import { MetricsCardsGrid } from './metrics-cards-grid';
import { QuickInsightsSection } from './quick-insights-section';
import type {
  FunnelData, JobData, InterviewData, TrendsData,
} from '../types';

interface OverviewTabProps {
  funnelData: FunnelData;
  jobData: JobData;
  interviewData: InterviewData;
  trendsData: TrendsData;
  isLoadingFunnel: boolean;
  isLoadingJob: boolean;
  isLoadingInterview: boolean;
  isLoadingTrends: boolean;
  dateRange: Date[] | null;
  onNavigateToTab: (tabValue: string) => void;
}

export function OverviewTab({
  funnelData,
  jobData,
  interviewData,
  trendsData,
  isLoadingFunnel,
  isLoadingJob,
  isLoadingInterview,
  isLoadingTrends,
  dateRange,
  onNavigateToTab,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <MetricsCardsGrid
        funnelData={funnelData}
        jobData={jobData}
        interviewData={interviewData}
        trendsData={trendsData}
        isLoadingFunnel={isLoadingFunnel}
        isLoadingJob={isLoadingJob}
        isLoadingInterview={isLoadingInterview}
        isLoadingTrends={isLoadingTrends}
        onNavigateToTab={onNavigateToTab}
      />

      {/* Quick Insights Section */}
      <QuickInsightsSection
        jobData={jobData}
        trendsData={trendsData}
        interviewData={interviewData}
        dateRange={dateRange}
        isLoadingJob={isLoadingJob}
        isLoadingTrends={isLoadingTrends}
        isLoadingInterview={isLoadingInterview}
      />
    </div>
  );
}
