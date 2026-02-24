import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Candidate, Job, Organization } from '@/lib/mongodb';
import { Types } from 'mongoose';
import { logger } from '@/lib/logger/logger.server';
import {
  withAnalyticsAuth,
  createAnalyticsResponse,
  createAnalyticsErrorResponse,
} from '../middleware';
import {
  parseAnalyticsRequest,
  calculateConversionRate,
  getStageColor,
} from '../utils';
import { FunnelData } from '../types';

interface StageMetrics {
  stage: string;
  count: number;
  avgTimeInDays: number;
  createdDates: Date[];
}

interface AggregationResult {
  _id: string;
  count: number;
  avgTimeInStage: number | null;
  createdDates: Date[];
}

interface JobLaneProjection {
  lanes?: string[];
  useCustomLanes?: boolean;
}

interface OrgLaneProjection {
  defaultLanes?: string[];
}

type MatchQuery = {
  organizationId: string;
  isDeleted: { $ne: boolean };
  $or?: Array<Record<string, unknown>>;
  jobId?: { $in: Types.ObjectId[] };
  status?: { $in: string[] };
};

export async function GET(request: NextRequest) {
  return withAnalyticsAuth(request, async (user, req) => {
    try {
      await connectToDatabase();

      if (!Candidate || !Job || !Organization) {
        return createAnalyticsErrorResponse('Database connection failed', 500);
      }

      const { organizationId, dateRange, filters } = parseAnalyticsRequest(req);

      let finalLanes: string[] = [];

      if (filters?.jobIds && filters.jobIds.length > 0) {
        const jobDoc = await Job.findOne({
          _id: filters.jobIds[0],
          organizationId,
        })
          .select('lanes useCustomLanes')
          .lean<JobLaneProjection>();

        if (jobDoc?.lanes && jobDoc.lanes.length > 0) {
          finalLanes = jobDoc.lanes;
        } else {
          const orgDoc = await Organization.findById(organizationId)
            .select('defaultLanes')
            .lean<OrgLaneProjection>();
          finalLanes = orgDoc?.defaultLanes || [];
        }
      } else {
        const orgDoc = await Organization.findById(organizationId)
          .select('defaultLanes')
          .lean<OrgLaneProjection>();
        const defaults = orgDoc?.defaultLanes || [];

        const allUsedLanes = await Job.distinct('lanes', {
          organizationId: new Types.ObjectId(organizationId),
          lanes: { $exists: true, $ne: [] },
        });

        const laneSet = new Set(defaults);
        if (Array.isArray(allUsedLanes)) {
          allUsedLanes.forEach((lane: unknown) => {
            if (typeof lane === 'string') laneSet.add(lane);
          });
        }
        finalLanes = Array.from(laneSet);
      }

      if (finalLanes.length === 0) {
        return NextResponse.json(
          createAnalyticsResponse(
            {
              funnelData: [],
              summary: {
                totalCandidates: 0,
                acceptedCandidates: 0,
                rejectedCandidates: 0,
                overallConversionRate: 0,
                avgTimeToHire: 0,
              },
            },
            user.organizationId,
          ),
        );
      }

      const startDate = dateRange ? new Date(dateRange.start) : null;
      const endDate = dateRange ? new Date(dateRange.end) : null;

      const jobObjectIds =
        filters?.jobIds
          ?.map((id) => {
            try {
              return new Types.ObjectId(id);
            } catch {
              return null;
            }
          })
          .filter((id): id is Types.ObjectId => id !== null) || [];

      const matchStage: MatchQuery = {
        organizationId,
        isDeleted: { $ne: true },
      };

      if (startDate && endDate) {
        matchStage.$or = [
          { 'tracking.createdAt': { $gte: startDate, $lte: endDate } },
          { createdAt: { $gte: startDate, $lte: endDate } },
        ];
      }

      if (jobObjectIds.length > 0) {
        matchStage.jobId = { $in: jobObjectIds };
      }

      if (filters?.candidateStatuses?.length) {
        matchStage.status = { $in: filters.candidateStatuses };
      }

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgTimeInStage: {
              $avg: {
                $subtract: [
                  {
                    $ifNull: ['$tracking.updatedAt', '$updatedAt', new Date()],
                  },
                  {
                    $ifNull: ['$tracking.createdAt', '$createdAt', new Date()],
                  },
                ],
              },
            },
            createdDates: {
              $push: { $ifNull: ['$tracking.createdAt', '$createdAt'] },
            },
          },
        },
      ];

      const rawResults = await Candidate.collection
        .aggregate(pipeline, {
          maxTimeMS: 15000,
        })
        .toArray();

      const results = rawResults as unknown as AggregationResult[];

      const stageData = new Map<string, StageMetrics>();
      let totalCandidates = 0;

      finalLanes.forEach((stage) => {
        stageData.set(stage.toLowerCase(), {
          stage,
          count: 0,
          avgTimeInDays: 0,
          createdDates: [],
        });
      });

      results.forEach((result) => {
        if (!result._id) return;

        const key = result._id.toLowerCase();

        if (stageData.has(key)) {
          const metrics = stageData.get(key);
          if (metrics) {
            metrics.count += result.count;
            metrics.avgTimeInDays = result.avgTimeInStage
              ? Math.round(result.avgTimeInStage / (1000 * 60 * 60 * 24))
              : 0;
            metrics.createdDates = result.createdDates;
            totalCandidates += result.count;
          }
        }
      });

      const funnelData: FunnelData[] = [];
      let previousStageCount = totalCandidates;

      finalLanes.forEach((stage, index) => {
        const stageInfo = stageData.get(stage.toLowerCase());
        if (!stageInfo) return;

        const currentCount = stageInfo.count;
        let conversionRate = 0;

        if (index === 0) {
          conversionRate = currentCount > 0 ? 100 : 0;
          previousStageCount = totalCandidates;
        } else {
          conversionRate = calculateConversionRate(
            currentCount,
            previousStageCount,
          );
          previousStageCount = totalCandidates;
        }

        funnelData.push({
          stage: stage.charAt(0).toUpperCase() + stage.slice(1),
          count: currentCount,
          conversionRate,
          avgTimeInDays: stageInfo.avgTimeInDays,
          previousStageCount:
            index === 0 ? currentCount : funnelData[index - 1]?.count || 0,
          color: getStageColor(stage),
        });
      });

      // Calculate overall funnel metrics
      const appliedCount = funnelData[0]?.count || 0;
      const acceptedCount =
        funnelData.find((f) => f.stage.toLowerCase() === 'accepted')?.count ||
        0;
      const rejectedCount =
        funnelData.find((f) => f.stage.toLowerCase() === 'rejected')?.count ||
        0;

      const overallConversionRate =
        appliedCount > 0
          ? Math.round((acceptedCount / totalCandidates) * 100 * 100) / 100
          : 0;

      const avgTimeToHire =
        funnelData.length > 0
          ? funnelData.reduce((sum, stage) => sum + stage.avgTimeInDays, 0) /
            funnelData.length
          : 0;

      const response = createAnalyticsResponse(
        {
          funnelData,
          summary: {
            totalCandidates,
            acceptedCandidates: acceptedCount,
            rejectedCandidates: rejectedCount,
            overallConversionRate,
            avgTimeToHire,
          },
        },
        user.organizationId,
        { totalRecords: totalCandidates, dateRange },
      );

      return NextResponse.json(response);
    } catch (error: unknown) {
      logger.error(
        { error, url: request.url },
        'Candidate funnel analytics error.',
      );

      if (
        error instanceof Error &&
        (error.message?.includes('timeout') ||
          error.message?.includes('maxTimeMS'))
      ) {
        return createAnalyticsErrorResponse(
          'Query timeout - please try a smaller date range',
          408,
        );
      }

      if (error instanceof Error && error.message?.includes('memory')) {
        return createAnalyticsErrorResponse(
          'Dataset too large - please add filters to reduce data size',
          413,
        );
      }

      return createAnalyticsErrorResponse(
        'Failed to generate candidate funnel analytics',
        500,
      );
    }
  });
}
