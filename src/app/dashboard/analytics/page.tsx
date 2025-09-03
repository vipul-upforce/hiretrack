"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  CalendarIcon,
  DownloadIcon,
  RefreshCcwIcon,
  ChevronRightIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  BriefcaseIcon,
  UsersIcon,
  BarChartIcon,
  ClockIcon,
  HomeIcon,
  GitBranchIcon,
  MessageSquareIcon,
  ActivityIcon,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { CandidateFunnelChart } from "./components/CandidateFunnelChart";
import { JobPerformanceChart } from "./components/JobPerformanceChart";
import { InterviewAssignmentChart } from "./components/InterviewAssignmentChart";
import { ApplicationTrendsChart } from "./components/ApplicationTrendsChart";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import Cookies from "js-cookie";
import {
  useCandidateFunnel,
  useJobPerformance,
  useInterviewAssignments,
  useApplicationTrends,
} from "./hooks/useAnalytics";
import { exportToCSV } from "./utils/export";
import { useSelector } from "react-redux";
import { User } from "@/lib/features/org/orgApi";

// Placeholder components - will be implemented in subsequent phases

export default function AnalyticsPage() {
  // Helper function to safely convert date values to Date objects
  const toDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === "string" || typeof dateValue === "number") {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : date;
    }
    // Handle dayjs or other date library objects
    if (dateValue.toDate && typeof dateValue.toDate === "function") {
      return dateValue.toDate();
    }
    if (dateValue.toISOString && typeof dateValue.toISOString === "function") {
      return new Date(dateValue.toISOString());
    }
    return null;
  };

  // Initialize dateRange with stable dates to prevent continuous re-creation
  const [dateRange, setDateRange] = useState<Date[] | null>(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return [thirtyDaysAgo, now];
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | undefined>(
    undefined
  );
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {}
  );
  // Memoize filters to prevent object recreation on every render
  const filters = useMemo(() => {
    if (!dateRange || dateRange.length !== 2) return {};

    const fromDate = toDate(dateRange[0]);
    const toDateValue = toDate(dateRange[1]);

    return {
      dateRange:
        fromDate && toDateValue
          ? { from: fromDate, to: toDateValue }
          : undefined,
    };
  }, [dateRange?.[0], dateRange?.[1]]); // Deep dependency on actual date values

  // Get analytics data using hooks
  const {
    data: funnelData,
    loading: funnelLoading,
    refetch: refetchFunnel,
  } = useCandidateFunnel(filters, organizationId);
  const {
    data: jobData,
    loading: jobLoading,
    refetch: refetchJob,
  } = useJobPerformance(filters, organizationId);
  const {
    data: interviewData,
    loading: interviewLoading,
    refetch: refetchInterview,
  } = useInterviewAssignments(filters, organizationId);
  const {
    data: trendsData,
    loading: trendsLoading,
    refetch: refetchTrends,
  } = useApplicationTrends(filters, organizationId);

  // Get user's organization ID from token
  useEffect(() => {
    const getUserOrganization = async () => {
      try {
        // const token = Cookies.get("token");
        if (user) {
          // const decryptedResponse = await verifyAndDecryptJWTToken(token);
          // if (user) {
          setOrganizationId(user.organizationId);
          // }
        }
      } catch (error) {
        console.error("Error getting user organization:", error);
      } finally {
        setIsLoadingOrg(false);
      }
    };

    getUserOrganization();
  }, []);

  const navigateToTab = (tabValue: string) => {
    setActiveTab(tabValue);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Trigger refetch on all analytics hooks
      await Promise.all([
        refetchFunnel(),
        refetchJob(),
        refetchInterview(),
        refetchTrends(),
      ]);
    } catch (error) {
      console.error("Error refreshing analytics data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = () => {
    try {

      // Prepare comprehensive analytics data export
      const exportData: any[] = [];

      // Add export timestamp and filters
      exportData.push({
        "Report Type": "COMPREHENSIVE ANALYTICS REPORT",
        "Generated At": new Date().toLocaleString(),
        "Date Range":
          dateRange && dateRange.length === 2
            ? `${toDate(dateRange[0])?.toLocaleDateString()} - ${toDate(dateRange[1])?.toLocaleDateString()}`
            : "All time",
        "Organization ID": organizationId || "N/A",
      });

      exportData.push({}); // Empty row for spacing

      // 1. CANDIDATE FUNNEL DATA
      // Check if data exists - it might be wrapped in a 'data' property
      const funnelInfo = funnelData?.data || funnelData;
      if (funnelInfo?.funnelData && funnelInfo.funnelData.length > 0) {
        exportData.push({ "Report Type": "=== CANDIDATE FUNNEL ANALYSIS ===" });

        // Add funnel stages data
        funnelInfo.funnelData.forEach((stage) => {
          exportData.push({
            Stage: stage.stage,
            Count: stage.count,
            "Conversion Rate (%)": stage.conversionRate.toFixed(2),
            "Average Time (Days)": stage.avgTimeInDays.toFixed(1),
            "Previous Stage Count": stage.previousStageCount,
          });
        });

        // Add funnel summary
        if (funnelInfo.summary) {
          exportData.push({});
          exportData.push({ Stage: "FUNNEL SUMMARY" });
          exportData.push({
            Stage: "Total Candidates",
            Count: funnelInfo.summary.totalCandidates,
          });
          exportData.push({
            Stage: "Accepted Candidates",
            Count: funnelInfo.summary.acceptedCandidates,
          });
          exportData.push({
            Stage: "Rejected Candidates",
            Count: funnelInfo.summary.rejectedCandidates,
          });
          exportData.push({
            Stage: "Overall Conversion Rate",
            "Conversion Rate (%)": `${funnelInfo.summary.overallConversionRate}%`,
          });
          exportData.push({
            Stage: "Average Time to Hire",
            "Average Time (Days)": `${funnelInfo.summary.avgTimeToHire} days`,
          });
        }

        exportData.push({}); // Empty row for spacing
      }

      // 2. JOB PERFORMANCE DATA
      const jobInfo = jobData?.data || jobData;
      if (
        jobInfo?.jobPerformanceData &&
        jobInfo.jobPerformanceData.length > 0
      ) {
        exportData.push({ "Report Type": "=== JOB PERFORMANCE ANALYSIS ===" });

        // Add job performance data
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
            "Closed Date": job.closedAt
              ? new Date(job.closedAt).toLocaleDateString()
              : "Still open",
          });
        });

        // Add job performance summary
        if (jobInfo.summary) {
          exportData.push({});
          exportData.push({ "Job Title": "JOB PERFORMANCE SUMMARY" });
          exportData.push({
            "Job Title": "Total Jobs",
            Applications: jobInfo.summary.totalJobs,
          });
          exportData.push({
            "Job Title": "Total Applications",
            Applications: jobInfo.summary.totalApplications,
          });
          exportData.push({
            "Job Title": "Open Jobs",
            Status: "open",
            Applications: jobInfo.summary.openJobs,
          });
          exportData.push({
            "Job Title": "Closed Jobs",
            Status: "closed",
            Applications: jobInfo.summary.closedJobs,
          });
          exportData.push({
            "Job Title": "Published Jobs",
            Status: "published",
            Applications: jobInfo.summary.publishedJobs,
          });
          exportData.push({
            "Job Title": "Overall Success Rate",
            "Success Rate (%)": `${jobInfo.summary.overallSuccessRate}%`,
          });
          exportData.push({
            "Job Title": "Average Time to Fill",
            "Time to Fill (Days)": `${jobInfo.summary.avgTimeToFill} days`,
          });
        }

        exportData.push({}); // Empty row for spacing
      }

      // 3. INTERVIEW ASSIGNMENT DATA
      const interviewInfo = interviewData?.data || interviewData;
      if (
        interviewInfo?.assignmentData &&
        interviewInfo.assignmentData.length > 0
      ) {
        exportData.push({
          "Report Type": "=== INTERVIEW ASSIGNMENT ANALYSIS ===",
        });

        // Add interview assignment data
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
            "Average Experience Score":
              interviewer.avgExperienceScore.toFixed(2),
            "Average Skills Score": interviewer.avgSkillsScore.toFixed(2),
            "Average Daily Assignments":
              interviewer.avgDailyAssignments.toFixed(1),
          });
        });

        // Add interview assignment summary
        if (interviewInfo.summary) {
          exportData.push({});
          exportData.push({ Interviewer: "INTERVIEW ASSIGNMENT SUMMARY" });
          exportData.push({
            Interviewer: "Total Interviewers",
            "Total Assignments": interviewInfo.summary.totalInterviewers,
          });
          exportData.push({
            Interviewer: "Total Assignments",
            "Total Assignments": interviewInfo.summary.totalAssignments,
          });
          exportData.push({
            Interviewer: "Overall Completion Rate",
            "Completion Rate (%)": `${interviewInfo.summary.overallCompletionRate}%`,
          });
          exportData.push({
            Interviewer: "Overall Success Rate",
            "Success Rate (%)": `${interviewInfo.summary.overallSuccessRate}%`,
          });
        }

        exportData.push({}); // Empty row for spacing
      }

      // 4. APPLICATION TRENDS DATA
      const trendsInfo = trendsData?.data || trendsData;
      if (trendsInfo?.trendData && trendsInfo.trendData.length > 0) {
        exportData.push({
          "Report Type": "=== APPLICATION TRENDS ANALYSIS ===",
        });

        // Add trends data
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
          });
        });

        // Add trends summary
        if (trendsInfo.summary) {
          exportData.push({});
          exportData.push({ Date: "APPLICATION TRENDS SUMMARY" });
          exportData.push({
            Date: "Total Applications",
            Applications: trendsInfo.summary.totalApplications,
          });
          exportData.push({
            Date: "Total Accepted",
            Accepted: trendsInfo.summary.totalAccepted,
          });
          exportData.push({
            Date: "Total Rejected",
            Rejected: trendsInfo.summary.totalRejected,
          });
          exportData.push({
            Date: "Average per Period",
            Applications: trendsInfo.summary.avgApplicationsPerPeriod,
          });
          exportData.push({
            Date: "Overall Conversion Rate",
            "Conversion Rate (%)": `${trendsInfo.summary.overallConversionRate}%`,
          });
        }
      }

      // Export the comprehensive data

      if (exportData.length > 2) {
        // At least header + empty row
        exportToCSV(exportData, "comprehensive_analytics_report");
      } else {
        console.warn("No analytics data available to export");
        // Still export the header if that's all we have
        if (exportData.length > 0) {
          exportToCSV(exportData, "analytics_report_empty");
        }
      }
    } catch (error) {
      console.error("Error exporting analytics data:", error);
    }
  };

  // Show loading while getting organizationId
  if (isLoadingOrg) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Show error if no organizationId found
  if (!organizationId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500">Unable to load analytics</p>
            <p className="text-sm text-muted-foreground mt-2">
              Organization information not found
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls section */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <DatePicker
            value={dateRange}
            onChange={setDateRange}
            range={true}
            showTimePicker={false}
            format="MM/DD/YYYY"
            placeholder="Select date range"
            className="w-[240px]"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCcwIcon
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={
              funnelLoading || jobLoading || interviewLoading || trendsLoading
            }
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Analytics Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
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

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Overview Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Candidate Funnel Summary Card */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">
                    Candidate Funnel
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Conversion through stages
                  </CardDescription>
                </div>
                <div className="rounded-full bg-blue-100 dark:bg-blue-950/20 p-3">
                  <UsersIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline space-x-2">
                  <div className="text-2xl font-bold">
                    {funnelLoading
                      ? "-"
                      : `${funnelData?.summary?.overallConversionRate || 0}%`}
                  </div>
                  {!funnelLoading &&
                    funnelData?.summary?.overallConversionRate > 10 && (
                      <TrendingUpIcon className="h-4 w-4 text-green-500" />
                    )}
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    Total:{" "}
                    {funnelLoading
                      ? "-"
                      : funnelData?.summary?.totalCandidates || 0}{" "}
                    candidates
                  </div>
                  <div>
                    Accepted:{" "}
                    {funnelLoading
                      ? "-"
                      : funnelData?.summary?.acceptedCandidates || 0}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigateToTab("funnel")}
                >
                  Show Details <ChevronRightIcon className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Job Performance Summary Card */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">
                    Job Performance
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Hiring effectiveness
                  </CardDescription>
                </div>
                <div className="rounded-full bg-green-100 dark:bg-green-950/20 p-3">
                  <BriefcaseIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline space-x-2">
                  <div className="text-2xl font-bold">
                    {jobLoading ? "-" : jobData?.summary?.openJobs || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">open jobs</div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    Success Rate:{" "}
                    {jobLoading
                      ? "-"
                      : `${jobData?.summary?.overallSuccessRate || 0}%`}
                  </div>
                  <div>
                    Applications:{" "}
                    {jobLoading
                      ? "-"
                      : jobData?.summary?.totalApplications || 0}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigateToTab("jobs")}
                >
                  Show Details <ChevronRightIcon className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Interview Assignments Summary Card */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">
                    Interview Assignments
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Interviewer workload
                  </CardDescription>
                </div>
                <div className="rounded-full bg-purple-100 dark:bg-purple-950/20 p-3">
                  <ClockIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline space-x-2">
                  <div className="text-2xl font-bold">
                    {interviewLoading
                      ? "-"
                      : `${interviewData?.summary?.overallCompletionRate || 0}%`}
                  </div>
                  {!interviewLoading &&
                    interviewData?.summary?.overallCompletionRate > 80 && (
                      <TrendingUpIcon className="h-4 w-4 text-green-500" />
                    )}
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    Interviewers:{" "}
                    {interviewLoading
                      ? "-"
                      : interviewData?.summary?.totalInterviewers || 0}
                  </div>
                  <div>
                    Total Assignments:{" "}
                    {interviewLoading
                      ? "-"
                      : interviewData?.summary?.totalAssignments || 0}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigateToTab("interviews")}
                >
                  Show Details <ChevronRightIcon className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Application Trends Summary Card */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">
                    Application Trends
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Growth patterns
                  </CardDescription>
                </div>
                <div className="rounded-full bg-orange-100 dark:bg-orange-950/20 p-3">
                  <BarChartIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline space-x-2">
                  <div className="text-2xl font-bold">
                    {trendsLoading
                      ? "-"
                      : trendsData?.summary?.totalApplications || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    applications
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    Conversion:{" "}
                    {trendsLoading
                      ? "-"
                      : `${trendsData?.summary?.overallConversionRate || 0}%`}
                  </div>
                  <div>
                    Daily Avg:{" "}
                    {trendsLoading
                      ? "-"
                      : trendsData?.summary?.avgApplicationsPerPeriod || 0}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigateToTab("trends")}
                >
                  Show Details <ChevronRightIcon className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Insights Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Insights</CardTitle>
                <CardDescription>
                  {jobData?.summary?.totalJobs === 0
                    ? "Create some jobs and receive applications to see insights"
                    : "Key trends and highlights"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 dark:bg-muted/20 rounded-lg">
                  <div>
                    <div className="font-medium">Top Performing Job</div>
                    <div className="text-sm text-muted-foreground">
                      {jobLoading
                        ? "Loading..."
                        : jobData?.insights?.topPerformingJobs?.[0]?.title ||
                        jobData?.jobPerformanceData?.[0]?.title ||
                        "No jobs available"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-600 dark:text-green-400">
                      {jobLoading
                        ? "-"
                        : `${jobData?.insights?.topPerformingJobs?.[0]
                          ?.successRate ||
                        jobData?.jobPerformanceData?.[0]?.successRate ||
                        0
                        }%`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 dark:bg-muted/20 rounded-lg">
                  <div>
                    <div className="font-medium">Average Time to Fill</div>
                    <div className="text-sm text-muted-foreground">
                      {jobData?.summary?.totalJobs
                        ? `Across ${jobData.summary.totalJobs} jobs`
                        : "Across all jobs"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {jobLoading
                        ? "-"
                        : jobData?.summary?.avgTimeToFill > 0
                          ? `${jobData.summary.avgTimeToFill} days`
                          : "No hires yet"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>Latest hiring metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 dark:bg-muted/20 rounded-lg">
                  <div>
                    <div className="font-medium">Applications This Period</div>
                    <div className="text-sm text-muted-foreground">
                      {dateRange && dateRange.length === 2
                        ? (() => {
                          const fromDate = toDate(dateRange[0]);
                          const toDateValue = toDate(dateRange[1]);
                          return fromDate && toDateValue
                            ? `${fromDate.toLocaleDateString()} - ${toDateValue.toLocaleDateString()}`
                            : "Selected date range";
                        })()
                        : "Selected date range"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {trendsLoading
                        ? "-"
                        : trendsData?.summary?.totalApplications || 0}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 dark:bg-muted/20 rounded-lg">
                  <div>
                    <div className="font-medium">Active Interviewers</div>
                    <div className="text-sm text-muted-foreground">
                      Currently assigned
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {interviewLoading
                        ? "-"
                        : interviewData?.summary?.totalInterviewers || 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <CandidateFunnelChart
            filters={filters}
            organizationId={organizationId}
          />
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <JobPerformanceChart
            filters={filters}
            organizationId={organizationId}
          />
        </TabsContent>

        <TabsContent value="interviews" className="space-y-4">
          <InterviewAssignmentChart
            filters={filters}
            organizationId={organizationId}
          />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <ApplicationTrendsChart
            filters={filters}
            organizationId={organizationId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
