import { JobPerformanceData } from "@/app/api/analytics/types";
import React from "react";

interface InsightsProps {
  insights: {
    topPerformingJobs: JobPerformanceData[];
    underperformingJobs: JobPerformanceData[];
  };
}

const InsightsCards = ({ insights }: InsightsProps) => {
  return (
    <div className="grid md:grid-cols-2 gap-4 mb-6">
      {insights.topPerformingJobs.length > 0 ? (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
            🏆 Top Performing Jobs
          </h4>
          <div className="space-y-1">
            {insights.topPerformingJobs
              .slice(0, 3)
              .map((job: JobPerformanceData, index: number) => (
                <div key={job.jobId} className="text-sm">
                  <span className="font-medium text-foreground">
                    {index + 1}. {job.title}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 ml-2">
                    ({job.successRate}% success)
                  </span>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
            🏆 Top Performing Jobs
          </h4>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground italic">
              No standout performers yet — keep monitoring!
            </p>
          </div>
        </div>
      )}
      {insights.underperformingJobs.length > 0 ? (
        <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">
            ⚠️ Needs Attention
          </h4>
          <div className="space-y-1">
            {insights.underperformingJobs
              .slice(0, 3)
              .map((job: JobPerformanceData, index: number) => (
                <div key={job.jobId} className="text-sm">
                  <span className="font-medium text-foreground">
                    {index + 1}. {job.title}
                  </span>
                  <span className="text-red-600 dark:text-red-400 ml-2">
                    ({job.applications} apps in {job.jobDuration} days)
                  </span>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">
            ⚠️ Needs Attention
          </h4>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground italic">
              🎉 All jobs are performing well!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsCards;
