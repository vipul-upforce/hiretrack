"use client"

import { useState, useEffect, useMemo } from "react"
import { HeaderControls } from "./components/header-controls"
import { AnalyticsTabs } from "./components/analytics-tabs"
import {
  useCandidateFunnel,
  useJobPerformance,
  useInterviewAssignments,
  useApplicationTrends,
} from "./hooks/useAnalytics"
import { exportToCSV } from "./utils/export"
import { useSelector } from "react-redux"
import type { User } from "@/lib/features/org/orgApi"
import type { Filters } from "./components/types"

export default function AnalyticsPage() {
  const toDate = (dateValue: any): Date | null => {
    if (!dateValue) return null
    if (dateValue instanceof Date) return dateValue
    if (typeof dateValue === "string" || typeof dateValue === "number") {
      const date = new Date(dateValue)
      return isNaN(date.getTime()) ? null : date
    }
    if (dateValue.toDate && typeof dateValue.toDate === "function") {
      return dateValue.toDate()
    }
    if (dateValue.toISOString && typeof dateValue.toISOString === "function") {
      return new Date(dateValue.toISOString())
    }
    return null
  }

  const [dateRange, setDateRange] = useState<Date[] | null>(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    return [thirtyDaysAgo, now]
  })

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined)
  const [isLoadingOrg, setIsLoadingOrg] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  const { user }: { user: User } = useSelector((state: any) => state.auth || {})

  const filters = useMemo(() => {
    if (!dateRange || dateRange.length !== 2) return {}

    const fromDate = toDate(dateRange[0])
    const toDateValue = toDate(dateRange[1])

    return {
      dateRange: fromDate && toDateValue ? { from: fromDate, to: toDateValue } : undefined,
    } as Filters
  }, [dateRange?.[0], dateRange?.[1]])

  const {
    data: funnelData,
    loading: funnelLoading,
    refetch: refetchFunnel,
  } = useCandidateFunnel(filters, organizationId)
  const { data: jobData, loading: jobLoading, refetch: refetchJob } = useJobPerformance(filters, organizationId)
  const {
    data: interviewData,
    loading: interviewLoading,
    refetch: refetchInterview,
  } = useInterviewAssignments(filters, organizationId)
  const {
    data: trendsData,
    loading: trendsLoading,
    refetch: refetchTrends,
  } = useApplicationTrends(filters, organizationId)

  // Get user's organization ID from token
  useEffect(() => {
    const getUserOrganization = async () => {
      try {
        if (user) {
          setOrganizationId(user.organizationId)
        }
      } catch (error) {
        console.error("Error getting user organization:", error)
      } finally {
        setIsLoadingOrg(false)
      }
    }

    getUserOrganization()
  }, [user])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([refetchFunnel(), refetchJob(), refetchInterview(), refetchTrends()])
    } catch (error) {
      console.error("Error refreshing analytics data:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleExport = () => {
    try {
      const exportData: any[] = []

      // Add export timestamp and filters
      exportData.push({
        "Report Type": "COMPREHENSIVE ANALYTICS REPORT",
        "Generated At": new Date().toLocaleString(),
        "Date Range":
          dateRange && dateRange.length === 2
            ? `${toDate(dateRange[0])?.toLocaleDateString()} - ${toDate(dateRange[1])?.toLocaleDateString()}`
            : "All time",
        "Organization ID": organizationId || "N/A",
      })

      exportData.push({})

      // ... existing export logic ...
      const funnelInfo = funnelData
      if (funnelInfo?.funnelData && funnelInfo.funnelData.length > 0) {
        exportData.push({ "Report Type": "=== CANDIDATE FUNNEL ANALYSIS ===" })

        funnelInfo.funnelData.forEach((stage) => {
          exportData.push({
            Stage: stage.stage,
            Count: stage.count,
            "Conversion Rate (%)": stage.conversionRate.toFixed(2),
            "Average Time (Days)": stage.avgTimeInDays.toFixed(1),
            "Previous Stage Count": stage.previousStageCount,
          })
        })

        if (funnelInfo.summary) {
          exportData.push({})
          exportData.push({ Stage: "FUNNEL SUMMARY" })
          exportData.push({
            Stage: "Total Candidates",
            Count: funnelInfo.summary.totalCandidates,
          })
          exportData.push({
            Stage: "Accepted Candidates",
            Count: funnelInfo.summary.acceptedCandidates,
          })
          exportData.push({
            Stage: "Rejected Candidates",
            Count: funnelInfo.summary.rejectedCandidates,
          })
          exportData.push({
            Stage: "Overall Conversion Rate",
            "Conversion Rate (%)": `${funnelInfo.summary.overallConversionRate}%`,
          })
          exportData.push({
            Stage: "Average Time to Hire",
            "Average Time (Days)": `${funnelInfo.summary.avgTimeToHire} days`,
          })
        }

        exportData.push({})
      }

      const jobInfo = jobData
      if (jobInfo?.jobPerformanceData && jobInfo.jobPerformanceData.length > 0) {
        exportData.push({ "Report Type": "=== JOB PERFORMANCE ANALYSIS ===" })

        jobInfo.jobPerformanceData.forEach((job) => {
          exportData.push({
            "Job Title": job.title,
            Status: job.status,
            Applications: job.applications,
            Accepted: job.accepted,
            Rejected: job.rejected,
            Processing: job.processing,
            "Success Rate (%)": job.successRate.toFixed(2),
            "Time to Fill (Days)": job.timeToFill.toFixed(1),
            "Job Duration (Days)": job.jobDuration,
            "Required Experience": job.requiredExperience,
            "Skills Required": job.skillsRequired,
            "Salary Range": job.salaryRange?.inText || "Not specified",
            "Created Date": new Date(job.createdAt).toLocaleDateString(),
            "Closed Date": job.closedAt ? new Date(job.closedAt).toLocaleDateString() : "Still open",
          })
        })

        if (jobInfo.summary) {
          exportData.push({})
          exportData.push({ "Job Title": "JOB PERFORMANCE SUMMARY" })
          exportData.push({
            "Job Title": "Total Jobs",
            Applications: jobInfo.summary.totalJobs,
          })
          exportData.push({
            "Job Title": "Total Applications",
            Applications: jobInfo.summary.totalApplications,
          })
          exportData.push({
            "Job Title": "Open Jobs",
            Status: "open",
            Applications: jobInfo.summary.openJobs,
          })
          exportData.push({
            "Job Title": "Closed Jobs",
            Status: "closed",
            Applications: jobInfo.summary.closedJobs,
          })
          exportData.push({
            "Job Title": "Published Jobs",
            Status: "published",
            Applications: jobInfo.summary.publishedJobs,
          })
          exportData.push({
            "Job Title": "Overall Success Rate",
            "Success Rate (%)": `${jobInfo.summary.overallSuccessRate}%`,
          })
          exportData.push({
            "Job Title": "Average Time to Fill",
            "Time to Fill (Days)": `${jobInfo.summary.avgTimeToFill} days`,
          })
        }

        exportData.push({})
      }

      const interviewInfo = interviewData
      if (interviewInfo?.assignmentData && interviewInfo.assignmentData.length > 0) {
        exportData.push({
          "Report Type": "=== INTERVIEW ASSIGNMENT ANALYSIS ===",
        })

        interviewInfo.assignmentData.forEach((interviewer) => {
          exportData.push({
            Interviewer: interviewer.interviewerName,
            Email: interviewer.interviewerEmail,
            Role: interviewer.role,
            "Total Assignments": interviewer.assignments,
            Completed: interviewer.completions,
            Pending: interviewer.pending,
            Accepted: interviewer.accepted,
            Rejected: interviewer.rejected,
            "Completion Rate (%)": interviewer.completionRate.toFixed(2),
            "Success Rate (%)": interviewer.successRate.toFixed(2),
            "Average Rating": interviewer.avgRating.toFixed(2),
            "Average Experience Score": interviewer.avgExperienceScore.toFixed(2),
            "Average Skills Score": interviewer.avgSkillsScore.toFixed(2),
            "Average Daily Assignments": interviewer.avgDailyAssignments.toFixed(1),
          })
        })

        if (interviewInfo.summary) {
          exportData.push({})
          exportData.push({ Interviewer: "INTERVIEW ASSIGNMENT SUMMARY" })
          exportData.push({
            Interviewer: "Total Interviewers",
            "Total Assignments": interviewInfo.summary.totalInterviewers,
          })
          exportData.push({
            Interviewer: "Total Assignments",
            "Total Assignments": interviewInfo.summary.totalAssignments,
          })
          exportData.push({
            Interviewer: "Overall Completion Rate",
            "Completion Rate (%)": `${interviewInfo.summary.overallCompletionRate}%`,
          })
          exportData.push({
            Interviewer: "Overall Success Rate",
            "Success Rate (%)": `${interviewInfo.summary.overallSuccessRate}%`,
          })
        }

        exportData.push({})
      }

      const trendsInfo = trendsData
      if (trendsInfo?.trendData && trendsInfo.trendData.length > 0) {
        exportData.push({
          "Report Type": "=== APPLICATION TRENDS ANALYSIS ===",
        })

        trendsInfo.trendData.forEach((trend) => {
          exportData.push({
            Date: trend.date,
            "Period Type": trend.periodType,
            Applications: trend.applications,
            Applied: trend.appliedCount,
            Screening: trend.screeningCount,
            Shortlisted: trend.shortlistedCount,
            Processing: trend.processingCount,
            Accepted: trend.acceptedCount,
            Rejected: trend.rejectedCount,
            "Growth Rate (%)": trend.growthRate.toFixed(2),
            "Conversion Rate (%)": trend.conversionRate.toFixed(2),
            "Rejection Rate (%)": trend.rejectionRate.toFixed(2),
            "Job Diversity": trend.jobDiversity,
            Trend: trend.trend,
            "Moving Average": trend.movingAverage || "N/A",
          })
        })

        if (trendsInfo.summary) {
          exportData.push({})
          exportData.push({ Date: "APPLICATION TRENDS SUMMARY" })
          exportData.push({
            Date: "Total Applications",
            Applications: trendsInfo.summary.totalApplications,
          })
          exportData.push({
            Date: "Total Accepted",
            Accepted: trendsInfo.summary.totalAccepted,
          })
          exportData.push({
            Date: "Total Rejected",
            Rejected: trendsInfo.summary.totalRejected,
          })
          exportData.push({
            Date: "Average per Period",
            Applications: trendsInfo.summary.avgApplicationsPerPeriod,
          })
          exportData.push({
            Date: "Overall Conversion Rate",
            "Conversion Rate (%)": `${trendsInfo.summary.overallConversionRate}%`,
          })
        }
      }

      if (exportData.length > 2) {
        exportToCSV(exportData, "comprehensive_analytics_report")
      } else {
        console.warn("No analytics data available to export")
        if (exportData.length > 0) {
          exportToCSV(exportData, "analytics_report_empty")
        }
      }
    } catch (error) {
      console.error("Error exporting analytics data:", error)
    }
  }

  // Show loading while getting organizationId
  if (isLoadingOrg) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  // Show error if no organizationId found
  if (!organizationId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500">Unable to load analytics</p>
            <p className="text-sm text-muted-foreground mt-2">Organization information not found</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <HeaderControls
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onRefresh={handleRefresh}
        onExport={handleExport}
        isRefreshing={isRefreshing}
        isExporting={funnelLoading || jobLoading || interviewLoading || trendsLoading}
      />

      {/* Analytics Tabs */}
      <AnalyticsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        filters={filters}
        organizationId={organizationId}
        funnelData={funnelData}
        jobData={jobData}
        interviewData={interviewData}
        trendsData={trendsData}
        isLoadingFunnel={funnelLoading}
        isLoadingJob={jobLoading}
        isLoadingInterview={interviewLoading}
        isLoadingTrends={trendsLoading}
        dateRange={dateRange}
      />
    </div>
  )
}
