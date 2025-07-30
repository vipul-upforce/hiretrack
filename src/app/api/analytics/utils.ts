import { NextRequest } from "next/server";
import { AnalyticsRequest } from "./types";

// Utility function to parse analytics request parameters
export function parseAnalyticsRequest(request: NextRequest): AnalyticsRequest {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const organizationId = searchParams.get("organizationId") || "";
  
  // Parse date range
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  
  let dateRange;
  if (startDate && endDate) {
    dateRange = {
      start: new Date(startDate),
      end: new Date(endDate),
    };
  } else {
    // Default to last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    dateRange = { start, end };
  }

  // Parse filters
  const filters = {
    jobIds: searchParams.get("jobIds")?.split(",").filter(Boolean),
    candidateStatuses: searchParams.get("statuses")?.split(",").filter(Boolean),
    interviewerIds: searchParams.get("interviewerIds")?.split(",").filter(Boolean),
    locations: searchParams.get("locations")?.split(",").filter(Boolean),
  };

  return {
    organizationId,
    dateRange,
    filters,
  };
}

// Utility function to calculate conversion rates
export function calculateConversionRate(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round((current / previous) * 100 * 100) / 100; // Round to 2 decimal places
}

// Utility function to calculate time difference in days
export function calculateDaysFromDate(date: Date): number {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Utility function to generate stage colors
export function getStageColor(stage: string): string {
  const stageColors: Record<string, string> = {
    applied: "#3B82F6",      // blue
    screening: "#8B5CF6",    // purple
    interview: "#F59E0B",    // amber
    technical: "#EF4444",    // red
    final: "#10B981",        // emerald
    offered: "#06B6D4",      // cyan
    accepted: "#22C55E",     // green
    rejected: "#6B7280",     // gray
    withdrawn: "#9CA3AF",    // light gray
  };
  
  return stageColors[stage.toLowerCase()] || "#6B7280";
}

// Utility function to determine trend direction
export function calculateTrend(current: number, previous: number): "up" | "down" | "stable" {
  const threshold = 0.05; // 5% threshold for stability
  const change = (current - previous) / previous;
  
  if (Math.abs(change) < threshold) return "stable";
  return change > 0 ? "up" : "down";
}

// Utility function to format numbers for display
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

// Utility function to validate organization access
export function validateOrganizationAccess(requestOrgId: string, userOrgId: string): boolean {
  return requestOrgId === userOrgId;
}

// Utility function to create MongoDB date match pipeline
export function createDateMatchPipeline(dateRange: { start: Date; end: Date }, dateField: string = "createdAt") {
  return {
    [dateField]: {
      $gte: dateRange.start,
      $lte: dateRange.end,
    },
  };
}

// Utility function to sanitize and validate aggregation results
export function sanitizeAggregationResult<T>(result: any[]): T[] {
  return result.filter(item => item && typeof item === 'object');
}