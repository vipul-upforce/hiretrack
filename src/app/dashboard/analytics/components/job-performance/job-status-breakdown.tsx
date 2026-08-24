import React from 'react';
import { BriefcaseIcon, TrendingUpIcon } from 'lucide-react';
import { JobPerformanceSummary } from '../../hooks/useAnalytics';

interface JobStatusBreakdownProps {
  summary: JobPerformanceSummary;
}

function JobStatusBreakdown({ summary }: JobStatusBreakdownProps) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Job Status Distribution */}
      <div className="rounded-lg border bg-muted/50 p-4 dark:bg-muted/20">
        <h4 className="mb-4 flex items-center gap-2 font-semibold">
          <BriefcaseIcon className="h-4 w-4" />
          Job Status Distribution
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              Open Jobs
            </span>
            <span className="font-bold">{summary.openJobs || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              Closed Jobs
            </span>
            <span className="font-bold">{summary.closedJobs || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              Draft Jobs
            </span>
            <span className="font-bold">{summary.draftJobs || 0}</span>
          </div>
        </div>
      </div>

      {/* Open Jobs Publication Status */}
      <div className="rounded-lg border bg-muted/50 p-4 dark:bg-muted/20">
        <h4 className="mb-4 flex items-center gap-2 font-semibold">
          <TrendingUpIcon className="h-4 w-4" />
          Open Jobs Publication
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              Published
            </span>
            <span className="font-bold">{summary.publishedJobs || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-orange-500" />
              Unpublished
            </span>
            <span className="font-bold">{summary.unpublishedJobs || 0}</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Only open jobs are considered for publication status
          </div>
        </div>
      </div>
    </div>
  );
}

export default JobStatusBreakdown;
