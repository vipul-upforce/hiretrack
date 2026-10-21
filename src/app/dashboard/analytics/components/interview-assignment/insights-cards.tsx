import { AssignmentData } from '@/app/api/analytics/types';
import { Badge } from '@/components/ui/badge';
import { AlertTriangleIcon } from 'lucide-react';
import React from 'react';

export interface AssignmentInsights {
  overloadedInterviewers: AssignmentData[];
  workloadBalance: {
    balanced: number;
    overloaded: number;
    underutilized: number;
  };
}

interface InsightsCardsProps {
  insights: AssignmentInsights;
}

function InsightsCards({ insights }: InsightsCardsProps) {
  const overloaded = insights.overloadedInterviewers || [];
  const balance = insights.workloadBalance || {
    balanced: 0,
    overloaded: 0,
    underutilized: 0,
  };

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
        <h4 className="mb-2 flex items-center gap-2 font-semibold text-red-800 dark:text-red-300">
          <AlertTriangleIcon className="h-4 w-4" />
          Overloaded
        </h4>
        <div className="space-y-1">
          {overloaded.length > 0 ? (
            overloaded
              .slice(0, 3)
              .map((interviewer: AssignmentData, index: number) => (
                <div key={interviewer.interviewerId} className="text-sm">
                  <span className="font-medium text-foreground">
                    {index + 1}. {interviewer.interviewerName.split(' ')[0]}
                  </span>
                  <span className="ml-2 text-red-600 dark:text-red-400">
                    ({interviewer.assignments} assignments)
                  </span>
                </div>
              ))
          ) : (
            <p className="text-sm italic text-muted-foreground">
              No one looks overloaded — good workload balance!
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950/20">
        <h4 className="mb-2 font-semibold text-yellow-800 dark:text-yellow-300">
          ⚖️ Workload Balance
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Balanced:</span>
            <Badge variant="outline">{balance.balanced}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span>Overloaded:</span>
            <Badge variant="destructive">{balance.overloaded}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span>Underutilized:</span>
            <Badge variant="secondary">{balance.underutilized}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InsightsCards;
