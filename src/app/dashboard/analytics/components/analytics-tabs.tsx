"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HomeIcon, GitBranchIcon, BriefcaseIcon, MessageSquareIcon, ActivityIcon } from "lucide-react"
import { OverviewTab } from "./overview-tab"
import { CandidateFunnelChart } from "./CandidateFunnelChart"
import { JobPerformanceChart } from "./JobPerformanceChart"
import { InterviewAssignmentChart } from "./InterviewAssignmentChart"
import { ApplicationTrendsChart } from "./ApplicationTrendsChart"
import type { FunnelData, JobData, InterviewData, TrendsData, Filters } from "./types"

interface AnalyticsTabsProps {
  activeTab: string
  onTabChange: (tabValue: string) => void
  filters: Filters
  organizationId: string | undefined
  funnelData: FunnelData
  jobData: JobData
  interviewData: InterviewData
  trendsData: TrendsData
  isLoadingFunnel: boolean
  isLoadingJob: boolean
  isLoadingInterview: boolean
  isLoadingTrends: boolean
  dateRange: Date[] | null
}

export function AnalyticsTabs({
  activeTab,
  onTabChange,
  filters,
  organizationId,
  funnelData,
  jobData,
  interviewData,
  trendsData,
  isLoadingFunnel,
  isLoadingJob,
  isLoadingInterview,
  isLoadingTrends,
  dateRange,
}: AnalyticsTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <HomeIcon className="h-4 w-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="funnel" className="flex items-center gap-2">
          <GitBranchIcon className="h-4 w-4" />
          Candidate Funnel
        </TabsTrigger>
        <TabsTrigger value="jobs" className="flex items-center gap-2">
          <BriefcaseIcon className="h-4 w-4" />
          Job Performance
        </TabsTrigger>
        <TabsTrigger value="interviews" className="flex items-center gap-2">
          <MessageSquareIcon className="h-4 w-4" />
          Interviews
        </TabsTrigger>
        <TabsTrigger value="trends" className="flex items-center gap-2">
          <ActivityIcon className="h-4 w-4" />
          Trends
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-6">
        <OverviewTab
          funnelData={funnelData}
          jobData={jobData}
          interviewData={interviewData}
          trendsData={trendsData}
          isLoadingFunnel={isLoadingFunnel}
          isLoadingJob={isLoadingJob}
          isLoadingInterview={isLoadingInterview}
          isLoadingTrends={isLoadingTrends}
          dateRange={dateRange}
          onNavigateToTab={onTabChange}
        />
      </TabsContent>

      {/* Candidate Funnel Tab */}
      <TabsContent value="funnel" className="space-y-4">
        <CandidateFunnelChart filters={filters} organizationId={organizationId} />
      </TabsContent>

      {/* Job Performance Tab */}
      <TabsContent value="jobs" className="space-y-4">
        <JobPerformanceChart filters={filters} organizationId={organizationId} />
      </TabsContent>

      {/* Interview Assignments Tab */}
      <TabsContent value="interviews" className="space-y-4">
        <InterviewAssignmentChart filters={filters} organizationId={organizationId} />
      </TabsContent>

      {/* Application Trends Tab */}
      <TabsContent value="trends" className="space-y-4">
        <ApplicationTrendsChart filters={filters} organizationId={organizationId} />
      </TabsContent>
    </Tabs>
  )
}
