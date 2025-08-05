import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Candidate } from "@/lib/mongodb";
import { withEnhancedAnalyticsAuth } from "../enhanced-middleware";
import { createAnalyticsResponse, createAnalyticsErrorResponse } from "../middleware";
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
] as const;

/**
 * Optimized candidate funnel analytics with improved performance
 */
export async function GET(request: NextRequest) {
  return withEnhancedAnalyticsAuth(request, async (user, req) => {
    try {
      await connectToDatabase();

      if (!Candidate) {
        return createAnalyticsErrorResponse("Database connection failed", 500);
      }

      const { organizationId, dateRange, filters } = parseAnalyticsRequest(req);

      // Optimized aggregation pipeline with better performance
      const pipeline = [
        // Stage 1: Efficient match with compound index usage
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
              jobId: { 
                $in: filters.jobIds.map(id => {
                  try {
                    return new Types.ObjectId(id);
                  } catch {
                    return id;
                  }
                })
              },
            }),
            ...(filters?.candidateStatuses?.length && {
              status: { $in: filters.candidateStatuses },
            }),
            isDeleted: { $ne: true },
          },
        },
        
        // Stage 2: Project only required fields early to reduce memory usage
        {
          $project: {
            status: 1,
            "tracking.createdAt": 1,
            "tracking.updatedAt": 1,
          },
        },
        
        // Stage 3: Group by status with optimized calculations
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            // More efficient time calculation
            avgTimeInStage: {
              $avg: {
                $cond: {
                  if: { 
                    $and: [
                      { $ne: ["$tracking.updatedAt", null] },
                      { $ne: ["$tracking.createdAt", null] }
                    ]
                  },
                  then: {
                    $subtract: [
                      { $ifNull: ["$tracking.updatedAt", "$tracking.createdAt"] },
                      "$tracking.createdAt"
                    ]
                  },
                  else: 0
                }
              }
            },
          },
        },
        
        // Stage 4: Sort for consistent output
        {
          $sort: { _id: 1 },
        },
      ];

      const startTime = Date.now();
      const results = await Candidate.collection.aggregate(pipeline, {
        allowDiskUse: false, // Use memory-only for better performance with small result sets
        maxTimeMS: 30000, // 30 second timeout
      }).toArray();
      const queryTime = Date.now() - startTime;

      // Process results efficiently
      const stageDataMap = new Map<string, any>();
      let totalCandidates = 0;

      // Initialize all stages
      CANDIDATE_STAGES.forEach(stage => {
        stageDataMap.set(stage, {
          stage,
          count: 0,
          avgTimeInDays: 0,
        });
      });

      // Populate with actual data
      results.forEach((result) => {
        if (CANDIDATE_STAGES.includes(result._id as any)) {
          const avgTimeInDays = result.avgTimeInStage 
            ? Math.round(result.avgTimeInStage / (1000 * 60 * 60 * 24)) 
            : 0;
            
          stageDataMap.set(result._id, {
            stage: result._id,
            count: result.count,
            avgTimeInDays,
          });
          totalCandidates += result.count;
        }
      });

      // Build funnel data with optimized conversion calculations
      const funnelData: FunnelData[] = [];
      let previousStageCount = totalCandidates;

      CANDIDATE_STAGES.forEach((stage, index) => {
        const stageInfo = stageDataMap.get(stage)!;
        const currentCount = stageInfo.count;
        
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

      // Calculate summary metrics
      const appliedCount = funnelData[0]?.count || 0;
      const acceptedCount = funnelData.find(f => f.stage.toLowerCase() === 'accepted')?.count || 0;
      const rejectedCount = funnelData.find(f => f.stage.toLowerCase() === 'rejected')?.count || 0;
      
      const overallConversionRate = appliedCount > 0 
        ? Math.round((acceptedCount / appliedCount) * 100 * 100) / 100 
        : 0;

      const avgTimeToHire = funnelData.length > 0
        ? Math.round(funnelData.reduce((sum, stage) => sum + stage.avgTimeInDays, 0) / funnelData.length)
        : 0;

      const response = createAnalyticsResponse(
        {
          funnelData,
          summary: {
            totalCandidates: appliedCount,
            acceptedCandidates: acceptedCount,
            rejectedCandidates: rejectedCount,
            overallConversionRate,
            avgTimeToHire,
          },
          performance: {
            queryTimeMs: queryTime,
            documentsProcessed: totalCandidates,
            indexesUsed: true, // Would be determined by explain plan in production
          }
        },
        user.organizationId,
        {
          totalRecords: totalCandidates,
          dateRange,
        }
      );

      return NextResponse.json(response);

    } catch (error:any) {
      console.error("Optimized candidate funnel analytics error:", error);
      
      // More specific error handling
      if (error.message?.includes('timeout')) {
        return createAnalyticsErrorResponse("Query timeout - please try a smaller date range", 408);
      }
      
      if (error.message?.includes('memory')) {
        return createAnalyticsErrorResponse("Query too large - please add more filters", 413);
      }
      
      return createAnalyticsErrorResponse("Failed to generate candidate funnel analytics", 500);
    }
  });
}

/**
 * Optimized version with caching support (for future implementation)
 */
export async function getCachedCandidateFunnelData(
  organizationId: string,
  dateRange?: { start: Date; end: Date },
  filters?: any
): Promise<any> {
  // Cache key generation
  const cacheKey = `funnel:${organizationId}:${dateRange?.start.getTime()}-${dateRange?.end.getTime()}:${JSON.stringify(filters)}`;
  
  // In production, check Redis cache here
  // const cachedData = await redis.get(cacheKey);
  // if (cachedData) return JSON.parse(cachedData);
  
  // If not cached, run the query and cache the result
  // const data = await runFunnelQuery(...);
  // await redis.setex(cacheKey, 300, JSON.stringify(data)); // 5 minute TTL
  
  return null; // Placeholder for cache implementation
}