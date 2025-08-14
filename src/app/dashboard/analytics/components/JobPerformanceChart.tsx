"use client";

import React, { useState, useEffect } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
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
import { Badge } from "@/components/ui/badge";
import {
  RefreshCcwIcon,
  DownloadIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  BriefcaseIcon,
} from "lucide-react";
import { useJobPerformance } from "../hooks/useAnalytics";
import { AnalyticsFilters } from "../hooks/useAnalytics";
import { exportToCSV } from "../utils/export";

interface JobPerformanceChartProps {
  filters?: AnalyticsFilters;
  organizationId?: string;
}

interface JobPerformanceData {
  jobId: string;
  title: string;
  applications: number;
  accepted: number;
  rejected: number;
  processing: number;
  timeToFill: number;
  successRate: number;
  status: string;
  createdAt: Date;
  closedAt?: Date;
  jobDuration: number;
  salaryRange?: {
    min?: number;
    max?: number;
    inText?: string;
  } | null;
  requiredExperience: number;
  skillsRequired: number;
}

// Applications vs Time-to-Fill Scatter Plot
const ApplicationsTimeScatterChart: React.FC<{
  data: JobPerformanceData[];
}> = ({ data }) => {
  const scatterData = data.map((job) => ({
    ...job,
    // Add size based on success rate for better visualization
    size: Math.max(job.successRate * 2, 5),
  }));

  return (
    <ResponsiveContainer width="100%" height={450}>
      <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="applications"
          name="Applications"
          label={{
            value: "Number of Applications",
            position: "insideBottom",
            offset: -10,
          }}
        />
        <YAxis
          dataKey="timeToFill"
          name="Time to Fill (Days)"
          label={{
            value: "Time to Fill (Days)",
            angle: -90,
            position: "insideLeft",
          }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload[0]) {
              const data = payload[0].payload as JobPerformanceData;
              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-foreground">{data.title}</p>
                  <p className="text-foreground">
                    Applications:{" "}
                    <span className="font-bold">{data.applications}</span>
                  </p>
                  <p className="text-foreground">
                    Time to Fill:{" "}
                    <span className="font-bold">{data.timeToFill} days</span>
                  </p>
                  <p className="text-foreground">
                    Success Rate:{" "}
                    <span className="font-bold">{data.successRate}%</span>
                  </p>
                  <p className="text-foreground">
                    Status: <Badge variant="outline">{data.status}</Badge>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Scatter data={scatterData} fill="#8884d8">
          {scatterData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.status === "open" ? "#10B981" : "#6B7280"}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
};

// Top Performing Jobs Bar Chart
const TopJobsChart: React.FC<{ data: JobPerformanceData[] }> = ({ data }) => {
  const topJobs = [...data]
    .filter((job) => job.applications >= 3) // Only jobs with meaningful applications
    .sort((a, b) => b.applications - a.applications)
    .slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={450}>
      <BarChart
        data={topJobs}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="title"
          angle={-45}
          textAnchor="end"
          height={80}
          interval={0}
          fontSize={12}
        />
        <YAxis />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload[0]) {
              const data = payload[0].payload as JobPerformanceData;
              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-foreground">{label}</p>
                  <p className="text-foreground">
                    Applications:{" "}
                    <span className="font-bold">{data.applications}</span>
                  </p>
                  <p className="text-foreground">
                    Accepted:{" "}
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {data.accepted}
                    </span>
                  </p>
                  <p className="text-foreground">
                    Success Rate:{" "}
                    <span className="font-bold">{data.successRate}%</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar
          dataKey="applications"
          fill="#3B82F6"
          radius={[4, 4, 0, 0]}
          opacity={0.8}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Success Rate Analysis Chart
const SuccessRateChart: React.FC<{ data: JobPerformanceData[] }> = ({
  data,
}) => {
  const successData = [...data]
    .filter((job) => job.applications >= 3)
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={450}>
      <BarChart
        data={successData}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="title"
          angle={-45}
          textAnchor="end"
          height={80}
          interval={0}
          fontSize={12}
        />
        <YAxis />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload[0]) {
              const value = payload[0].value as number;
              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-foreground">Job: {label}</p>
                  <p className="text-foreground">
                    Success Rate:{" "}
                    <span
                      className={`font-bold ${value >= 20 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {value}%
                    </span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <ReferenceLine
          y={20}
          stroke="#EF4444"
          strokeDasharray="5 5"
          label="Target: 20%"
        />
        <Bar dataKey="successRate" radius={[4, 4, 0, 0]} opacity={0.8}>
          {successData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.successRate >= 20 ? "#10B981" : "#EF4444"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// Job Status Distribution Pie Chart
const JobStatusChart: React.FC<{ data: JobPerformanceData[] }> = ({ data }) => {
  const statusCounts = data.reduce(
    (acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    fill:
      status === "open"
        ? "#10B981"
        : status === "closed"
          ? "#6B7280"
          : "#F59E0B",
  }));

  // Custom label component for better dark mode support
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    name,
    value,
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
        {`${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={450}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          outerRadius={120}
          dataKey="value"
          nameKey="name"
          label={renderCustomLabel}
          labelLine={false}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload[0]) {
              const data = payload[0].payload;
              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-foreground">{data.name}</p>
                  <p className="text-foreground">
                    Count: <span className="font-bold">{payload[0].value}</span>
                  </p>
                  <p className="text-foreground">
                    Status:{" "}
                    <span className="font-bold capitalize">
                      {data.name.toLowerCase()}
                    </span>
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

export const JobPerformanceChart: React.FC<JobPerformanceChartProps> = ({
  filters,
  organizationId,
}) => {
  const { data, loading, error, refetch } = useJobPerformance(
    filters,
    organizationId
  );
  const [jobData, setJobData] = useState<JobPerformanceData[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    if (data) {
      setJobData(data.jobPerformanceData || []);
      setSummary(data.summary || null);
      setInsights(data.insights || null);
    }
  }, [data]);

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = () => {
    if (!jobData || jobData.length === 0) {
      console.warn("No job performance data to export");
      return;
    }

    const csvData = jobData.map((job) => ({
      "Job Title": job.title,
      Status: job.status,
      Applications: job.applications,
      Accepted: job.accepted,
      Rejected: job.rejected,
      Processing: job.processing,
      "Success Rate (%)": job.successRate.toFixed(2),
      "Time to Fill (Days)": job.timeToFill.toFixed(1),
      "Job Duration (Days)": job.jobDuration,
      "Required Experience": job.requiredExperience,
      "Skills Required": job.skillsRequired,
      "Salary Range": job.salaryRange?.inText || "Not specified",
      "Created Date": new Date(job.createdAt).toLocaleDateString(),
      "Closed Date": job.closedAt
        ? new Date(job.closedAt).toLocaleDateString()
        : "Still open",
    }));

    // Add summary data as additional rows
    if (summary) {
      csvData.push(
        {
          "Job Title": "",
          Status: "",
          Applications: 0,
          Accepted: 0,
          Rejected: 0,
          Processing: 0,
          "Success Rate (%)": "",
          "Time to Fill (Days)": "",
          "Job Duration (Days)": 0,
          "Required Experience": 0,
          "Skills Required": 0,
          "Salary Range": "",
          "Created Date": "",
          "Closed Date": "",
        },
        {
          "Job Title": "SUMMARY",
          Status: "",
          Applications: 0,
          Accepted: 0,
          Rejected: 0,
          Processing: 0,
          "Success Rate (%)": "",
          "Time to Fill (Days)": "",
          "Job Duration (Days)": 0,
          "Required Experience": 0,
          "Skills Required": 0,
          "Salary Range": "",
          "Created Date": "",
          "Closed Date": "",
        },
        {
          "Job Title": "Total Jobs",
          Status: "",
          Applications: summary.totalJobs,
          Accepted: 0,
          Rejected: 0,
          Processing: 0,
          "Success Rate (%)": "",
          "Time to Fill (Days)": "",
          "Job Duration (Days)": 0,
          "Required Experience": 0,
          "Skills Required": 0,
          "Salary Range": "",
          "Created Date": "",
          "Closed Date": "",
        },
        {
          "Job Title": "Total Applications",
          Status: "",
          Applications: summary.totalApplications,
          Accepted: 0,
          Rejected: 0,
          Processing: 0,
          "Success Rate (%)": "",
          "Time to Fill (Days)": "",
          "Job Duration (Days)": 0,
          "Required Experience": 0,
          "Skills Required": 0,
          "Salary Range": "",
          "Created Date": "",
          "Closed Date": "",
        },
        {
          "Job Title": "Open Jobs",
          Status: "open",
          Applications: summary.openJobs,
          Accepted: 0,
          Rejected: 0,
          Processing: 0,
          "Success Rate (%)": "",
          "Time to Fill (Days)": "",
          "Job Duration (Days)": 0,
          "Required Experience": 0,
          "Skills Required": 0,
          "Salary Range": "",
          "Created Date": "",
          "Closed Date": "",
        },
        {
          "Job Title": "Closed Jobs",
          Status: "closed",
          Applications: summary.closedJobs,
          Accepted: 0,
          Rejected: 0,
          Processing: 0,
          "Success Rate (%)": "",
          "Time to Fill (Days)": "",
          "Job Duration (Days)": 0,
          "Required Experience": 0,
          "Skills Required": 0,
          "Salary Range": "",
          "Created Date": "",
          "Closed Date": "",
        },
        {
          "Job Title": "Published Jobs",
          Status: "published",
          Applications: summary.publishedJobs,
          Accepted: 0,
          Rejected: 0,
          Processing: 0,
          "Success Rate (%)": "",
          "Time to Fill (Days)": "",
          "Job Duration (Days)": 0,
          "Required Experience": 0,
          "Skills Required": 0,
          "Salary Range": "",
          "Created Date": "",
          "Closed Date": "",
        },
        {
          "Job Title": "Overall Success Rate",
          Status: "",
          Applications: 0,
          Accepted: 0,
          Rejected: 0,
          Processing: 0,
          "Success Rate (%)": `${summary.overallSuccessRate}%`,
          "Time to Fill (Days)": "",
          "Job Duration (Days)": 0,
          "Required Experience": 0,
          "Skills Required": 0,
          "Salary Range": "",
          "Created Date": "",
          "Closed Date": "",
        },
        {
          "Job Title": "Average Time to Fill",
          Status: "",
          Applications: 0,
          Accepted: 0,
          Rejected: 0,
          Processing: 0,
          "Success Rate (%)": "",
          "Time to Fill (Days)": `${summary.avgTimeToFill} days`,
          "Job Duration (Days)": 0,
          "Required Experience": 0,
          "Skills Required": 0,
          "Salary Range": "",
          "Created Date": "",
          "Closed Date": "",
        }
      );
    }

    exportToCSV(csvData, "job_performance_analysis");
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Performance Analytics</CardTitle>
          <CardDescription>
            Analyze job posting effectiveness and hiring success
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Performance Analytics</CardTitle>
          <CardDescription>
            Analyze job posting effectiveness and hiring success
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-red-500">
            <div className="text-center">
              <p>Error loading job performance data</p>
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
            <CardTitle>Job Performance Analytics</CardTitle>
            <CardDescription>
              Track job posting effectiveness and hiring metrics
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
              <div className="flex items-center gap-2">
                <BriefcaseIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {summary.totalJobs}
                </div>
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                Total Jobs
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {summary.totalApplications}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">
                Total Applications
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {summary.overallSuccessRate}%
                </div>
                {summary.overallSuccessRate > 15 ? (
                  <TrendingUpIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDownIcon className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">
                Success Rate
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {summary.avgTimeToFill}
              </div>
              <div className="text-sm text-orange-600 dark:text-orange-400">
                Avg Days to Fill
              </div>
            </div>
          </div>
        )}

        {/* Job Status Breakdown */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Job Status Distribution */}
            <div className="bg-muted/50 dark:bg-muted/20 p-4 rounded-lg border">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <BriefcaseIcon className="h-4 w-4" />
                Job Status Distribution
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    Open Jobs
                  </span>
                  <span className="font-bold">{summary.openJobs || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                    Closed Jobs
                  </span>
                  <span className="font-bold">{summary.closedJobs || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    Draft Jobs
                  </span>
                  <span className="font-bold">{summary.draftJobs || 0}</span>
                </div>
              </div>
            </div>

            {/* Open Jobs Publication Status */}
            <div className="bg-muted/50 dark:bg-muted/20 p-4 rounded-lg border">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUpIcon className="h-4 w-4" />
                Open Jobs Publication
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    Published
                  </span>
                  <span className="font-bold">
                    {summary.publishedJobs || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    Unpublished
                  </span>
                  <span className="font-bold">
                    {summary.unpublishedJobs || 0}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Only open jobs are considered for publication status
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Insights Cards */}
        {insights && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                🏆 Top Performing Jobs
              </h4>
              <div className="space-y-1">
                {insights.topPerformingJobs
                  .slice(0, 3)
                  .map((job: JobPerformanceData, index: number) => (
                    <div key={job.jobId} className="text-sm">
                      <span className="font-medium text-foreground">
                        {index + 1}. {job.title}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 ml-2">
                        ({job.successRate}% success)
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">
                ⚠️ Needs Attention
              </h4>
              <div className="space-y-1">
                {insights.underperformingJobs
                  .slice(0, 3)
                  .map((job: JobPerformanceData, index: number) => (
                    <div key={job.jobId} className="text-sm">
                      <span className="font-medium text-foreground">
                        {index + 1}. {job.title}
                      </span>
                      <span className="text-red-600 dark:text-red-400 ml-2">
                        ({job.applications} apps in {job.jobDuration} days)
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
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
              <ApplicationsTimeScatterChart data={jobData} />
            </div>
          </TabsContent>

          <TabsContent value="top" className="mt-4">
            <div className="h-[550px]">
              <h3 className="text-lg font-semibold mb-4">
                Top Jobs by Application Volume
              </h3>
              <TopJobsChart data={jobData} />
            </div>
          </TabsContent>

          <TabsContent value="success" className="mt-4">
            <div className="h-[550px]">
              <h3 className="text-lg font-semibold mb-4">
                Job Success Rate Analysis
              </h3>
              <SuccessRateChart data={jobData} />
            </div>
          </TabsContent>

          <TabsContent value="status" className="mt-4">
            <div className="h-[550px]">
              <h3 className="text-lg font-semibold mb-4">
                Job Status Distribution
              </h3>
              <JobStatusChart data={jobData} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
