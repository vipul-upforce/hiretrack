import { BriefcaseIcon, TrendingUpIcon } from 'lucide-react';
import React from 'react';

interface JobStatusBreakdownProps {
  summary: {
    openJobs: number;
    closedJobs: number;
    draftJobs: number;
    publishedJobs: number;
    unpublishedJobs: number;
  };
}

function JobStatusBreakdown({ summary }: JobStatusBreakdownProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Job Status Distribution */}
      <div className="bg-muted/50 dark:bg-muted/20 p-4 rounded-lg border">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <BriefcaseIcon className="h-4 w-4" />
          Job Status Distribution
        </h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              Open Jobs
            </span>
            <span className="font-bold">{summary.openJobs || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              Closed Jobs
            </span>
            <span className="font-bold">{summary.closedJobs || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              Draft Jobs
            </span>
            <span className="font-bold">{summary.draftJobs || 0}</span>
          </div>
        </div>
      </div>

      {/* Open Jobs Publication Status */}
      <div className="bg-muted/50 dark:bg-muted/20 p-4 rounded-lg border">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUpIcon className="h-4 w-4" />
          Open Jobs Publication
        </h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              Published
            </span>
            <span className="font-bold">{summary.publishedJobs || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              Unpublished
            </span>
            <span className="font-bold">{summary.unpublishedJobs || 0}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Only open jobs are considered for publication status
          </div>
        </div>
      </div>
    </div>
  );
}

export default JobStatusBreakdown;
