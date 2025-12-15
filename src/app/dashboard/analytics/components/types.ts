// Import API types for consistency
import type { JobPerformanceData as APIJobPerformanceData } from '@/app/api/analytics/types';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface Filters {
  dateRange?: DateRange;
}

export interface FunnelSummary {
  totalCandidates: number;
  acceptedCandidates: number;
  rejectedCandidates: number;
  overallConversionRate: number;
  avgTimeToHire: number;
}

export interface FunnelData {
  summary?: FunnelSummary;
  funnelData?: Array<{
    stage: string;
    count: number;
    conversionRate: number;
    avgTimeInDays: number;
    previousStageCount: number;
  }>;
  data?: any;
}

export interface JobSummary {
  totalJobs: number;
  totalApplications: number;
  openJobs: number;
  closedJobs: number;
  publishedJobs: number;
  overallSuccessRate: number;
  avgTimeToFill: number;
}

// Re-export JobPerformanceData from API types for consistency
export type JobPerformanceData = APIJobPerformanceData;

export interface JobData {
  summary?: JobSummary;
  jobPerformanceData?: JobPerformanceData[];
  insights?: {
    topPerformingJobs?: JobPerformanceData[];
  };
  data?: any;
}

export interface InterviewSummary {
  totalInterviewers: number;
  totalAssignments: number;
  overallCompletionRate: number;
  overallSuccessRate: number;
}

export interface InterviewData {
  summary?: InterviewSummary;
  assignmentData?: Array<{
    interviewerName: string;
    interviewerEmail: string;
    role: string;
    assignments: number;
    completions: number;
    pending: number;
    accepted: number;
    rejected: number;
    completionRate: number;
    successRate: number;
    avgRating: number;
    avgExperienceScore: number;
    avgSkillsScore: number;
    avgDailyAssignments: number;
  }>;
  data?: any;
}

export interface TrendsSummary {
  totalApplications: number;
  totalAccepted: number;
  totalRejected: number;
  avgApplicationsPerPeriod: number;
  overallConversionRate: number;
}

export interface TrendsData {
  summary?: TrendsSummary;
  trendData?: Array<{
    date: string;
    periodType: string;
    applications: number;
    appliedCount: number;
    screeningCount: number;
    shortlistedCount: number;
    processingCount: number;
    acceptedCount: number;
    rejectedCount: number;
    growthRate: number;
    conversionRate: number;
    rejectionRate: number;
    jobDiversity: number;
    trend: string;
    movingAverage?: number;
  }>;
  data?: any;
}
