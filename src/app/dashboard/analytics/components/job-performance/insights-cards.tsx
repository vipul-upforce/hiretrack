import React from 'react';
import type { JobPerformanceData } from '@/app/api/analytics/types';
import { JobPerformanceInsights } from '../../hooks/useAnalytics';

interface InsightsProps {
  insights: JobPerformanceInsights;
}

function InsightsCards({ insights }: InsightsProps) {
  const topJobs = insights.topPerformingJobs || [];
  const poorJobs = insights.underperformingJobs || [];

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2">
      {topJobs.length > 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
          <h4 className="mb-2 font-semibold text-emerald-800 dark:text-emerald-300">
            🏆 Top Performing Jobs
          </h4>
          <div className="space-y-1">
            {topJobs
              .slice(0, 3)
              .map((job: JobPerformanceData, index: number) => (
                <div key={job.jobId} className="text-sm">
                  <span className="font-medium text-foreground">
                    {index + 1}. {job.title}
                  </span>
                  <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                    ({job.successRate}% success)
                  </span>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
          <h4 className="mb-2 font-semibold text-emerald-800 dark:text-emerald-300">
            🏆 Top Performing Jobs
          </h4>
          <div className="space-y-1">
            <p className="text-sm italic text-muted-foreground">
              No standout performers yet — keep monitoring!
            </p>
          </div>
        </div>
      )}

      {poorJobs.length > 0 ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
          <h4 className="mb-2 font-semibold text-red-800 dark:text-red-300">
            ⚠️ Needs Attention
          </h4>
          <div className="space-y-1">
            {poorJobs
              .slice(0, 3)
              .map((job: JobPerformanceData, index: number) => (
                <div key={job.jobId} className="text-sm">
                  <span className="font-medium text-foreground">
                    {index + 1}. {job.title}
                  </span>
                  <span className="ml-2 text-red-600 dark:text-red-400">
                    ({job.applications} apps in {job.jobDuration} days)
                  </span>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
          <h4 className="mb-2 font-semibold text-red-800 dark:text-red-300">
            ⚠️ Needs Attention
          </h4>
          <div className="space-y-1">
            <p className="text-sm italic text-muted-foreground">
              🎉 All jobs are performing well!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default InsightsCards;
