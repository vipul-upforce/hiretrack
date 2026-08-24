import { TrendData } from '@/app/api/analytics/types';
import { Badge } from '@/components/ui/badge';
import { AlertCircleIcon, TrendingUpIcon } from 'lucide-react';
import React from 'react';
import { getTrendIcon } from './summary-cards';

export interface TrendsInsights {
  peakPeriods: TrendData[];
  lowPeriods: TrendData[];
  trendDirection: 'up' | 'down' | 'stable';
  volatility: string;
  growthTrend: number;
}

interface InsightsCardsProps {
  insights: TrendsInsights;
}

function InsightsCards({ insights }: InsightsCardsProps) {
  const peakPeriods = insights.peakPeriods || [];
  const lowPeriods = insights.lowPeriods || [];

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-3">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
        <h4 className="mb-2 flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
          <TrendingUpIcon className="h-4 w-4" />
          Peak Periods
        </h4>
        <div className="space-y-1">
          {peakPeriods.slice(0, 3).map((period: TrendData) => (
            <div key={`peak-${period.fullDate}`} className="text-sm">
              <span className="font-medium text-foreground">{period.date}</span>
              <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                ({period.applications} apps)
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
        <h4 className="mb-2 flex items-center gap-2 font-semibold text-red-800 dark:text-red-300">
          <AlertCircleIcon className="h-4 w-4" />
          Low Activity
        </h4>
        <div className="space-y-1">
          {lowPeriods.slice(0, 3).map((period: TrendData) => (
            <div key={`low-${period.fullDate}`} className="text-sm">
              <span className="font-medium text-foreground">{period.date}</span>
              <span className="ml-2 text-red-600 dark:text-red-400">
                ({period.applications} apps)
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
        <h4 className="mb-2 font-semibold text-blue-800 dark:text-blue-300">
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
              variant={insights.growthTrend >= 0 ? 'default' : 'destructive'}
            >
              {insights.growthTrend >= 0 ? '+' : ''}
              {insights.growthTrend}%
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InsightsCards;
