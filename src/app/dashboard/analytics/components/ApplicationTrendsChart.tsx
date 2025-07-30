"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  Legend,
  ComposedChart,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  RefreshCcwIcon, 
  DownloadIcon, 
  TrendingUpIcon, 
  TrendingDownIcon,
  CalendarIcon,
  BarChartIcon,
  ActivityIcon,
  AlertCircleIcon,
} from "lucide-react";
import { useApplicationTrends } from "../hooks/useAnalytics";
import { AnalyticsFilters } from "../hooks/useAnalytics";
import { exportToCSV } from "../utils/export";

interface ApplicationTrendsChartProps {
  filters?: AnalyticsFilters;
  organizationId?: string;
}

interface TrendData {
  date: string;
  fullDate: Date;
  applications: number;
  appliedCount: number;
  screeningCount: number;
  shortlistedCount: number;
  processingCount: number;
  acceptedCount: number;
  rejectedCount: number;
  trend: "up" | "down" | "stable";
  growthRate: number;
  jobDiversity: number;
  periodType: "daily" | "weekly" | "monthly";
  conversionRate: number;
  rejectionRate: number;
  movingAverage?: number;
}

// Main Application Trends Line Chart
const ApplicationTrendsLineChart: React.FC<{ data: TrendData[]; showMovingAverage?: boolean }> = ({ 
  data, 
  showMovingAverage = true 
}) => {
  return (
    <ResponsiveContainer width="100%" height={450}>
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="date" 
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
              const data = payload[0].payload as TrendData;
              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-foreground">{label}</p>
                  <p className="text-foreground">Applications: <span className="font-bold">{data.applications}</span></p>
                  <p className="text-foreground">Growth Rate: <span className={`font-bold ${data.growthRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {data.growthRate >= 0 ? '+' : ''}{data.growthRate}%
                  </span></p>
                  <p className="text-foreground">Job Diversity: <span className="font-bold">{data.jobDiversity} jobs</span></p>
                  <p className="text-foreground">Conversion Rate: <span className="font-bold">{data.conversionRate}%</span></p>
                  {showMovingAverage && data.movingAverage && (
                    <p className="text-foreground">Moving Avg: <span className="font-bold">{data.movingAverage}</span></p>
                  )}
                </div>
              );
            }
            return null;
          }}
        />
        <Line 
          type="monotone" 
          dataKey="applications" 
          stroke="#3B82F6" 
          strokeWidth={3}
          dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
          name="Applications"
        />
        {showMovingAverage && (
          <Line 
            type="monotone" 
            dataKey="movingAverage" 
            stroke="#10B981" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Moving Average"
          />
        )}
        <Legend />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

// Status Breakdown Area Chart
const StatusBreakdownAreaChart: React.FC<{ data: TrendData[] }> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={450}>
      <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="date" 
          angle={-45}
          textAnchor="end"
          height={80}
          interval={0}
          fontSize={12}
        />
        <YAxis />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            color: 'hsl(var(--foreground))',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Area 
          type="monotone" 
          dataKey="acceptedCount" 
          stackId="1" 
          stroke="#10B981" 
          fill="#10B981" 
          name="Accepted"
        />
        <Area 
          type="monotone" 
          dataKey="processingCount" 
          stackId="1" 
          stroke="#F59E0B" 
          fill="#F59E0B" 
          name="Processing"
        />
        <Area 
          type="monotone" 
          dataKey="screeningCount" 
          stackId="1" 
          stroke="#3B82F6" 
          fill="#3B82F6" 
          name="Screening"
        />
        <Area 
          type="monotone" 
          dataKey="appliedCount" 
          stackId="1" 
          stroke="#6B7280" 
          fill="#6B7280" 
          name="Applied"
        />
        <Area 
          type="monotone" 
          dataKey="rejectedCount" 
          stackId="1" 
          stroke="#EF4444" 
          fill="#EF4444" 
          name="Rejected"
        />
        <Legend />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// Growth Rate Bar Chart
const GrowthRateChart: React.FC<{ data: TrendData[] }> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={450}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="date" 
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
                  <p className="font-semibold text-foreground">Period: {label}</p>
                  <p className="text-foreground">
                    Growth Rate: <span className={`font-bold ${value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {value >= 0 ? '+' : ''}{value}%
                    </span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
        <Bar dataKey="growthRate" radius={[2, 2, 2, 2]} opacity={0.8}>
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.growthRate >= 0 ? '#10B981' : '#EF4444'} 
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// Conversion & Rejection Rate Comparison
const ConversionRateChart: React.FC<{ data: TrendData[] }> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={450}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="date" 
          angle={-45}
          textAnchor="end"
          height={80}
          interval={0}
          fontSize={12}
        />
        <YAxis />
        <Tooltip 
          content={({ active, payload, label }) => {
            if (active && payload && payload.length > 0) {
              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-foreground">{label}</p>
                  {payload.map((entry, index) => (
                    <p key={index} className="text-foreground">
                      {entry.name}: <span className="font-bold">{entry.value}%</span>
                    </p>
                  ))}
                </div>
              );
            }
            return null;
          }}
        />
        <ReferenceLine y={20} stroke="#10B981" strokeDasharray="5 5" label="Target: 20%" />
        <Line 
          type="monotone" 
          dataKey="conversionRate" 
          stroke="#10B981" 
          strokeWidth={2}
          dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
          name="Conversion Rate"
        />
        <Line 
          type="monotone" 
          dataKey="rejectionRate" 
          stroke="#EF4444" 
          strokeWidth={2}
          dot={{ fill: "#EF4444", strokeWidth: 2, r: 4 }}
          name="Rejection Rate"
        />
        <Legend />
      </LineChart>
    </ResponsiveContainer>
  );
};

export const ApplicationTrendsChart: React.FC<ApplicationTrendsChartProps> = ({
  filters,
  organizationId,
}) => {
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("daily");
  const [showMovingAverage, setShowMovingAverage] = useState(true);
  
  // Memoize filters to prevent infinite re-renders
  const enhancedFilters = useMemo(() => ({
    ...filters,
    granularity,
  }), [filters, granularity]);

  const { data, loading, error, refetch } = useApplicationTrends(enhancedFilters, organizationId);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    if (data) {
      setTrendData(data.trendData || []);
      setSummary(data.summary || null);
      setInsights(data.insights || null);
    }
  }, [data]);

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = () => {
    if (!trendData || trendData.length === 0) {
      console.warn("No application trends data to export");
      return;
    }

    const csvData = trendData.map(trend => ({
      "Date": trend.date,
      "Period Type": trend.periodType,
      "Applications": trend.applications,
      "Applied": trend.appliedCount,
      "Screening": trend.screeningCount,
      "Shortlisted": trend.shortlistedCount,
      "Processing": trend.processingCount,
      "Accepted": trend.acceptedCount,
      "Rejected": trend.rejectedCount,
      "Growth Rate (%)": trend.growthRate.toFixed(2),
      "Conversion Rate (%)": trend.conversionRate.toFixed(2),
      "Rejection Rate (%)": trend.rejectionRate.toFixed(2),
      "Job Diversity": trend.jobDiversity,
      "Trend": trend.trend,
      "Moving Average": trend.movingAverage || "N/A"
    }));

    // Add summary data as additional rows
    if (summary) {
      csvData.push(
        { "Date": "", "Period Type": "", "Applications": "", "Applied": "", "Screening": "", "Shortlisted": "", "Processing": "", "Accepted": "", "Rejected": "", "Growth Rate (%)": "", "Conversion Rate (%)": "", "Rejection Rate (%)": "", "Job Diversity": "", "Trend": "", "Moving Average": "" },
        { "Date": "SUMMARY", "Period Type": "", "Applications": "", "Applied": "", "Screening": "", "Shortlisted": "", "Processing": "", "Accepted": "", "Rejected": "", "Growth Rate (%)": "", "Conversion Rate (%)": "", "Rejection Rate (%)": "", "Job Diversity": "", "Trend": "", "Moving Average": "" },
        { "Date": "Total Applications", "Period Type": "", "Applications": summary.totalApplications, "Applied": "", "Screening": "", "Shortlisted": "", "Processing": "", "Accepted": "", "Rejected": "", "Growth Rate (%)": "", "Conversion Rate (%)": "", "Rejection Rate (%)": "", "Job Diversity": "", "Trend": "", "Moving Average": "" },
        { "Date": "Total Accepted", "Period Type": "", "Applications": "", "Applied": "", "Screening": "", "Shortlisted": "", "Processing": "", "Accepted": summary.totalAccepted, "Rejected": "", "Growth Rate (%)": "", "Conversion Rate (%)": "", "Rejection Rate (%)": "", "Job Diversity": "", "Trend": "", "Moving Average": "" },
        { "Date": "Total Rejected", "Period Type": "", "Applications": "", "Applied": "", "Screening": "", "Shortlisted": "", "Processing": "", "Accepted": "", "Rejected": summary.totalRejected, "Growth Rate (%)": "", "Conversion Rate (%)": "", "Rejection Rate (%)": "", "Job Diversity": "", "Trend": "", "Moving Average": "" },
        { "Date": "Average per Period", "Period Type": "", "Applications": summary.avgApplicationsPerPeriod, "Applied": "", "Screening": "", "Shortlisted": "", "Processing": "", "Accepted": "", "Rejected": "", "Growth Rate (%)": "", "Conversion Rate (%)": "", "Rejection Rate (%)": "", "Job Diversity": "", "Trend": "", "Moving Average": "" },
        { "Date": "Overall Conversion Rate", "Period Type": "", "Applications": "", "Applied": "", "Screening": "", "Shortlisted": "", "Processing": "", "Accepted": "", "Rejected": "", "Growth Rate (%)": "", "Conversion Rate (%)": `${summary.overallConversionRate}%`, "Rejection Rate (%)": "", "Job Diversity": "", "Trend": "", "Moving Average": "" }
      );
    }

    exportToCSV(csvData, `application_trends_${granularity}_analysis`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Application Trends Analytics</CardTitle>
          <CardDescription>Monitor application patterns over time</CardDescription>
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
          <CardTitle>Application Trends Analytics</CardTitle>
          <CardDescription>Monitor application patterns over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-red-500">
            <div className="text-center">
              <p>Error loading application trends data</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
              <Button variant="outline" className="mt-4" onClick={handleRefresh}>
                <RefreshCcwIcon className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case "increasing":
        return <TrendingUpIcon className="h-4 w-4 text-green-500" />;
      case "decreasing":
        return <TrendingDownIcon className="h-4 w-4 text-red-500" />;
      default:
        return <ActivityIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Application Trends Analytics</CardTitle>
            <CardDescription>Track application patterns and growth over time</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={granularity} onValueChange={(value: "daily" | "weekly" | "monthly") => setGranularity(value)}>
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
                <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.totalApplications}</div>
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Total Applications</div>
            </div>
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.avgApplicationsPerPeriod}</div>
              <div className="text-sm text-green-600 dark:text-green-400">Avg per {granularity.slice(0, -2)}</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{summary.overallConversionRate}%</div>
                {insights && getTrendIcon(insights.trendDirection)}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">Conversion Rate</div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2">
                <BarChartIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{insights?.growthTrend || 0}%</div>
              </div>
              <div className="text-sm text-orange-600 dark:text-orange-400">Overall Growth</div>
            </div>
          </div>
        )}

        {/* Insights Cards */}
        {insights && (
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-2">
                <TrendingUpIcon className="h-4 w-4" />
                Peak Periods
              </h4>
              <div className="space-y-1">
                {insights.peakPeriods.slice(0, 3).map((period: TrendData, index: number) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium text-foreground">{period.date}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 ml-2">({period.applications} apps)</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
                <AlertCircleIcon className="h-4 w-4" />
                Low Activity
              </h4>
              <div className="space-y-1">
                {insights.lowPeriods.slice(0, 3).map((period: TrendData, index: number) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium text-foreground">{period.date}</span>
                    <span className="text-red-600 dark:text-red-400 ml-2">({period.applications} apps)</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">📊 Trend Analysis</h4>
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
                  <Badge variant={insights.growthTrend >= 0 ? "default" : "destructive"}>
                    {insights.growthTrend >= 0 ? '+' : ''}{insights.growthTrend}%
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
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
                  <label htmlFor="movingAverage" className="text-sm">Show Moving Average</label>
                </div>
              </div>
              <ApplicationTrendsLineChart data={trendData} showMovingAverage={showMovingAverage} />
            </div>
          </TabsContent>
          
          <TabsContent value="breakdown" className="mt-4">
            <div className="h-[550px]">
              <h3 className="text-lg font-semibold mb-4">Application Status Breakdown Over Time</h3>
              <StatusBreakdownAreaChart data={trendData} />
            </div>
          </TabsContent>
          
          <TabsContent value="growth" className="mt-4">
            <div className="h-[550px]">
              <h3 className="text-lg font-semibold mb-4">Period-over-Period Growth Rate</h3>
              <GrowthRateChart data={trendData} />
            </div>
          </TabsContent>
          
          <TabsContent value="conversion" className="mt-4">
            <div className="h-[550px]">
              <h3 className="text-lg font-semibold mb-4">Conversion vs Rejection Rate Trends</h3>
              <ConversionRateChart data={trendData} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};