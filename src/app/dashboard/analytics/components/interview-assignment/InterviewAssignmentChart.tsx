'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcwIcon, DownloadIcon } from 'lucide-react';
import { useInterviewAssignments, AnalyticsFilters } from '../../hooks/useAnalytics';
import { exportToCSV } from '../../utils/export';
import InterviewAssignmentSkeleton from '../loading-skeletons/interview-assignment';
import { WorkloadDistributionChart } from './workload-assignment-chart';
import { SummaryCards } from './summary-cards';
import InsightsCards from './insights-cards';
import EmptyState from '../empty-state';

interface InterviewAssignmentChartProps {
  filters?: AnalyticsFilters;
  organizationId?: string;
}

interface AssignmentData {
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

export const InterviewAssignmentChart: React.FC<
  InterviewAssignmentChartProps
> = ({ filters, organizationId }) => {
  const {
    data, loading, error, refetch,
  } = useInterviewAssignments(
    filters,
    organizationId,
  );
  const [assignmentData, setAssignmentData] = useState<AssignmentData[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    if (data) {
      setAssignmentData(data.assignmentData || []);
      setSummary(data.summary || null);
      setInsights(data.insights || null);
    }
  }, [data]);

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = () => {
    if (!assignmentData || assignmentData.length === 0) {
      console.warn('No interview assignment data to export');
      return;
    }

    const csvData = assignmentData.map((interviewer) => ({
      Interviewer: interviewer.interviewerName,
      Email: interviewer.interviewerEmail,
      Role: interviewer.role,
      'Total Assignments': interviewer.assignments,
      Completed: interviewer.completions,
      Pending: interviewer.pending,
      Accepted: interviewer.accepted,
      Rejected: interviewer.rejected,
      'Completion Rate (%)': interviewer.completionRate.toFixed(2),
      'Success Rate (%)': interviewer.successRate.toFixed(2),
      'Average Rating': interviewer.avgRating.toFixed(2),
      'Average Experience Score': interviewer.avgExperienceScore.toFixed(2),
      'Average Skills Score': interviewer.avgSkillsScore.toFixed(2),
      'Average Daily Assignments': interviewer.avgDailyAssignments.toFixed(1),
    }));

    // Add summary data as additional rows
    if (summary) {
      csvData.push(
        {
          Interviewer: '',
          Email: '',
          Role: '',
          'Total Assignments': 0,
          Completed: 0,
          Pending: 0,
          Accepted: 0,
          Rejected: 0,
          'Completion Rate (%)': '',
          'Success Rate (%)': '',
          'Average Rating': '',
          'Average Experience Score': '',
          'Average Skills Score': '',
          'Average Daily Assignments': '',
        },
        {
          Interviewer: 'SUMMARY',
          Email: '',
          Role: '',
          'Total Assignments': 0,
          Completed: 0,
          Pending: 0,
          Accepted: 0,
          Rejected: 0,
          'Completion Rate (%)': '',
          'Success Rate (%)': '',
          'Average Rating': '',
          'Average Experience Score': '',
          'Average Skills Score': '',
          'Average Daily Assignments': '',
        },
        {
          Interviewer: 'Total Interviewers',
          Email: '',
          Role: '',
          'Total Assignments': summary.totalInterviewers,
          Completed: 0,
          Pending: 0,
          Accepted: 0,
          Rejected: 0,
          'Completion Rate (%)': '',
          'Success Rate (%)': '',
          'Average Rating': '',
          'Average Experience Score': '',
          'Average Skills Score': '',
          'Average Daily Assignments': '',
        },
        {
          Interviewer: 'Total Assignments',
          Email: '',
          Role: '',
          'Total Assignments': summary.totalAssignments,
          Completed: 0,
          Pending: 0,
          Accepted: 0,
          Rejected: 0,
          'Completion Rate (%)': '',
          'Success Rate (%)': '',
          'Average Rating': '',
          'Average Experience Score': '',
          'Average Skills Score': '',
          'Average Daily Assignments': '',
        },
        {
          Interviewer: 'Overall Completion Rate',
          Email: '',
          Role: '',
          'Total Assignments': 0,
          Completed: 0,
          Pending: 0,
          Accepted: 0,
          Rejected: 0,
          'Completion Rate (%)': `${summary.overallCompletionRate}%`,
          'Success Rate (%)': '',
          'Average Rating': '',
          'Average Experience Score': '',
          'Average Skills Score': '',
          'Average Daily Assignments': '',
        },
        {
          Interviewer: 'Overall Success Rate',
          Email: '',
          Role: '',
          'Total Assignments': 0,
          Completed: 0,
          Pending: 0,
          Accepted: 0,
          Rejected: 0,
          'Completion Rate (%)': '',
          'Success Rate (%)': `${summary.overallSuccessRate}%`,
          'Average Rating': '',
          'Average Experience Score': '',
          'Average Skills Score': '',
          'Average Daily Assignments': '',
        },
      );
    }

    exportToCSV(csvData, 'interview_assignment_analysis');
  };

  if (loading) {
    return <InterviewAssignmentSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Interview Assignment Analytics</CardTitle>
          <CardDescription>
            Track interviewer workload and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-red-500">
            <div className="text-center">
              <p>Error loading interview assignment data</p>
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

  if (!data || assignmentData.length === 0) {
    return (
      <EmptyState
        title="Interview Assignment"
        description="Monitor interviewer workload and performance metrics"
        message="No Data available."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Interview Assignment Analytics</CardTitle>
            <CardDescription>
              Monitor interviewer workload and performance metrics
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCcwIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <DownloadIcon className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        {summary && <SummaryCards summary={summary} />}

        {/* Insights Cards */}
        {insights && <InsightsCards insights={insights} />}

        <div className="h-[550px]">
          <h3 className="text-lg font-semibold mb-4">
            Interviewer Workload Distribution
          </h3>
          <WorkloadDistributionChart data={assignmentData} />
        </div>
      </CardContent>
    </Card>
  );
};
