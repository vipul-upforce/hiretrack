"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { 
  GitBranchIcon,
  MessageSquareIcon,
  ActivityIcon,
  DownloadIcon,
  RefreshCcwIcon,
  CalendarIcon
} from "lucide-react";
import { CandidateFunnelChart } from "@/app/dashboard/analytics/components/CandidateFunnelChart";
import { InterviewAssignmentChart } from "@/app/dashboard/analytics/components/InterviewAssignmentChart";
import { ApplicationTrendsChart } from "@/app/dashboard/analytics/components/ApplicationTrendsChart";
import { exportToCSV } from "@/app/dashboard/analytics/utils/export";
import { 
  useCandidateFunnel, 
  useInterviewAssignments, 
  useApplicationTrends 
} from "@/app/dashboard/analytics/hooks/useAnalytics";
import { Job } from "@/types/job";

interface JobAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  organizationId: string;
}

export const JobAnalyticsModal: React.FC<JobAnalyticsModalProps> = ({
  isOpen,
  onClose,
  job,
  organizationId
}) => {
  // Helper function to safely convert date values to Date objects
  const toDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : date;
    }
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    if (dateValue.toISOString && typeof dateValue.toISOString === 'function') {
      return new Date(dateValue.toISOString());
    }
    return null;
  };

  // Initialize date range from job creation date to today
  const [dateRange, setDateRange] = useState<Date[] | null>(() => {
    const now = new Date();
    const jobCreatedDate = job.tracking?.createdAt ? new Date(job.tracking.createdAt) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return [jobCreatedDate, now];
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("funnel");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Memoize filters with jobId
  const filters = useMemo(() => {
    if (!dateRange || dateRange.length !== 2) return { jobIds: [job._id] };
    
    const fromDate = toDate(dateRange[0]);
    const toDateValue = toDate(dateRange[1]);
    
    return {
      dateRange: fromDate && toDateValue ? { from: fromDate, to: toDateValue } : undefined,
      jobIds: [job._id] // Filter for this specific job
    };
  }, [dateRange?.[0], dateRange?.[1], job._id]);

  // Get analytics data using hooks
  const { data: funnelData, loading: funnelLoading, refetch: refetchFunnel } = useCandidateFunnel(filters, organizationId);
  const { data: interviewData, loading: interviewLoading, refetch: refetchInterview } = useInterviewAssignments(filters, organizationId);
  const { data: trendsData, loading: trendsLoading, refetch: refetchTrends } = useApplicationTrends(filters, organizationId);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchFunnel(),
        refetchInterview(),
        refetchTrends(),
      ]);
    } catch (error) {
      console.error('Error refreshing analytics data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = () => {
    try {
      const exportData: any[] = [];
      
      // Add header with job information
      exportData.push({
        "Report Type": `JOB ANALYTICS REPORT - ${job.title}`,
        "Job ID": job._id,
        "Generated At": new Date().toLocaleString(),
        "Date Range": dateRange && dateRange.length === 2 ? 
          `${toDate(dateRange[0])?.toLocaleDateString()} - ${toDate(dateRange[1])?.toLocaleDateString()}` : 
          "All time",
        "Organization ID": organizationId
      });
      
      exportData.push({}); // Empty row for spacing

      // Add analytics data similar to the main export
      const funnelInfo = funnelData?.data || funnelData;
      if (funnelInfo?.funnelData && funnelInfo.funnelData.length > 0) {
        exportData.push({ "Report Type": "=== CANDIDATE FUNNEL ===" });
        funnelInfo.funnelData.forEach(stage => {
          exportData.push({
            "Stage": stage.stage,
            "Count": stage.count,
            "Conversion Rate (%)": stage.conversionRate.toFixed(2),
            "Average Time (Days)": stage.avgTimeInDays.toFixed(1)
          });
        });
        
        if (funnelInfo.summary) {
          exportData.push({});
          exportData.push({ "Stage": "SUMMARY" });
          exportData.push({ "Stage": "Total Candidates", "Count": funnelInfo.summary.totalCandidates });
          exportData.push({ "Stage": "Accepted", "Count": funnelInfo.summary.acceptedCandidates });
          exportData.push({ "Stage": "Rejected", "Count": funnelInfo.summary.rejectedCandidates });
        }
        exportData.push({});
      }

      const interviewInfo = interviewData?.data || interviewData;
      if (interviewInfo?.assignmentData && interviewInfo.assignmentData.length > 0) {
        exportData.push({ "Report Type": "=== INTERVIEW ASSIGNMENTS ===" });
        interviewInfo.assignmentData.forEach(interviewer => {
          exportData.push({
            "Interviewer": interviewer.interviewerName,
            "Assignments": interviewer.assignments,
            "Completed": interviewer.completions,
            "Pending": interviewer.pending,
            "Success Rate (%)": interviewer.successRate.toFixed(2)
          });
        });
        exportData.push({});
      }

      const trendsInfo = trendsData?.data || trendsData;
      if (trendsInfo?.trendData && trendsInfo.trendData.length > 0) {
        exportData.push({ "Report Type": "=== APPLICATION TRENDS ===" });
        trendsInfo.trendData.forEach(trend => {
          exportData.push({
            "Date": trend.date,
            "Applications": trend.applications,
            "Growth Rate (%)": trend.growthRate.toFixed(2),
            "Conversion Rate (%)": trend.conversionRate.toFixed(2)
          });
        });
      }

      if (exportData.length > 2) {
        exportToCSV(exportData, `job_analytics_${job.title.replace(/\s+/g, '_').toLowerCase()}`);
      }
    } catch (error) {
      console.error("Error exporting job analytics:", error);
    }
  };

  // Get the max selectable date (job creation date)
  const maxSelectableDate = job.tracking?.createdAt ? new Date(job.tracking.createdAt) : new Date();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="2xl" className="overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Analytics for {job.title}</DialogTitle>
          <DialogDescription>
            View detailed analytics and insights for this specific job position
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 border-b">
            <div className="flex flex-wrap gap-2 items-center">
              {!showDatePicker ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDatePicker(true)}
                  className="flex items-center gap-2"
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span>
                    {dateRange && dateRange.length === 2 ? 
                      `${toDate(dateRange[0])?.toLocaleDateString()} - ${toDate(dateRange[1])?.toLocaleDateString()}` : 
                      "Select date range"
                    }
                  </span>
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <DatePicker
                    value={dateRange}
                    onChange={(newRange) => {
                      setDateRange(newRange);
                      setShowDatePicker(false);
                    }}
                    range={true}
                    showTimePicker={false}
                    format="MM/DD/YYYY"
                    placeholder="Select date range"
                    className="w-[240px]"
                    minDate={maxSelectableDate} // Job creation date (earliest date)
                    maxDate={new Date()} // Today (latest date)
                    autoFocus={true}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDatePicker(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCcwIcon className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport}
                disabled={funnelLoading || interviewLoading || trendsLoading}
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Analytics Tabs */}
          <div className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="funnel" className="flex items-center gap-2">
                  <GitBranchIcon className="h-4 w-4" />
                  Candidate Funnel
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

              <TabsContent value="funnel" className="space-y-4">
                <CandidateFunnelChart filters={filters} organizationId={organizationId} />
              </TabsContent>

              <TabsContent value="interviews" className="space-y-4">
                <InterviewAssignmentChart filters={filters} organizationId={organizationId} />
              </TabsContent>

              <TabsContent value="trends" className="space-y-4">
                <ApplicationTrendsChart filters={filters} organizationId={organizationId} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};