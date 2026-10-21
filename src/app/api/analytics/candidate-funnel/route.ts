import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  Candidate,
  Job,
  Organization,
  Lane,
} from '@/lib/mongodb';
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

      if (!Candidate || !Job || !Organization || !Lane) {
        return createAnalyticsErrorResponse('Database connection failed', 500);
      }

      const { organizationId, dateRange, filters } = parseAnalyticsRequest(req);

      // Resolve ordered list of lane keys (systemKey or name) that define funnel stages.
      // We normalize them to lowercase so analytics is independent of ObjectIds.
      let finalLanes: string[] = [];

      if (filters?.jobIds && filters.jobIds.length > 0) {
        // Use the primary job in the filter to resolve its effective lanes
        let primaryJobId: Types.ObjectId | string = filters.jobIds[0];
        try {
          primaryJobId = new Types.ObjectId(filters.jobIds[0]);
        } catch {
          // keep as-is if not a valid ObjectId string
        }

        const jobDoc = await Job.findOne({
          _id: primaryJobId,
          organizationId,
        })
          .select('lanes useCustomLanes organizationId')
          .lean<{
            lanes?: Types.ObjectId[];
            useCustomLanes?: boolean;
            organizationId: string | Types.ObjectId;
          }>();

        if (jobDoc?.useCustomLanes && jobDoc.lanes && jobDoc.lanes.length > 0) {
          const jobLanes = await Lane.find({
            _id: { $in: jobDoc.lanes },
            organizationId,
            isActive: true,
          })
            .select('name systemKey order')
            .sort({ order: 1 })
            .lean();

          finalLanes = jobLanes.map((lane) =>
            (lane.systemKey || lane.name).toLowerCase(),
          );
        } else {
          const orgLanes = await Lane.find({
            organizationId,
            jobId: null,
            isActive: true,
          })
            .select('name systemKey order')
            .sort({ order: 1 })
            .lean();

          finalLanes = orgLanes.map((lane) =>
            (lane.systemKey || lane.name).toLowerCase(),
          );
        }
      } else {
        // No specific job filter: use organization-level active lanes (defaults)
        const orgLanes = await Lane.find({
          organizationId,
          jobId: null,
          isActive: true,
        })
          .select('name systemKey order')
          .sort({ order: 1 })
          .lean();

        finalLanes = orgLanes.map((lane) =>
          (lane.systemKey || lane.name).toLowerCase(),
        );
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

      const normalizedCandidateStatuses =
        filters?.candidateStatuses?.map((s) => s.toLowerCase()) ?? [];

      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'lanes',
            localField: 'status',
            foreignField: '_id',
            as: 'lane',
          },
        },
        { $unwind: { path: '$lane', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            laneKey: {
              $toLower: {
                $ifNull: ['$lane.systemKey', '$lane.name'],
              },
            },
          },
        },
        ...(normalizedCandidateStatuses.length > 0
          ? [
              {
                $match: {
                  laneKey: { $in: normalizedCandidateStatuses },
                },
              } as Record<string, unknown>,
            ]
          : []),
        {
          $group: {
            _id: '$laneKey',
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

      finalLanes.forEach((stageKey) => {
        stageData.set(stageKey, {
          stage: stageKey,
          count: 0,
          avgTimeInDays: 0,
          createdDates: [],
        });
      });

      results.forEach((result) => {
        if (!result._id) return;
        const key = result._id.toString();

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
      finalLanes.forEach((stageKey, index) => {
        const stageInfo = stageData.get(stageKey);
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

        const normalizedStage =
          stageKey.charAt(0).toUpperCase() + stageKey.slice(1);

        funnelData.push({
          stage: normalizedStage,
          count: currentCount,
          conversionRate,
          avgTimeInDays: stageInfo.avgTimeInDays,
          previousStageCount:
            index === 0 ? currentCount : funnelData[index - 1]?.count || 0,
          color: getStageColor(stageKey),
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
