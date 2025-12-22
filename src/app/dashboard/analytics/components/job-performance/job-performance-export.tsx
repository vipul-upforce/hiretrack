'use client';

import React, { useCallback } from 'react';
import logger from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { DownloadIcon } from 'lucide-react';
import { exportToCSV } from '../../utils/export';
import type { JobPerformanceData } from '../types';
import { JobPerformanceSummary } from '../../hooks/useAnalytics';

interface Props {
  jobData: JobPerformanceData[];
  summary: JobPerformanceSummary;
}

function JobPerformanceExport({ jobData, summary }: Props) {
  const handleExport = useCallback(() => {
    if (!jobData || jobData.length === 0) {
      logger.warn('No job performance data to export');
      return;
    }

    const csvData = jobData.map((job) => ({
      'Job Title': job.title,
      Status: job.status,
      Applications: job.applications,
      Accepted: job.accepted,
      Rejected: job.rejected,
      Processing: job.processing,
      'Success Rate (%)': job.successRate.toFixed(2),
      'Time to Fill (Days)': job.timeToFill.toFixed(1),
      'Job Duration (Days)': job.jobDuration,
      'Required Experience': job.requiredExperience,
      'Skills Required': job.skillsRequired,
      'Salary Range': job.salaryRange?.inText || 'Not specified',
      'Created Date': new Date(job.createdAt).toLocaleDateString(),
      'Closed Date': job.closedAt
        ? new Date(job.closedAt).toLocaleDateString()
        : 'Still open',
    }));

    // Add summary data as additional rows
    if (summary) {
      csvData.push(
        {
          'Job Title': '',
          Status: '',
          Applications: 0,
          Accepted: 0,
          Rejected: 0,
          Processing: 0,
          'Success Rate (%)': '',
          'Time to Fill (Days)': '',
          'Job Duration (Days)': 0,
          'Required Experience': 0,
          'Skills Required': 0,
          'Salary Range': '',
          'Created Date': '',
          'Closed Date': '',
        },
        {
          'Job Title': 'SUMMARY',
          Status: '',
          Applications: 0,
          Accepted: 0,
          Rejected: 0,
          Processing: 0,
          'Success Rate (%)': '',
          'Time to Fill (Days)': '',
          'Job Duration (Days)': 0,
          'Required Experience': 0,
          'Skills Required': 0,
          'Salary Range': '',
          'Created Date': '',
          'Closed Date': '',
        },
        {
          'Job Title': 'Total Jobs',
          Status: '',
          Applications: summary.totalJobs,
          Accepted: 0,
          Rejected: 0,
          Processing: 0,
          'Success Rate (%)': '',
          'Time to Fill (Days)': '',
          'Job Duration (Days)': 0,
          'Required Experience': 0,
          'Skills Required': 0,
          'Salary Range': '',
          'Created Date': '',
          'Closed Date': '',
        },
        {
          'Job Title': 'Total Applications',
          Status: '',
          Applications: summary.totalApplications,
          Accepted: 0,
          Rejected: 0,
          Processing: 0,
          'Success Rate (%)': '',
          'Time to Fill (Days)': '',
          'Job Duration (Days)': 0,
          'Required Experience': 0,
          'Skills Required': 0,
          'Salary Range': '',
          'Created Date': '',
          'Closed Date': '',
        },
        {
          'Job Title': 'Open Jobs',
          Status: 'open',
          Applications: summary.openJobs,
          Accepted: 0,
          Rejected: 0,
          Processing: 0,
          'Success Rate (%)': '',
          'Time to Fill (Days)': '',
          'Job Duration (Days)': 0,
          'Required Experience': 0,
          'Skills Required': 0,
          'Salary Range': '',
          'Created Date': '',
          'Closed Date': '',
        },
        {
          'Job Title': 'Closed Jobs',
          Status: 'closed',
          Applications: summary.closedJobs,
          Accepted: 0,
          Rejected: 0,
          Processing: 0,
          'Success Rate (%)': '',
          'Time to Fill (Days)': '',
          'Job Duration (Days)': 0,
          'Required Experience': 0,
          'Skills Required': 0,
          'Salary Range': '',
          'Created Date': '',
          'Closed Date': '',
        },
        {
          'Job Title': 'Published Jobs',
          Status: 'published',
          Applications: summary.publishedJobs,
          Accepted: 0,
          Rejected: 0,
          Processing: 0,
          'Success Rate (%)': '',
          'Time to Fill (Days)': '',
          'Job Duration (Days)': 0,
          'Required Experience': 0,
          'Skills Required': 0,
          'Salary Range': '',
          'Created Date': '',
          'Closed Date': '',
        },
        {
          'Job Title': 'Overall Success Rate',
          Status: '',
          Applications: 0,
          Accepted: 0,
          Rejected: 0,
          Processing: 0,
          'Success Rate (%)': `${summary.overallSuccessRate}%`,
          'Time to Fill (Days)': '',
          'Job Duration (Days)': 0,
          'Required Experience': 0,
          'Skills Required': 0,
          'Salary Range': '',
          'Created Date': '',
          'Closed Date': '',
        },
        {
          'Job Title': 'Average Time to Fill',
          Status: '',
          Applications: 0,
          Accepted: 0,
          Rejected: 0,
          Processing: 0,
          'Success Rate (%)': '',
          'Time to Fill (Days)': `${summary.avgTimeToFill} days`,
          'Job Duration (Days)': 0,
          'Required Experience': 0,
          'Skills Required': 0,
          'Salary Range': '',
          'Created Date': '',
          'Closed Date': '',
        },
      );
    }

    exportToCSV(csvData, 'job_performance_analysis');
  }, [jobData, summary]);

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <DownloadIcon className="mr-2 h-4 w-4" />
      Export
    </Button>
  );
}

export default JobPerformanceExport;
