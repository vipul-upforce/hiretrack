"use client";

import React, { useState, useEffect } from "react";
import {
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  RefreshCcwIcon,
  DownloadIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from "lucide-react";
import { useCandidateFunnel } from "../hooks/useAnalytics";
import { AnalyticsFilters } from "../hooks/useAnalytics";
import { exportToCSV } from "../utils/export";
import CandidateFunnelSkeleton from "./loading-skeletons/candidate-funnel";

interface CandidateFunnelChartProps {
  filters?: AnalyticsFilters;
  organizationId?: string;
}

interface FunnelData {
  stage: string;
  count: number;
  conversionRate: number;
  avgTimeInDays: number;
  previousStageCount: number;
  color: string;
}

interface FunnelSummary {
  totalCandidates: number;
  acceptedCandidates: number;
  rejectedCandidates: number;
  overallConversionRate: number;
  avgTimeToHire: number;
}

// Custom Funnel Chart Component using Bar Chart for better visualization
const CustomFunnelChart: React.FC<{ data: FunnelData[] }> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="stage" />
        <YAxis />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload[0]) {
              const data = payload[0].payload as FunnelData;
              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-foreground">{label}</p>
                  <p className="text-foreground">
                    Count: <span className="font-bold">{data.count}</span>
                  </p>
                  <p className="text-foreground">
                    Conversion Rate:{" "}
                    <span className="font-bold">{data.conversionRate}%</span>
                  </p>
                  <p className="text-foreground">
                    Avg Time:{" "}
                    <span className="font-bold">{data.avgTimeInDays} days</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} opacity={0.8}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// Time in Stage Chart
const TimeInStageChart: React.FC<{ data: FunnelData[] }> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="stage" />
        <YAxis />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload[0]) {
              const value = payload[0].value as number;
              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-foreground">
                    Stage: {label}
                  </p>
                  <p className="text-foreground">
                    Average Time:{" "}
                    <span className="font-bold">{value} days</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar
          dataKey="avgTimeInDays"
          fill="#10B981"
          radius={[4, 4, 0, 0]}
          opacity={0.8}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Stage Distribution Pie Chart
const StageDistributionChart: React.FC<{ data: FunnelData[] }> = ({ data }) => {
  const pieData = data.filter((item) => item.count > 0);

  // Calculate total count from original data (including stages with 0 count)
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  // Custom label component for better dark mode support
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    stage,
    count,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="hsl(var(--foreground))"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="500"
      >
        {`${stage}: ${count} (${(percent * 100).toFixed(1)}%)`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={pieData as { stage: string; count: number; color: string }[]}
          cx="50%"
          cy="50%"
          outerRadius={100}
          dataKey="count"
          nameKey="stage"
          label={renderCustomLabel}
          labelLine={false}
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload[0]) {
              const data = payload[0].payload;
              const count = payload[0].value as number;
              const percentage =
                totalCount > 0
                  ? ((count / totalCount) * 100).toFixed(1)
                  : "0.0";

              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-foreground">{data.stage}</p>
                  <p className="text-foreground">
                    Count: <span className="font-bold">{count}</span>
                  </p>
                  <p className="text-foreground">
                    Percentage: <span className="font-bold">{percentage}%</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export const CandidateFunnelChart: React.FC<CandidateFunnelChartProps> = ({
  filters,
  organizationId,
}) => {
  const { data, loading, error, refetch } = useCandidateFunnel(
    filters,
    organizationId
  );
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [summary, setSummary] = useState<FunnelSummary | null>(null);

  useEffect(() => {
    if (data) {
      setFunnelData(data.funnelData || []);
      setSummary(data.summary || null);
    }
  }, [data]);

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = () => {
    if (!funnelData || funnelData.length === 0) {
      console.warn("No funnel data to export");
      return;
    }

    const csvData = funnelData.map((item) => ({
      Stage: item.stage,
      Count: item.count,
      "Conversion Rate (%)": item.conversionRate.toFixed(2),
      "Average Time (Days)": item.avgTimeInDays.toFixed(1),
      "Previous Stage Count": item.previousStageCount,
    }));

    // Add summary data as additional rows
    if (summary) {
      csvData.push(
        {
          Stage: "",
          Count: 0,
          "Conversion Rate (%)": "",
          "Average Time (Days)": "",
          "Previous Stage Count": 0,
        },
        {
          Stage: "SUMMARY",
          Count: 0,
          "Conversion Rate (%)": "",
          "Average Time (Days)": "",
          "Previous Stage Count": 0,
        },
        {
          Stage: "Total Candidates",
          Count: summary.totalCandidates,
          "Conversion Rate (%)": "",
          "Average Time (Days)": "",
          "Previous Stage Count": 0,
        },
        {
          Stage: "Accepted Candidates",
          Count: summary.acceptedCandidates,
          "Conversion Rate (%)": "",
          "Average Time (Days)": "",
          "Previous Stage Count": 0,
        },
        {
          Stage: "Rejected Candidates",
          Count: summary.rejectedCandidates,
          "Conversion Rate (%)": "",
          "Average Time (Days)": "",
          "Previous Stage Count": 0,
        },
        {
          Stage: "Overall Conversion Rate",
          Count: 0,
          "Conversion Rate (%)": `${summary.overallConversionRate}%`,
          "Average Time (Days)": "",
          "Previous Stage Count": 0,
        },
        {
          Stage: "Average Time to Hire",
          Count: 0,
          "Conversion Rate (%)": "",
          "Average Time (Days)": `${summary.avgTimeToHire} days`,
          "Previous Stage Count": 0,
        }
      );
    }

    exportToCSV(csvData, "candidate_funnel_analysis");
  };

  if (loading) {
     return <CandidateFunnelSkeleton/>
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
          <div className="h-64 flex items-center justify-center text-red-500">
            <div className="text-center">
              <p>Error loading funnel data</p>
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
              <RefreshCcwIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <DownloadIcon className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {summary.totalCandidates}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                Total Applications
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {summary.acceptedCandidates}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">
                Accepted
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {summary.rejectedCandidates}
              </div>
              <div className="text-sm text-red-600 dark:text-red-400">
                Rejected
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {summary.overallConversionRate}%
                </div>
                {summary.overallConversionRate > 10 ? (
                  <TrendingUpIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDownIcon className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">
                Success Rate
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <Tabs defaultValue="funnel" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="funnel">Funnel View</TabsTrigger>
            <TabsTrigger value="time">Time Analysis</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="funnel" className="mt-4">
            <div className="h-[500px]">
              <h3 className="text-lg font-semibold mb-4">
                Candidate Count by Stage
              </h3>
              <CustomFunnelChart data={funnelData} />
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

          <TabsContent value="distribution" className="mt-4">
            <div className="h-[500px]">
              <h3 className="text-lg font-semibold mb-4">
                Current Stage Distribution
              </h3>
              <StageDistributionChart data={funnelData} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
