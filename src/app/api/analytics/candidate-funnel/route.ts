import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Candidate } from "@/lib/mongodb";
import { 
  withAnalyticsAuth, 
  createAnalyticsResponse, 
  createAnalyticsErrorResponse 
} from "../middleware";
import { parseAnalyticsRequest, calculateConversionRate, getStageColor } from "../utils";
import { FunnelData } from "../types";
import { Types } from "mongoose";

const CANDIDATE_STAGES = [
  "applied",
  "screening", 
  "shortlisted",
  "processing",
  "accepted",
  "rejected"
];

export async function GET(request: NextRequest) {
  return withAnalyticsAuth(request, async (user, req) => {
    try {
      await connectToDatabase();

      if (!Candidate) {
        return createAnalyticsErrorResponse("Database connection failed", 500);
      }

      const { organizationId, dateRange, filters } = parseAnalyticsRequest(req);

      // Debug logging
      console.log("Candidate funnel analytics request:", {
        organizationId,
        userOrganizationId: user.organizationId,
        dateRange,
        jobIds: filters?.jobIds,
        candidateStatuses: filters?.candidateStatuses,
      });

      // Build aggregation pipeline for candidate funnel analysis
      const pipeline = [
        // Match organization and date range
        {
          $match: {
            organizationId: user.organizationId,
            ...(dateRange && {
              "tracking.createdAt": {
                $gte: dateRange.start,
                $lte: dateRange.end,
              },
            }),
            ...(filters?.jobIds?.length && {
              jobId: { $in: filters.jobIds.map(id => {
                try {
                  return new Types.ObjectId(id);
                } catch {
                  return id; // Keep as string if not a valid ObjectId
                }
              }) },
            }),
            ...(filters?.candidateStatuses?.length && {
              status: { $in: filters.candidateStatuses },
            }),
            // Exclude deleted candidates unless specifically requested
            isDeleted: { $ne: true },
          },
        },
        // Group by status to get counts
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            // Calculate average time in stage
            avgTimeInStage: {
              $avg: {
                $subtract: [
                  "$tracking.updatedAt",
                  "$tracking.createdAt"
                ]
              }
            },
            // Collect creation dates for trend analysis
            createdDates: { $push: "$tracking.createdAt" },
          },
        },
        // Sort by stage order (we'll handle this in post-processing)
        {
          $sort: { _id: 1 },
        },
      ];

      const results = await Candidate.collection.aggregate(pipeline).toArray();
      console.log("Candidate funnel aggregation results:", results.length, results);

      // Process results to create funnel data with conversion rates
      const stageData = new Map<string, any>();
      let totalCandidates = 0;

      // Initialize all stages with zero counts
      CANDIDATE_STAGES.forEach(stage => {
        stageData.set(stage, {
          stage,
          count: 0,
          avgTimeInDays: 0,
          createdDates: [],
        });
      });

      // Populate with actual data
      results.forEach((result) => {
        if (CANDIDATE_STAGES.includes(result._id)) {
          stageData.set(result._id, {
            stage: result._id,
            count: result.count,
            avgTimeInDays: result.avgTimeInStage 
              ? Math.round(result.avgTimeInStage / (1000 * 60 * 60 * 24)) 
              : 0,
            createdDates: result.createdDates,
          });
          totalCandidates += result.count;
        }
      });

      // Calculate conversion rates and create final funnel data
      const funnelData: FunnelData[] = [];
      let previousStageCount = totalCandidates;

      CANDIDATE_STAGES.forEach((stage, index) => {
        const stageInfo = stageData.get(stage)!;
        const currentCount = stageInfo.count;
        
        // For the first stage (applied), conversion rate is 100%
        // For subsequent stages, calculate conversion from previous stage
        let conversionRate = 0;
        if (index === 0) {
          conversionRate = currentCount > 0 ? 100 : 0;
          previousStageCount = currentCount;
        } else {
          conversionRate = calculateConversionRate(currentCount, previousStageCount);
          previousStageCount = currentCount;
        }

        funnelData.push({
          stage: stage.charAt(0).toUpperCase() + stage.slice(1),
          count: currentCount,
          conversionRate,
          avgTimeInDays: stageInfo.avgTimeInDays,
          previousStageCount: index === 0 ? currentCount : funnelData[index - 1]?.count || 0,
          color: getStageColor(stage),
        });
      });

      // Calculate overall funnel metrics
      const appliedCount = funnelData[0]?.count || 0;
      const acceptedCount = funnelData.find(f => f.stage.toLowerCase() === 'accepted')?.count || 0;
      const rejectedCount = funnelData.find(f => f.stage.toLowerCase() === 'rejected')?.count || 0;
      
      const overallConversionRate = appliedCount > 0 
        ? Math.round((acceptedCount / appliedCount) * 100 * 100) / 100 
        : 0;

      const response = createAnalyticsResponse(
        {
          funnelData,
          summary: {
            totalCandidates: appliedCount,
            acceptedCandidates: acceptedCount,
            rejectedCandidates: rejectedCount,
            overallConversionRate,
            avgTimeToHire: funnelData.reduce((sum, stage) => sum + stage.avgTimeInDays, 0) / funnelData.length,
          },
        },
        user.organizationId,
        {
          totalRecords: totalCandidates,
          dateRange,
        }
      );

      return NextResponse.json(response);

    } catch (error) {
      console.error("Candidate funnel analytics error:", error);
      return createAnalyticsErrorResponse(
        "Failed to generate candidate funnel analytics",
        500
      );
    }
  });
}