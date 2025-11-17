import { UserCheckIcon } from "lucide-react";
import React from "react";

interface SummaryCardProps {
  summary: {
    totalInterviewers: number;
    totalAssignments: number;
    overallCompletionRate: number;
  };
}

export const SummaryCards = ({ summary }: SummaryCardProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-6">
      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2">
          <UserCheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {summary.totalInterviewers}
          </div>
        </div>
        <div className="text-sm text-blue-600 dark:text-blue-400">
          Active Interviewers
        </div>
      </div>
      <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
          {summary.totalAssignments}
        </div>
        <div className="text-sm text-green-600 dark:text-green-400">
          Total Assignments
        </div>
      </div>
    </div>
  );
};
