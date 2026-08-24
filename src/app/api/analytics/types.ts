export interface AnalyticsRequest {
  organizationId: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: {
    jobIds?: string[];
    candidateStatuses?: string[];
    interviewerIds?: string[];
    locations?: string[];
  };
}

export interface FunnelData {
  stage: string;
  count: number;
  conversionRate: number;
  avgTimeInDays: number;
  previousStageCount: number;
  color: string;
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
  requiredExperience: string;
  skillsRequired: number;
}

export interface AssignmentData {
  interviewerId: string;
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
  candidateDetails: Array<{
    candidateId: string;
    candidateName: string;
    status: string;
    assignedAt: Date;
    interviewTime?: Date;
    scores?: {
      overall?: number;
      experience?: number;
      skills?: number;
    };
  }>;
  workloadDistribution: Date[];
}

export interface TrendData {
  date: string;
  fullDate: Date;
  applications: number;
  appliedCount: number;
  screeningCount: number;
  shortlistedCount: number;
  processingCount: number;
  acceptedCount: number;
  rejectedCount: number;
  trend: 'up' | 'down' | 'stable';
  growthRate: number;
  jobDiversity: number;
  periodType: 'daily' | 'weekly' | 'monthly';
  conversionRate: number;
  rejectionRate: number;
  movingAverage?: number;
}

export interface ScoreData {
  scoreRange: string;
  count: number;
  percentage: number;
  dimension:
    | 'overall'
    | 'experience'
    | 'skills'
    | 'affordability'
    | 'education'
    | 'projects'
    | 'certifications';
}

export interface GeographicData {
  location: string;
  candidateCount: number;
  avgExperience: number;
  avgSalary: number;
  coordinates?: [number, number];
}

export interface ActivityData {
  userId: string;
  userName: string;
  role: string;
  activityCount: number;
  lastActive: Date;
  features: string[];
}

export interface CustomFieldData {
  fieldName: string;
  usageCount: number;
  uniqueValues: number;
  fieldType: string;
  effectiveness: number;
}

export interface AnalyticsApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    totalRecords?: number;
    dateRange?: {
      start: Date;
      end: Date;
    };
    generatedAt: Date;
    organizationId: string;
  };
}
