import { TrendData } from "@/app/api/analytics/types";
import { Badge } from "@/components/ui/badge";
import { AlertCircleIcon, TrendingUpIcon } from "lucide-react";
import React from "react";
import { getTrendIcon } from "./summary-cards";

const InsightsCards = ({ insights }) => {
  return (
    <div className="grid md:grid-cols-3 gap-4 mb-6">
      <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-2">
          <TrendingUpIcon className="h-4 w-4" />
          Peak Periods
        </h4>
        <div className="space-y-1">
          {insights.peakPeriods
            .slice(0, 3)
            .map((period: TrendData, index: number) => (
              <div key={index} className="text-sm">
                <span className="font-medium text-foreground">
                  {period.date}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 ml-2">
                  ({period.applications} apps)
                </span>
              </div>
            ))}
        </div>
      </div>

      <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
        <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
          <AlertCircleIcon className="h-4 w-4" />
          Low Activity
        </h4>
        <div className="space-y-1">
          {insights.lowPeriods
            .slice(0, 3)
            .map((period: TrendData, index: number) => (
              <div key={index} className="text-sm">
                <span className="font-medium text-foreground">
                  {period.date}
                </span>
                <span className="text-red-600 dark:text-red-400 ml-2">
                  ({period.applications} apps)
                </span>
              </div>
            ))}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
          📊 Trend Analysis
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Direction:</span>
            <Badge variant="outline" className="flex items-center gap-1">
              {getTrendIcon(insights.trendDirection)}
              {insights.trendDirection}
            </Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span>Volatility:</span>
            <Badge variant="secondary">{insights.volatility}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span>Growth:</span>
            <Badge
              variant={insights.growthTrend >= 0 ? "default" : "destructive"}
            >
              {insights.growthTrend >= 0 ? "+" : ""}
              {insights.growthTrend}%
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsCards;
