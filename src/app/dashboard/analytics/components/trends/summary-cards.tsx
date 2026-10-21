import {
  ActivityIcon,
  BarChartIcon,
  CalendarIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from 'lucide-react';
import React from 'react';
import { TrendsSummary } from '../types';
import { TrendsInsights } from './insights-cards';

interface SummaryCardsProps {
  summary: TrendsSummary;
  insights: TrendsInsights | null;
  granularity: 'daily' | 'weekly' | 'monthly';
}

const getGranularityLabel = (value: string) => {
  switch (value) {
    case 'daily':
      return 'day';
    case 'weekly':
      return 'week';
    case 'monthly':
      return 'month';
    default:
      return value;
  }
};

export const getTrendIcon = (direction: string) => {
  switch (direction) {
    case 'increasing':
    case 'up':
      return <TrendingUpIcon className="h-4 w-4 text-green-500" />;
    case 'decreasing':
    case 'down':
      return <TrendingDownIcon className="h-4 w-4 text-red-500" />;
    default:
      return <ActivityIcon className="h-4 w-4 text-gray-500" />;
  }
};

function SummaryCards({ summary, insights, granularity }: SummaryCardsProps) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
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
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
          {summary.avgApplicationsPerPeriod}
        </div>
        <div className="text-sm text-green-600 dark:text-green-400">
          Avg per {getGranularityLabel(granularity)}
        </div>
      </div>
      <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/20">
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
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/20">
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
}

export default SummaryCards;
