import React from 'react';
import { BriefcaseIcon, TrendingUpIcon, TrendingDownIcon } from 'lucide-react';
import { JobPerformanceSummary } from '../../hooks/useAnalytics';

interface SummaryProps {
  summary: JobPerformanceSummary;
}

const SummaryCards = React.memo(({ summary }: SummaryProps) => (
  <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
    {/* Total Jobs */}
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
      <div className="flex items-center gap-2">
        <BriefcaseIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {summary.totalJobs}
        </div>
      </div>
      <div className="text-sm text-blue-600 dark:text-blue-400">Total Jobs</div>
    </div>

    {/* Total Applications */}
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
        {summary.totalApplications}
      </div>
      <div className="text-sm text-green-600 dark:text-green-400">
        Total Applications
      </div>
    </div>

    {/* Success Rate */}
    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/20">
      <div className="flex items-center gap-2">
        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
          {summary.overallSuccessRate}%
        </div>
        {summary.overallSuccessRate > 15 ? (
          <TrendingUpIcon className="h-4 w-4 text-green-500" />
        ) : (
          <TrendingDownIcon className="h-4 w-4 text-red-500" />
        )}
      </div>
      <div className="text-sm text-purple-600 dark:text-purple-400">
        Success Rate
      </div>
    </div>

    {/* Avg Time to Fill */}
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/20">
      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
        {typeof summary.avgTimeToFill === 'number'
          ? summary.avgTimeToFill.toFixed(1)
          : summary.avgTimeToFill}
      </div>
      <div className="text-sm text-orange-600 dark:text-orange-400">
        Avg Days to Fill
      </div>
    </div>
  </div>
));

export default SummaryCards;
