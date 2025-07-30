"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  RefreshCcwIcon, 
  DownloadIcon, 
  UserCheckIcon, 
  ClockIcon, 
  TrendingUpIcon,
  TrendingDownIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from "lucide-react";
import { useInterviewAssignments } from "../hooks/useAnalytics";
import { AnalyticsFilters } from "../hooks/useAnalytics";
import { exportToCSV } from "../utils/export";

interface InterviewAssignmentChartProps {
  filters?: AnalyticsFilters;
  organizationId?: string;
}

interface AssignmentData {
  interviewerId: string;
  interviewerName: string;
  interviewerEmail: string;
  role: string;
  assignments: number;
  completions: number;
  pending: number;
  accepted: number;
  rejected: number;
  completionRate: number;
  successRate: number;
  avgRating: number;
  avgExperienceScore: number;
  avgSkillsScore: number;
  avgDailyAssignments: number;
  candidateDetails: Array<{
    candidateId: string;
    candidateName: string;
    status: string;
    assignedAt: Date;
    interviewTime?: Date;
    scores?: {
      overall?: number;
      experience?: number;
      skills?: number;
    };
  }>;
  workloadDistribution: Date[];
}

// Interviewer Workload Bar Chart
const WorkloadDistributionChart: React.FC<{ data: AssignmentData[] }> = ({ data }) => {
  const chartData = data.slice(0, 10).map(interviewer => ({
    ...interviewer,
    name: interviewer.interviewerName.length > 15 
      ? interviewer.interviewerName.substring(0, 12) + "..." 
      : interviewer.interviewerName,
  }));

  return (
    <ResponsiveContainer width="100%" height={450}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="name" 
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
              const data = payload[0].payload as AssignmentData;
              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-foreground">{data.interviewerName}</p>
                  <p className="text-foreground">Total Assignments: <span className="font-bold">{data.assignments}</span></p>
                  <p className="text-foreground">Completed: <span className="font-bold text-green-600 dark:text-green-400">{data.completions}</span></p>
                  <p className="text-foreground">Pending: <span className="font-bold text-orange-600 dark:text-orange-400">{data.pending}</span></p>
                  <p className="text-foreground">Completion Rate: <span className="font-bold">{data.completionRate}%</span></p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="assignments" fill="#3B82F6" radius={[4, 4, 0, 0]} opacity={0.8} />
        <Bar dataKey="completions" fill="#10B981" radius={[4, 4, 0, 0]} opacity={0.8} />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Interviewer Performance Radar Chart
const PerformanceRadarChart: React.FC<{ data: AssignmentData[] }> = ({ data }) => {
  const topPerformers = data
    .filter(interviewer => interviewer.completions >= 3)
    .slice(0, 5)
    .map(interviewer => ({
      name: interviewer.interviewerName.split(' ')[0], // First name only for readability
      completionRate: interviewer.completionRate,
      successRate: interviewer.successRate,
      avgRating: interviewer.avgRating * 10, // Scale to 0-100 for radar chart
      avgExperienceScore: interviewer.avgExperienceScore * 10,
      avgSkillsScore: interviewer.avgSkillsScore * 10,
      workloadScore: Math.min(interviewer.avgDailyAssignments * 20, 100), // Cap at 100
    }));

  return (
    <ResponsiveContainer width="100%" height={450}>
      <RadarChart data={topPerformers} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
        <PolarGrid />
        <PolarAngleAxis dataKey="name" />
        <PolarRadiusAxis angle={90} domain={[0, 100]} />
        <Tooltip 
          content={({ active, payload, label }) => {
            if (active && payload && payload.length > 0) {
              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-foreground">{label}</p>
                  {payload.map((entry, index) => {
                    const name = entry.name as string;
                    const value = entry.value as number;
                    let displayValue = '';
                    let displayName = '';
                    
                    if (name.includes('Score') || name.includes('Rating')) {
                      displayValue = `${(value / 10).toFixed(1)}/10`;
                      displayName = name.replace('Score', '').replace('avg', 'Avg ');
                    } else {
                      displayValue = `${value.toFixed(1)}%`;
                      displayName = name.replace('Rate', ' Rate');
                    }
                    
                    return (
                      <p key={index} className="text-foreground">
                        {displayName}: <span className="font-bold">{displayValue}</span>
                      </p>
                    );
                  })}
                </div>
              );
            }
            return null;
          }}
        />
        <Radar 
          name="Completion Rate" 
          dataKey="completionRate" 
          stroke="#3B82F6" 
          fill="#3B82F6" 
          fillOpacity={0.1} 
        />
        <Radar 
          name="Success Rate" 
          dataKey="successRate" 
          stroke="#10B981" 
          fill="#10B981" 
          fillOpacity={0.1} 
        />
        <Radar 
          name="Avg Rating" 
          dataKey="avgRating" 
          stroke="#F59E0B" 
          fill="#F59E0B" 
          fillOpacity={0.1} 
        />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
};

// Interview Completion Rate Pie Chart
const CompletionRatePieChart: React.FC<{ data: AssignmentData[] }> = ({ data }) => {
  const totalAssignments = data.reduce((sum, interviewer) => sum + interviewer.assignments, 0);
  const totalCompletions = data.reduce((sum, interviewer) => sum + interviewer.completions, 0);
  const totalPending = data.reduce((sum, interviewer) => sum + interviewer.pending, 0);

  const pieData = [
    { name: 'Completed', value: totalCompletions, fill: '#10B981' },
    { name: 'Pending', value: totalPending, fill: '#F59E0B' },
  ];

  // Custom label component for better dark mode support
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="hsl(var(--foreground))" 
        textAnchor={x > cx ? 'start' : 'end'} 
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
                    Type: <span className="font-bold">{data.name} Interviews</span>
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

// Success Rate Timeline Chart
const SuccessRateChart: React.FC<{ data: AssignmentData[] }> = ({ data }) => {
  const chartData = data
    .filter(interviewer => interviewer.completions >= 2)
    .slice(0, 10)
    .map(interviewer => ({
      name: interviewer.interviewerName.split(' ')[0],
      successRate: interviewer.successRate,
      completionRate: interviewer.completionRate,
    }));

  return (
    <ResponsiveContainer width="100%" height={450}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="name" 
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
                  <p className="font-semibold text-foreground">{label}</p>
                  <p className="text-foreground">
                    Success Rate: <span className={`font-bold ${value >= 70 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {value}%
                    </span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <ReferenceLine y={70} stroke="#10B981" strokeDasharray="5 5" label="Target: 70%" />
        <Bar dataKey="successRate" radius={[4, 4, 0, 0]} opacity={0.8}>
          {chartData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.successRate >= 70 ? '#10B981' : '#EF4444'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export const InterviewAssignmentChart: React.FC<InterviewAssignmentChartProps> = ({
  filters,
  organizationId,
}) => {
  const { data, loading, error, refetch } = useInterviewAssignments(filters, organizationId);
  const [assignmentData, setAssignmentData] = useState<AssignmentData[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    if (data) {
      setAssignmentData(data.assignmentData || []);
      setSummary(data.summary || null);
      setInsights(data.insights || null);
    }
  }, [data]);

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = () => {
    if (!assignmentData || assignmentData.length === 0) {
      console.warn("No interview assignment data to export");
      return;
    }

    const csvData = assignmentData.map(interviewer => ({
      "Interviewer": interviewer.interviewerName,
      "Email": interviewer.interviewerEmail,
      "Role": interviewer.role,
      "Total Assignments": interviewer.assignments,
      "Completed": interviewer.completions,
      "Pending": interviewer.pending,
      "Accepted": interviewer.accepted,
      "Rejected": interviewer.rejected,
      "Completion Rate (%)": interviewer.completionRate.toFixed(2),
      "Success Rate (%)": interviewer.successRate.toFixed(2),
      "Average Rating": interviewer.avgRating.toFixed(2),
      "Average Experience Score": interviewer.avgExperienceScore.toFixed(2),
      "Average Skills Score": interviewer.avgSkillsScore.toFixed(2),
      "Average Daily Assignments": interviewer.avgDailyAssignments.toFixed(1),
    }));

    // Add summary data as additional rows
    if (summary) {
      csvData.push(
        { "Interviewer": "", "Email": "", "Role": "", "Total Assignments": "", "Completed": "", "Pending": "", "Accepted": "", "Rejected": "", "Completion Rate (%)": "", "Success Rate (%)": "", "Average Rating": "", "Average Experience Score": "", "Average Skills Score": "", "Average Daily Assignments": "" },
        { "Interviewer": "SUMMARY", "Email": "", "Role": "", "Total Assignments": "", "Completed": "", "Pending": "", "Accepted": "", "Rejected": "", "Completion Rate (%)": "", "Success Rate (%)": "", "Average Rating": "", "Average Experience Score": "", "Average Skills Score": "", "Average Daily Assignments": "" },
        { "Interviewer": "Total Interviewers", "Email": "", "Role": "", "Total Assignments": summary.totalInterviewers, "Completed": "", "Pending": "", "Accepted": "", "Rejected": "", "Completion Rate (%)": "", "Success Rate (%)": "", "Average Rating": "", "Average Experience Score": "", "Average Skills Score": "", "Average Daily Assignments": "" },
        { "Interviewer": "Total Assignments", "Email": "", "Role": "", "Total Assignments": summary.totalAssignments, "Completed": "", "Pending": "", "Accepted": "", "Rejected": "", "Completion Rate (%)": "", "Success Rate (%)": "", "Average Rating": "", "Average Experience Score": "", "Average Skills Score": "", "Average Daily Assignments": "" },
        { "Interviewer": "Overall Completion Rate", "Email": "", "Role": "", "Total Assignments": "", "Completed": "", "Pending": "", "Accepted": "", "Rejected": "", "Completion Rate (%)": `${summary.overallCompletionRate}%`, "Success Rate (%)": "", "Average Rating": "", "Average Experience Score": "", "Average Skills Score": "", "Average Daily Assignments": "" },
        { "Interviewer": "Overall Success Rate", "Email": "", "Role": "", "Total Assignments": "", "Completed": "", "Pending": "", "Accepted": "", "Rejected": "", "Completion Rate (%)": "", "Success Rate (%)": `${summary.overallSuccessRate}%`, "Average Rating": "", "Average Experience Score": "", "Average Skills Score": "", "Average Daily Assignments": "" }
      );
    }

    exportToCSV(csvData, "interview_assignment_analysis");
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Interview Assignment Analytics</CardTitle>
          <CardDescription>Track interviewer workload and performance</CardDescription>
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
          <CardTitle>Interview Assignment Analytics</CardTitle>
          <CardDescription>Track interviewer workload and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-red-500">
            <div className="text-center">
              <p>Error loading interview assignment data</p>
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Interview Assignment Analytics</CardTitle>
            <CardDescription>Monitor interviewer workload and performance metrics</CardDescription>
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
                <UserCheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.totalInterviewers}</div>
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Active Interviewers</div>
            </div>
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.totalAssignments}</div>
              <div className="text-sm text-green-600 dark:text-green-400">Total Assignments</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{summary.overallCompletionRate}%</div>
                {summary.overallCompletionRate > 80 ? (
                  <TrendingUpIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDownIcon className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">Completion Rate</div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.overallSuccessRate}%</div>
              </div>
              <div className="text-sm text-orange-600 dark:text-orange-400">Success Rate</div>
            </div>
          </div>
        )}

        {/* Insights Cards */}
        {insights && (
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4" />
                Top Performers
              </h4>
              <div className="space-y-1">
                {insights.topPerformers.slice(0, 3).map((interviewer: AssignmentData, index: number) => (
                  <div key={interviewer.interviewerId} className="text-sm">
                    <span className="font-medium text-foreground">{index + 1}. {interviewer.interviewerName.split(' ')[0]}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 ml-2">({interviewer.successRate}% success)</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
                <AlertTriangleIcon className="h-4 w-4" />
                Overloaded
              </h4>
              <div className="space-y-1">
                {insights.overloadedInterviewers.slice(0, 3).map((interviewer: AssignmentData, index: number) => (
                  <div key={interviewer.interviewerId} className="text-sm">
                    <span className="font-medium text-foreground">{index + 1}. {interviewer.interviewerName.split(' ')[0]}</span>
                    <span className="text-red-600 dark:text-red-400 ml-2">({interviewer.assignments} assignments)</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">⚖️ Workload Balance</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Balanced:</span>
                  <Badge variant="outline">{insights.workloadBalance.balanced}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Overloaded:</span>
                  <Badge variant="destructive">{insights.workloadBalance.overloaded}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Underutilized:</span>
                  <Badge variant="secondary">{insights.workloadBalance.underutilized}</Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <Tabs defaultValue="workload" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="workload">Workload</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="completion">Completion</TabsTrigger>
            <TabsTrigger value="success">Success Rate</TabsTrigger>
          </TabsList>
          
          <TabsContent value="workload" className="mt-4">
            <div className="h-[550px]">
              <h3 className="text-lg font-semibold mb-4">Interviewer Workload Distribution</h3>
              <WorkloadDistributionChart data={assignmentData} />
            </div>
          </TabsContent>
          
          <TabsContent value="performance" className="mt-4">
            <div className="h-[550px]">
              <h3 className="text-lg font-semibold mb-4">Multi-dimensional Performance Analysis</h3>
              <PerformanceRadarChart data={assignmentData} />
            </div>
          </TabsContent>
          
          <TabsContent value="completion" className="mt-4">
            <div className="h-[550px]">
              <h3 className="text-lg font-semibold mb-4">Interview Completion Status</h3>
              <CompletionRatePieChart data={assignmentData} />
            </div>
          </TabsContent>
          
          <TabsContent value="success" className="mt-4">
            <div className="h-[550px]">
              <h3 className="text-lg font-semibold mb-4">Interviewer Success Rates</h3>
              <SuccessRateChart data={assignmentData} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};