"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendData } from "./ApplicationTrendsChart";
import { ApplicationTrendsLineChart } from "./application-trendline-chart";
import { StatusBreakdownAreaChart } from "./status-breakdown-chart";
import { GrowthRateChart } from "./growth-rate-chart";
import { ConversionRateChart } from "./conversion-rate-chart";

interface ApplicationTrendsTabsProps {
  trendData: TrendData[];
  showMovingAverage: boolean;
  setShowMovingAverage: (value: boolean) => void;
}

const ApplicationTrendsTabs: React.FC<ApplicationTrendsTabsProps> = ({
  trendData,
  showMovingAverage,
  setShowMovingAverage,
}) => {
  return (
    <Tabs defaultValue="trends" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="trends">Trend Line</TabsTrigger>
        <TabsTrigger value="breakdown">Status Breakdown</TabsTrigger>
        <TabsTrigger value="growth">Growth Rate</TabsTrigger>
        <TabsTrigger value="conversion">Conversion</TabsTrigger>
      </TabsList>

      <TabsContent value="trends" className="mt-4">
        <div className="h-[550px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Application Volume Trends</h3>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="movingAverage"
                checked={showMovingAverage}
                onChange={(e) => setShowMovingAverage(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="movingAverage" className="text-sm">
                Show Moving Average
              </label>
            </div>
          </div>
          <ApplicationTrendsLineChart
            data={trendData}
            showMovingAverage={showMovingAverage}
          />
        </div>
      </TabsContent>

      <TabsContent value="breakdown" className="mt-4">
        <div className="h-[550px]">
          <h3 className="text-lg font-semibold mb-4">
            Application Status Breakdown Over Time
          </h3>
          <StatusBreakdownAreaChart data={trendData} />
        </div>
      </TabsContent>

      <TabsContent value="growth" className="mt-4">
        <div className="h-[550px]">
          <h3 className="text-lg font-semibold mb-4">
            Period-over-Period Growth Rate
          </h3>
          <GrowthRateChart data={trendData} />
        </div>
      </TabsContent>

      <TabsContent value="conversion" className="mt-4">
        <div className="h-[550px]">
          <h3 className="text-lg font-semibold mb-4">
            Conversion vs Rejection Rate Trends
          </h3>
          <ConversionRateChart data={trendData} />
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default ApplicationTrendsTabs;
