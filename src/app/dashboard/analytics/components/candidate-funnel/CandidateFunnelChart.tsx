'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcwIcon } from 'lucide-react';
import { useCandidateFunnel, AnalyticsFilters } from '../../hooks/useAnalytics';
import CandidateFunnelSkeleton from '../loading-skeletons/candidate-funnel';
import { SummaryCards } from './summary-cards';
import { FunnelTabs } from './funnel-tabs';
import ExportButton from './export-button';
import EmptyState from '../empty-state';

interface CandidateFunnelChartProps {
  filters?: AnalyticsFilters;
  organizationId?: string;
}

export interface FunnelData {
  stage: string;
  count: number;
  conversionRate: number;
  avgTimeInDays: number;
  previousStageCount: number;
  color: string;
}

export interface FunnelSummary {
  totalCandidates: number;
  acceptedCandidates: number;
  rejectedCandidates: number;
  overallConversionRate: number;
  avgTimeToHire: number;
}

export function CandidateFunnelChart({
  filters,
  organizationId,
}: CandidateFunnelChartProps) {
  const { data, loading, error, refetch } = useCandidateFunnel(
    filters,
    organizationId,
  );
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [summary, setSummary] = useState<FunnelSummary | null>(null);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    if (data) {
      setFunnelData(data.funnelData || []);
      setSummary(data.summary || null);
      setDataReady(true);
    }
  }, [data]);

  const handleRefresh = () => {
    refetch();
  };

  if (loading) {
    return <CandidateFunnelSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Candidate Funnel</CardTitle>
          <CardDescription>
            Visualize candidate flow through hiring stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-red-500">
            <div className="text-center">
              <p>Error loading funnel data</p>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleRefresh}
              >
                <RefreshCcwIcon className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if ((!data || funnelData.length === 0) && dataReady) {
    return (
      <EmptyState
        title="Candidate Funnel Analytics"
        description="Visualize candidate flow through hiring stages"
        message="No Data available."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Candidate Funnel Analysis</CardTitle>
            <CardDescription>
              Track candidate progression through hiring stages
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCcwIcon className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <ExportButton funnelData={funnelData} summary={summary} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        {summary && <SummaryCards summary={summary} />}

        {/* Charts */}
        <FunnelTabs funnelData={funnelData} />
      </CardContent>
    </Card>
  );
}
