'use client';

import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';
import { CustomFunnelChart } from './funnel-chart';
import { StageDistributionChart } from './distribution-pie-chart';
import { TimeInStageChart } from './time-in-stage-chart';
import { FunnelData } from './CandidateFunnelChart';

export function FunnelTabs({ funnelData }: { funnelData: FunnelData[] }) {
  return (
    <Tabs defaultValue="funnel" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="funnel">Candidate By Stage</TabsTrigger>
        <TabsTrigger value="distribution">Distribution</TabsTrigger>
        <TabsTrigger value="time">Time Analysis</TabsTrigger>
      </TabsList>

      <TabsContent value="funnel" className="mt-4">
        <div className="h-[500px]">
          <h3 className="text-lg font-semibold mb-4">
            Candidate Count by Their Current Stage
          </h3>
          <CustomFunnelChart data={funnelData} />
        </div>
      </TabsContent>

      <TabsContent value="distribution" className="mt-4">
        <div className="h-[500px]">
          <h3 className="text-lg font-semibold mb-4">
            Current Stage Distribution
          </h3>
          <StageDistributionChart data={funnelData} />
        </div>
      </TabsContent>

      <TabsContent value="time" className="mt-4">
        <div className="h-[500px]">
          <h3 className="text-lg font-semibold mb-4">
            Average Time Spent in Each Stage
          </h3>
          <TimeInStageChart data={funnelData} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
