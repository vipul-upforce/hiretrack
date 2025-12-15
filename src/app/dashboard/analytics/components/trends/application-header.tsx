'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCcwIcon, DownloadIcon } from 'lucide-react';

interface ApplicationTrendsHeaderProps {
  granularity: 'daily' | 'weekly' | 'monthly';
  setGranularity: (value: 'daily' | 'weekly' | 'monthly') => void;
  handleRefresh: () => void;
  handleExport: () => void;
}

function ApplicationTrendsHeader({
  granularity,
  setGranularity,
  handleRefresh,
  handleExport,
}: ApplicationTrendsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold">Application Trends Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Track application patterns and growth over time
        </p>
      </div>

      <div className="flex gap-2">
        <Select
          value={granularity}
          onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
            setGranularity(value)
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCcwIcon className="mr-2 h-4 w-4" />
          Refresh
        </Button>

        <Button variant="outline" size="sm" onClick={handleExport}>
          <DownloadIcon className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>
    </div>
  );
}

export default ApplicationTrendsHeader;
