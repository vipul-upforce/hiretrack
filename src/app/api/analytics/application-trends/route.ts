import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Candidate } from '@/lib/mongodb';
import { Types } from 'mongoose';
import { logger } from '@/lib/logger/logger.server';
import {
  withAnalyticsAuth,
  createAnalyticsResponse,
  createAnalyticsErrorResponse,
} from '../middleware';
import { parseAnalyticsRequest, calculateTrend } from '../utils';
import { TrendData } from '../types';

// Helper function to format date based on granularity
function formatDateByGranularity(date: Date, granularity: string): string {
  let options: Intl.DateTimeFormatOptions;

  if (granularity === 'monthly') {
    options = { year: 'numeric', month: 'short' };
  } else if (granularity === 'weekly') {
    options = { year: 'numeric', month: 'short', day: 'numeric' };
  } else {
    options = { year: 'numeric', month: 'short', day: 'numeric' };
  }

  return new Intl.DateTimeFormat('en-US', options).format(date);
}

// Helper function to calculate seasonal patterns
function calculateSeasonalPatterns(
  data: Array<TrendData & { movingAverage?: number }>,
): Array<{
  month: number;
  monthName: string;
  avgApplications: number;
  dataPoints: number;
}> {
  const monthlyData = data.reduce(
    (acc, period) => {
      const month = new Date(period.fullDate).getMonth();
      if (!acc[month]) acc[month] = [];
      acc[month].push(period.applications);
      return acc;
    },
    {} as Record<number, number[]>,
  );

  const seasonalAverages = Object.entries(monthlyData).map(
    ([month, values]) => ({
      month: parseInt(month, 10),
      monthName: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
        new Date(2024, parseInt(month, 10)),
      ),
      avgApplications: Math.round(
        values.reduce((sum, val) => sum + val, 0) / values.length,
      ),
      dataPoints: values.length,
    }),
  );

  return seasonalAverages.sort((a, b) => a.month - b.month);
}

// Helper function to calculate overall trend direction
function calculateOverallTrend(
  data: TrendData[],
): 'increasing' | 'decreasing' | 'stable' {
  if (data.length < 2) return 'stable';

  const halfLength = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, halfLength);
  const secondHalf = data.slice(halfLength);

  const firstHalfAvg =
    firstHalf.reduce((sum, p) => sum + p.applications, 0) / firstHalf.length;
  const secondHalfAvg =
    secondHalf.reduce((sum, p) => sum + p.applications, 0) / secondHalf.length;

  const change = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;

  if (change > 0.1) return 'increasing';
  if (change < -0.1) return 'decreasing';
  return 'stable';
}

// Helper function to calculate volatility
function calculateVolatility(data: TrendData[]): number {
  if (data.length < 2) return 0;

  const mean = data.reduce((sum, p) => sum + p.applications, 0) / data.length;
  const variance =
    data.reduce((sum, p) => sum + (p.applications - mean) ** 2, 0) /
    data.length;

  return Math.round(Math.sqrt(variance) * 100) / 100;
}

// Helper function to calculate growth trend
function calculateGrowthTrend(data: TrendData[]): number {
  if (data.length < 2) return 0;

  const firstPeriod = data[0].applications;
  const lastPeriod = data[data.length - 1].applications;

  if (firstPeriod === 0) return 0;

  return (
    Math.round(((lastPeriod - firstPeriod) / firstPeriod) * 100 * 100) / 100
  );
}


export async function GET(request: NextRequest) {
  return withAnalyticsAuth(request, async (user, req) => {
    try {
      await connectToDatabase();

      if (!Candidate) {
        return createAnalyticsErrorResponse('Database connection failed', 500);
      }

      const { dateRange, filters } = parseAnalyticsRequest(req);
      const url = new URL(req.url);
      const granularity = url.searchParams.get('granularity') || 'daily'; // daily, weekly, monthly

      // Set default date range if not provided (last 30 days for daily, last 12 months for monthly)
      let effectiveDateRange = dateRange;
      if (!dateRange) {
        const end = new Date();
        const start = new Date();
        if (granularity === 'monthly') {
          start.setMonth(start.getMonth() - 12);
        } else if (granularity === 'weekly') {
          start.setDate(start.getDate() - 12 * 7); // 12 weeks
        } else {
          start.setDate(start.getDate() - 30); // 30 days
        }
        effectiveDateRange = { start, end };
      }

      // Determine grouping and date projection based on granularity
      let groupIdObject: Record<string, unknown>;
      let dateProjectionObject: Record<string, unknown>;

      if (granularity === 'monthly') {
        groupIdObject = {
          year: { $year: '$tracking.createdAt' },
          month: { $month: '$tracking.createdAt' },
        };
        dateProjectionObject = {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: 1,
          },
        };
      } else if (granularity === 'weekly') {
        groupIdObject = {
          year: { $year: '$tracking.createdAt' },
          week: { $week: '$tracking.createdAt' },
        };
        dateProjectionObject = {
          $dateFromParts: {
            isoWeekYear: '$_id.year',
            isoWeek: '$_id.week',
            isoDayOfWeek: 1,
          },
        };
      } else {
        // Daily
        groupIdObject = {
          year: { $year: '$tracking.createdAt' },
          month: { $month: '$tracking.createdAt' },
          day: { $dayOfMonth: '$tracking.createdAt' },
        };
        dateProjectionObject = {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day',
          },
        };
      }

      // Build aggregation pipeline for application trends analysis
      const pipeline = [
        // Match organization and date range
        {
          $match: {
            organizationId: user.organizationId,
            'tracking.createdAt': {
              $gte: effectiveDateRange?.start,
              $lte: effectiveDateRange?.end,
            },
            ...(filters?.jobIds?.length && {
              jobId: {
                $in: filters.jobIds.map((id) => {
                  try {
                    return new Types.ObjectId(id);
                  } catch {
                    return id;
                  }
                }),
              },
            }),
            ...(filters?.candidateStatuses?.length && {
              status: { $in: filters.candidateStatuses },
            }),
            // Exclude deleted candidates
            isDeleted: { $ne: true },
          },
        },
        // Group by time period based on granularity
        {
          $group: {
            _id: groupIdObject,
            applications: { $sum: 1 },
            // Break down by status
            appliedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'applied'] }, 1, 0] },
            },
            screeningCount: {
              $sum: { $cond: [{ $eq: ['$status', 'screening'] }, 1, 0] },
            },
            shortlistedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'shortlisted'] }, 1, 0] },
            },
            processingCount: {
              $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] },
            },
            acceptedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] },
            },
            rejectedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
            },
            // Collect job IDs for diversity analysis
            uniqueJobs: { $addToSet: '$jobId' },
            // Collect candidate details for additional analysis
            candidates: {
              $push: {
                id: '$_id',
                jobId: '$jobId',
                status: '$status',
                experience: '$experience',
                skills: '$skills',
                location: '$location',
                createdAt: '$tracking.createdAt',
              },
            },
          },
        },
        // Add calculated fields
        {
          $addFields: {
            jobDiversity: { $size: '$uniqueJobs' },
            date: dateProjectionObject,
          },
        },
        // Sort by date
        {
          $sort: { date: 1 },
        },
        // Project final fields
        {
          $project: {
            date: 1,
            applications: 1,
            appliedCount: 1,
            screeningCount: 1,
            shortlistedCount: 1,
            processingCount: 1,
            acceptedCount: 1,
            rejectedCount: 1,
            jobDiversity: 1,
            candidates: 1,
          },
        },
      ];

      const results = await Candidate.collection
        .aggregate(pipeline, {
          maxTimeMS: 15000, // 15 second timeout
          allowDiskUse: false, // Use memory only for better performance
        })
        .toArray();

      // Process results to create trend data with additional analytics
      const trendData: TrendData[] = [];
      let previousApplications = 0;

      for (let i = 0; i < results.length; i += 1) {
        const result = results[i];
        const currentApplications = result.applications;

        // Calculate trend direction
        const trend =
          i === 0
            ? 'stable'
            : calculateTrend(currentApplications, previousApplications);

        // Calculate growth rate
        let growthRate = 0;
        if (i !== 0) {
          if (previousApplications > 0) {
            growthRate =
              Math.round(
                ((currentApplications - previousApplications) /
                  previousApplications) *
                  100 *
                  100,
              ) / 100;
          }
        }

        // Format date based on granularity
        const dateStr = formatDateByGranularity(result.date, granularity);

        trendData.push({
          date: dateStr,
          fullDate: result.date,
          applications: currentApplications,
          appliedCount: result.appliedCount,
          screeningCount: result.screeningCount,
          shortlistedCount: result.shortlistedCount,
          processingCount: result.processingCount,
          acceptedCount: result.acceptedCount,
          rejectedCount: result.rejectedCount,
          trend,
          growthRate,
          jobDiversity: result.jobDiversity,
          periodType: granularity as 'daily' | 'weekly' | 'monthly',
          // Calculate conversion metrics for the period
          conversionRate:
            currentApplications > 0
              ? Math.round(
                  (result.acceptedCount / currentApplications) * 100 * 100,
                ) / 100
              : 0,
          rejectionRate:
            currentApplications > 0
              ? Math.round(
                  (result.rejectedCount / currentApplications) * 100 * 100,
                ) / 100
              : 0,
        });

        previousApplications = currentApplications;
      }

      // Calculate overall trend metrics
      const totalApplications = trendData.reduce(
        (sum, period) => sum + period.applications,
        0,
      );
      const totalAccepted = trendData.reduce(
        (sum, period) => sum + period.acceptedCount,
        0,
      );
      const totalRejected = trendData.reduce(
        (sum, period) => sum + period.rejectedCount,
        0,
      );

      const avgApplicationsPerPeriod =
        trendData.length > 0
          ? Math.round(totalApplications / trendData.length)
          : 0;

      const overallConversionRate =
        totalApplications > 0
          ? Math.round((totalAccepted / totalApplications) * 100 * 100) / 100
          : 0;

      // Identify peak periods
      const sortedByApplications = [...trendData].sort(
        (a, b) => b.applications - a.applications,
      );
      const peakPeriods = sortedByApplications.slice(0, 3);

      // Identify low periods
      const lowPeriods = [...trendData]
        .filter((period) => period.applications > 0)
        .sort((a, b) => a.applications - b.applications)
        .slice(0, 3);

      // Calculate moving averages for trend smoothing
      const trendDataWithMovingAvg = trendData.map((period, index) => {
        const windowSize = Math.min(7, trendData.length); // 7-period moving average
        const halfWindow = Math.floor(windowSize / 2);

        const startIndex = Math.max(0, index - halfWindow);
        const endIndex = Math.min(trendData.length - 1, index + halfWindow);

        const windowData = trendData.slice(startIndex, endIndex + 1);
        const movingAvg = Math.round(
          windowData.reduce((sum, p) => sum + p.applications, 0) /
            windowData.length,
        );

        return {
          ...period,
          movingAverage: movingAvg,
        };
      });

      // Seasonal analysis (for monthly data)
      const seasonalAnalysis =
        granularity === 'monthly'
          ? calculateSeasonalPatterns(trendDataWithMovingAvg)
          : null;

      const response = createAnalyticsResponse(
        {
          trendData: trendDataWithMovingAvg,
          summary: {
            totalApplications,
            totalAccepted,
            totalRejected,
            avgApplicationsPerPeriod,
            overallConversionRate,
            totalPeriods: trendData.length,
            granularity,
            dateRange: effectiveDateRange,
          },
          insights: {
            peakPeriods,
            lowPeriods,
            seasonalAnalysis,
            trendDirection: calculateOverallTrend(trendData),
            volatility: calculateVolatility(trendData),
            growthTrend: calculateGrowthTrend(trendData),
          },
        },
        user.organizationId,
        {
          totalRecords: trendData.length,
          dateRange: effectiveDateRange,
        },
      );

      return NextResponse.json(response);
    } catch (error: unknown) {
      logger.error(
        { error, url: request.url },
        ' Application trends analytics error',
      );

      // Handle specific error types with better messages
      if (
        (error instanceof Error && error.message?.includes('timeout')) ||
        (error instanceof Error && error.message?.includes('maxTimeMS'))
      ) {
        return createAnalyticsErrorResponse(
          'Query timeout - please try a smaller date range or change granularity',
          408,
        );
      }

      if (error instanceof Error && error.message?.includes('memory')) {
        return createAnalyticsErrorResponse(
          'Dataset too large - please use weekly or monthly granularity',
          413,
        );
      }

      return createAnalyticsErrorResponse(
        'Failed to generate application trends analytics',
        500,
      );
    }
  });
}
