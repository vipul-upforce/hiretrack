import { UserCheckIcon } from 'lucide-react';
import React from 'react';
import { InterviewSummary } from '../../hooks/useAnalytics';

interface SummaryCardsProps {
  summary: InterviewSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
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
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
          {summary.totalAssignments}
        </div>
        <div className="text-sm text-green-600 dark:text-green-400">
          Total Assignments
        </div>
      </div>
    </div>
  );
}
