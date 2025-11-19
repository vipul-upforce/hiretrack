import {
  ActivityIcon,
  BarChartIcon,
  CalendarIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import React from "react";

const getGranularityLabel = (value: string) => {
  switch (value) {
    case "daily":
      return "day";
    case "weekly":
      return "week";
    case "monthly":
      return "month";
    default:
      return value;
  }
};

export const getTrendIcon = (direction: string) => {
  switch (direction) {
    case "increasing":
      return <TrendingUpIcon className="h-4 w-4 text-green-500" />;
    case "decreasing":
      return <TrendingDownIcon className="h-4 w-4 text-red-500" />;
    default:
      return <ActivityIcon className="h-4 w-4 text-gray-500" />;
  }
};

const SummaryCards = ({ summary, insights, granularity }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {summary.totalApplications}
          </div>
        </div>
        <div className="text-sm text-blue-600 dark:text-blue-400">
          Total Applications
        </div>
      </div>
      <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
          {summary.avgApplicationsPerPeriod}
        </div>
        <div className="text-sm text-green-600 dark:text-green-400">
          Avg per {getGranularityLabel(granularity)}
        </div>
      </div>
      <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {summary.overallConversionRate}%
          </div>
          {insights && getTrendIcon(insights.trendDirection)}
        </div>
        <div className="text-sm text-purple-600 dark:text-purple-400">
          Conversion Rate
        </div>
      </div>
      <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
        <div className="flex items-center gap-2">
          <BarChartIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {insights?.growthTrend || 0}%
          </div>
        </div>
        <div className="text-sm text-orange-600 dark:text-orange-400">
          Overall Growth
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;
