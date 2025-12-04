'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcwIcon } from 'lucide-react';
import { useApplicationTrends, AnalyticsFilters } from '../../hooks/useAnalytics';
import { exportToCSV } from '../../utils/export';
import ApplicationTrendsSkeleton from '../loading-skeletons/application-trends';
import SummaryCards from './summary-cards';
import InsightsCards from './insights-cards';
import EmptyState from '../empty-state';
import ApplicationTrendsTabs from './application-trends-tabs';
import ApplicationTrendsHeader from './application-header';

interface ApplicationTrendsChartProps {
  filters?: AnalyticsFilters;
  organizationId?: string;
}

export interface TrendData {
  date: string;
  fullDate: Date;
  applications: number;
  appliedCount: number;
  screeningCount: number;
  shortlistedCount: number;
  processingCount: number;
  acceptedCount: number;
  rejectedCount: number;
  trend: 'up' | 'down' | 'stable';
  growthRate: number;
  jobDiversity: number;
  periodType: 'daily' | 'weekly' | 'monthly';
  conversionRate: number;
  rejectionRate: number;
  movingAverage?: number;
}

export const ApplicationTrendsChart: React.FC<ApplicationTrendsChartProps> = ({
  filters,
  organizationId,
}) => {
  const [granularity, setGranularity] = useState<
    'daily' | 'weekly' | 'monthly'
  >('daily');
  const [showMovingAverage, setShowMovingAverage] = useState(true);

  // Memoize filters to prevent infinite re-renders
  const enhancedFilters = useMemo(
    () => ({
      ...filters,
      granularity,
    }),
    [filters, granularity],
  );

  const {
    data, loading, error, refetch,
  } = useApplicationTrends(
    enhancedFilters,
    organizationId,
  );
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [dataReady, setDataReady] = useState(false);
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    if (data) {
      setTrendData(data.trendData || []);
      setSummary(data.summary || null);
      setInsights(data.insights || null);
      setDataReady(true);
    }
  }, [data]);

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = () => {
    if (!trendData || trendData.length === 0) {
      console.warn('No application trends data to export');
      return;
    }

    const csvData = trendData.map((trend) => ({
      Date: trend.date,
      'Period Type': trend.periodType,
      Applications: trend.applications,
      Applied: trend.appliedCount,
      Screening: trend.screeningCount,
      Shortlisted: trend.shortlistedCount,
      Processing: trend.processingCount,
      Accepted: trend.acceptedCount,
      Rejected: trend.rejectedCount,
      'Growth Rate (%)': trend.growthRate.toFixed(2),
      'Conversion Rate (%)': trend.conversionRate.toFixed(2),
      'Rejection Rate (%)': trend.rejectionRate.toFixed(2),
      'Job Diversity': trend.jobDiversity,
      Trend: trend.trend,
      'Moving Average': trend.movingAverage || 'N/A',
    }));

    // Add summary data as additional rows
    if (summary) {
      csvData.push(
        {
          Date: 'daily',
          'Period Type': 'daily',
          Applications: 0,
          Applied: 0,
          Screening: 0,
          Shortlisted: 0,
          Processing: 0,
          Accepted: 0,
          Rejected: 0,
          'Growth Rate (%)': '',
          'Conversion Rate (%)': '',
          'Rejection Rate (%)': '',
          'Job Diversity': 0,
          Trend: 'up',
          'Moving Average': '',
        },
        {
          Date: 'SUMMARY',
          'Period Type': 'daily',
          Applications: 0,
          Applied: 0,
          Screening: 0,
          Shortlisted: 0,
          Processing: 0,
          Accepted: 0,
          Rejected: 0,
          'Growth Rate (%)': '',
          'Conversion Rate (%)': '',
          'Rejection Rate (%)': '',
          'Job Diversity': 0,
          Trend: 'up',
          'Moving Average': '',
        },
        {
          Date: 'Total Applications',
          'Period Type': 'daily',
          Applications: summary.totalApplications,
          Applied: 0,
          Screening: 0,
          Shortlisted: 0,
          Processing: 0,
          Accepted: 0,
          Rejected: 0,
          'Growth Rate (%)': '',
          'Conversion Rate (%)': '',
          'Rejection Rate (%)': '',
          'Job Diversity': 0,
          Trend: 'up',
          'Moving Average': '',
        },
        {
          Date: 'Total Accepted',
          'Period Type': 'daily',
          Applications: 0,
          Applied: 0,
          Screening: 0,
          Shortlisted: 0,
          Processing: 0,
          Accepted: summary.totalAccepted,
          Rejected: 0,
          'Growth Rate (%)': '',
          'Conversion Rate (%)': '',
          'Rejection Rate (%)': '',
          'Job Diversity': 0,
          Trend: 'up',
          'Moving Average': '',
        },
        {
          Date: 'Total Rejected',
          'Period Type': 'daily',
          Applications: 0,
          Applied: 0,
          Screening: 0,
          Shortlisted: 0,
          Processing: 0,
          Accepted: 0,
          Rejected: summary.totalRejected,
          'Growth Rate (%)': '',
          'Conversion Rate (%)': '',
          'Rejection Rate (%)': '',
          'Job Diversity': 0,
          Trend: 'down',
          'Moving Average': '',
        },
        {
          Date: 'Average per Period',
          'Period Type': 'daily',
          Applications: summary.avgApplicationsPerPeriod,
          Applied: 0,
          Screening: 0,
          Shortlisted: 0,
          Processing: 0,
          Accepted: 0,
          Rejected: 0,
          'Growth Rate (%)': '',
          'Conversion Rate (%)': '',
          'Rejection Rate (%)': '',
          'Job Diversity': 0,
          Trend: 'up',
          'Moving Average': '',
        },
        {
          Date: 'Overall Conversion Rate',
          'Period Type': 'daily',
          Applications: 0,
          Applied: 0,
          Screening: 0,
          Shortlisted: 0,
          Processing: 0,
          Accepted: 0,
          Rejected: 0,
          'Growth Rate (%)': '',
          'Conversion Rate (%)': `${summary.overallConversionRate}%`,
          'Rejection Rate (%)': '',
          'Job Diversity': 0,
          Trend: 'up',
          'Moving Average': '',
        },
      );
    }

    exportToCSV(csvData, `application_trends_${granularity}_analysis`);
  };

  if (loading) {
    return <ApplicationTrendsSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Application Trends Analytics</CardTitle>
          <CardDescription>
            Monitor application patterns over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-red-500">
            <div className="text-center">
              <p>Error loading application trends data</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleRefresh}
              >
                <RefreshCcwIcon className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if ((trendData.length === 0 || !data) && dataReady) {
    return (
      <EmptyState
        title="No Application Trends Data"
        message="Insufficient data for Application trends"
        description="There is no application trends data available for the selected filters. Please adjust your filters and try again."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <ApplicationTrendsHeader
          granularity={granularity}
          setGranularity={setGranularity}
          handleRefresh={handleRefresh}
          handleExport={handleExport}
        />
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        {summary && (
          <SummaryCards
            summary={summary}
            insights={insights}
            granularity={granularity}
          />
        )}

        {/* Insights Cards */}
        {insights && <InsightsCards insights={insights} />}

        {/* Charts */}
        <ApplicationTrendsTabs
          trendData={trendData}
          showMovingAverage={showMovingAverage}
          setShowMovingAverage={setShowMovingAverage}
        />
      </CardContent>
    </Card>
  );
};
