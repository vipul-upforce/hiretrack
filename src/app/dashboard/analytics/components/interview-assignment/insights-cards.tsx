import { AssignmentData } from "@/app/api/analytics/types";
import { Badge } from "@/components/ui/badge";
import { AlertTriangleIcon } from "lucide-react";
import React from "react";

const InsightsCards = ({ insights }) => {
  return (
    <div className="grid md:grid-cols-2 gap-4 mb-6">
      <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
        <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
          <AlertTriangleIcon className="h-4 w-4" />
          Overloaded
        </h4>
        <div className="space-y-1">
          {insights.overloadedInterviewers.length > 0 ? (
            insights.overloadedInterviewers
              .slice(0, 3)
              .map((interviewer: AssignmentData, index: number) => (
                <div key={interviewer.interviewerId} className="text-sm">
                  <span className="font-medium text-foreground">
                    {index + 1}. {interviewer.interviewerName.split(" ")[0]}
                  </span>
                  <span className="text-red-600 dark:text-red-400 ml-2">
                    ({interviewer.assignments} assignments)
                  </span>
                </div>
              ))
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No one looks overloaded — good workload balance!
            </p>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
          ⚖️ Workload Balance
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Balanced:</span>
            <Badge variant="outline">{insights.workloadBalance.balanced}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span>Overloaded:</span>
            <Badge variant="destructive">
              {insights.workloadBalance.overloaded}
            </Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span>Underutilized:</span>
            <Badge variant="secondary">
              {insights.workloadBalance.underutilized}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsCards;
