import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from "react";
import { ApplicationsTimeScatterChart } from "./application-time-to-fill-chart";
import { TopJobsChart } from "./top-jobs-chart";
import { SuccessRateChart } from "./success-rate-chart";
import { JobStatusChart } from "./job-status-chart";
import { JobPerformanceData } from "../JobPerformanceChart";

interface JobPerformanceTabsProps {
  jobData: JobPerformanceData[];
}

const JobPerformanceTabs = ({ jobData }: JobPerformanceTabsProps) => {
  return (
    <Tabs defaultValue="scatter" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="scatter">Performance Matrix</TabsTrigger>
        <TabsTrigger value="top">Top Jobs</TabsTrigger>
        <TabsTrigger value="success">Success Rates</TabsTrigger>
        <TabsTrigger value="status">Job Status</TabsTrigger>
      </TabsList>

      <TabsContent value="scatter" className="mt-4">
        <div className="h-[550px]">
          <h3 className="text-lg font-semibold mb-4">
            Applications vs Time-to-Fill Analysis
          </h3>
          {jobData?.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No job performance data available.
            </div>
          ) : (
            <ApplicationsTimeScatterChart data={jobData} />
          )}
        </div>
      </TabsContent>

      <TabsContent value="top" className="mt-4">
        <div className="h-[550px]">
          <h3 className="text-lg font-semibold mb-4">
            Top Jobs by Application Volume
          </h3>
          {jobData?.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No job performance data available.
            </div>
          ) : (
            <TopJobsChart data={jobData} />
          )}
        </div>
      </TabsContent>

      <TabsContent value="success" className="mt-4">
        <div className="h-[550px]">
          <h3 className="text-lg font-semibold mb-4">
            Job Success Rate Analysis
          </h3>
          {jobData?.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No job performance data available.
            </div>
          ) : (
            <SuccessRateChart data={jobData} />
          )}
        </div>
      </TabsContent>

      <TabsContent value="status" className="mt-4">
        <div className="h-[550px]">
          <h3 className="text-lg font-semibold mb-4">
            Job Status Distribution
          </h3>
          {jobData?.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No job performance data available.
            </div>
          ) : (
            <JobStatusChart data={jobData} />
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default JobPerformanceTabs;
