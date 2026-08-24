'use client';

import type React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronRightIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBgColor: string;
  mainValue: string | number;
  showTrendIcon?: boolean;
  trendIsPositive?: boolean;
  secondaryMetrics: Array<{
    label: string;
    value: string | number;
  }>;
  onDetailsClick: () => void;
  isLoading: boolean;
  detailsButtonLabel?: string;
}

export function MetricCard({
  title,
  description,
  icon,
  iconBgColor,
  mainValue,
  showTrendIcon = false,
  trendIsPositive = true,
  secondaryMetrics,
  onDetailsClick,
  isLoading,
  detailsButtonLabel = 'Show Details',
}: MetricCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </div>
        <div className={`rounded-full ${iconBgColor} p-3`}>{icon}</div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-baseline space-x-2">
          <div className="text-2xl font-bold">
            {isLoading ? (
              <Skeleton className="h-8 w-10 rounded-lg" />
            ) : (
              mainValue
            )}
          </div>
          {!isLoading && showTrendIcon && (
            // eslint-disable-next-line react/jsx-no-useless-fragment
            <>
              {trendIsPositive ? (
                <TrendingUpIcon className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDownIcon className="h-4 w-4 text-red-500" />
              )}
            </>
          )}
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          {secondaryMetrics.map((metric) => (
            <div key={metric.label}>
              {metric.label}:{isLoading ? '-' : metric.value}
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full bg-transparent"
          onClick={onDetailsClick}
        >
          {detailsButtonLabel} <ChevronRightIcon className="ml-1 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
