import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Job, Candidate } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import {
  withAnalyticsAuth,
  createAnalyticsResponse,
  createAnalyticsErrorResponse,
} from "../middleware";
import { parseAnalyticsRequest, calculateDaysFromDate } from "../utils";
import { JobPerformanceData } from "../types";

export async function GET(request: NextRequest) {
  return withAnalyticsAuth(request, async (user, req) => {
    try {
      await connectToDatabase();

      if (!Job || !Candidate) {
        return createAnalyticsErrorResponse("Database connection failed", 500);
      }

      const { organizationId, dateRange, filters } = parseAnalyticsRequest(req);

      // Handle both string and ObjectId organizationId formats for jobs collection
      // Jobs use ObjectId, so we need to convert string organizationId to ObjectId
      let jobsOrgId;
      try {
        jobsOrgId = new ObjectId(user.organizationId);
      } catch (e) {
        // If conversion fails, use string (fallback)
        jobsOrgId = user.organizationId;
      }

      const orgIdQuery = {
        organizationId: jobsOrgId, // Jobs collection uses ObjectId
        isDeleted: { $ne: true },
      };

      const jobCount = await Job.countDocuments(orgIdQuery);

      // Minimal logging for production
      if (process.env.ENVIRONMENT === "development") {
        console.log("Job Performance - Job count for org:", jobCount);
        console.log("Job Performance - User org ID:", user.organizationId);
      }

      if (jobCount === 0) {
        // Return empty data if no jobs
        const response = createAnalyticsResponse(
          {
            jobPerformanceData: [],
            summary: {
              totalJobs: 0,
              totalApplications: 0,
              totalAccepted: 0,
              totalRejected: 0,
              avgApplicationsPerJob: 0,
              overallSuccessRate: 0,
              avgTimeToFill: 0,
              activeJobs: 0,
              closedJobs: 0,
            },
            insights: {
              topPerformingJobs: [],
              underperformingJobs: [],
              jobTrends: {
                applicationTrend: "stable",
                successRateTrend: "stable",
                avgTimeToFillTrend: "stable",
              },
            },
          },
          user.organizationId,
          {
            totalRecords: 0,
            dateRange,
          }
        );
        return NextResponse.json(response);
      }

      // Build aggregation pipeline for job performance analysis
      const pipeline = [
        // Match organization and date range
        {
          $match: {
            organizationId: jobsOrgId, // Use the properly typed organizationId
            ...(dateRange && {
              "tracking.createdAt": {
                $gte: dateRange.start,
                $lte: dateRange.end,
              },
            }),
            ...(filters?.jobIds?.length && {
              _id: { $in: filters.jobIds },
            }),
            // Exclude deleted jobs unless specifically requested
            isDeleted: { $ne: true },
          },
        },
        // Lookup candidates for each job
        {
          $lookup: {
            from: "candidates",
            localField: "_id",
            foreignField: "jobId",
            as: "candidates",
            pipeline: [
              {
                $match: {
                  isDeleted: { $ne: true },
                  ...(filters?.candidateStatuses?.length && {
                    status: { $in: filters.candidateStatuses },
                  }),
                },
              },
            ],
          },
        },
        // Add calculated fields for performance metrics
        {
          $addFields: {
            candidateCount: { $size: "$candidates" },
            acceptedCandidates: {
              $size: {
                $filter: {
                  input: "$candidates",
                  cond: { $eq: ["$$this.status", "accepted"] },
                },
              },
            },
            rejectedCandidates: {
              $size: {
                $filter: {
                  input: "$candidates",
                  cond: { $eq: ["$$this.status", "rejected"] },
                },
              },
            },
            processingCandidates: {
              $size: {
                $filter: {
                  input: "$candidates",
                  cond: {
                    $and: [
                      { $ne: ["$$this.status", "accepted"] },
                      { $ne: ["$$this.status", "rejected"] },
                    ],
                  },
                },
              },
            },
            // Calculate average time to fill for accepted candidates
            avgTimeToFill: {
              $avg: {
                $map: {
                  input: {
                    $filter: {
                      input: "$candidates",
                      cond: { $eq: ["$$this.status", "accepted"] },
                    },
                  },
                  as: "acceptedCandidate",
                  in: {
                    $subtract: [
                      "$$acceptedCandidate.tracking.updatedAt",
                      "$$acceptedCandidate.tracking.createdAt",
                    ],
                  },
                },
              },
            },
            // Calculate job posting duration
            jobDuration: {
              $cond: {
                if: { $ne: ["$tracking.closedAt", null] },
                then: {
                  $subtract: ["$tracking.closedAt", "$tracking.createdAt"],
                },
                else: {
                  $subtract: [new Date(), "$tracking.createdAt"],
                },
              },
            },
          },
        },
        // Project final fields
        {
          $project: {
            title: 1,
            status: 1,
            candidateCount: 1,
            acceptedCandidates: 1,
            rejectedCandidates: 1,
            processingCandidates: 1,
            successRate: {
              $cond: {
                if: { $gt: ["$candidateCount", 0] },
                then: {
                  $multiply: [
                    { $divide: ["$acceptedCandidates", "$candidateCount"] },
                    100,
                  ],
                },
                else: 0,
              },
            },
            avgTimeToFillDays: {
              $cond: {
                if: { $ne: ["$avgTimeToFill", null] },
                then: {
                  $divide: ["$avgTimeToFill", 1000 * 60 * 60 * 24], // Convert to days
                },
                else: 0,
              },
            },
            jobDurationDays: {
              $divide: ["$jobDuration", 1000 * 60 * 60 * 24], // Convert to days
            },
            createdAt: "$tracking.createdAt",
            closedAt: "$tracking.closedAt",
            salary: 1,
            experience: 1,
            skills: 1,
          },
        },
        // Sort by candidate count descending
        {
          $sort: { candidateCount: -1 },
        },
      ];

      const results = await Job.collection
        .aggregate(pipeline, {
          maxTimeMS: 15000, // 15 second timeout
          allowDiskUse: false, // Use memory only for better performance
        })
        .toArray();

      // Development logging only
      if (process.env.ENVIRONMENT === "development") {
        console.log(
          "Job Performance - Aggregation results count:",
          results.length
        );
      }

      // Process results to create job performance data
      const jobPerformanceData: JobPerformanceData[] = results.map((job) => ({
        jobId: job._id.toString(),
        title: job.title,
        applications: job.candidateCount,
        accepted: job.acceptedCandidates,
        rejected: job.rejectedCandidates,
        processing: job.processingCandidates,
        timeToFill: Math.round(job.avgTimeToFillDays || 0),
        successRate: Math.round(job.successRate * 100) / 100, // Round to 2 decimal places
        status: job.status,
        createdAt: job.createdAt,
        closedAt: job.closedAt,
        jobDuration: Math.round(job.jobDurationDays),
        salaryRange: job.salary
          ? {
              min: job.salary.min,
              max: job.salary.max,
              inText: job.salary.inText,
            }
          : null,
        requiredExperience: job.experience,
        skillsRequired: job.skills?.length || 0,
      }));

      // Calculate overall performance metrics
      const totalJobs = jobPerformanceData.length;
      const totalApplications = jobPerformanceData.reduce(
        (sum, job) => sum + job.applications,
        0
      );
      const totalAccepted = jobPerformanceData.reduce(
        (sum, job) => sum + job.accepted,
        0
      );
      const totalRejected = jobPerformanceData.reduce(
        (sum, job) => sum + job.rejected,
        0
      );

      const avgApplicationsPerJob =
        totalJobs > 0 ? Math.round(totalApplications / totalJobs) : 0;
      const overallSuccessRate =
        totalApplications > 0
          ? Math.round((totalAccepted / totalApplications) * 100 * 100) / 100
          : 0;

      const avgTimeToFill =
        jobPerformanceData.length > 0
          ? Math.round(
              jobPerformanceData.reduce((sum, job) => sum + job.timeToFill, 0) /
                jobPerformanceData.length
            )
          : 0;

      // Calculate job status breakdown
      const openJobs = jobPerformanceData.filter(
        (job) => job.status === "open"
      ).length;
      const closedJobs = jobPerformanceData.filter(
        (job) => job.status === "closed"
      ).length;
      const draftJobs = jobPerformanceData.filter(
        (job) => job.status === "draft"
      ).length;

      // For published/unpublished breakdown, we need to query the database again
      const publishedJobs = await Job.countDocuments({
        organizationId: jobsOrgId,
        status: "open",
        isPublished: true,
        isDeleted: { $ne: true },
      });

      const unpublishedJobs = await Job.countDocuments({
        organizationId: jobsOrgId,
        status: "open",
        $or: [{ isPublished: false }, { isPublished: { $exists: false } }],
        isDeleted: { $ne: true },
      });

      // Top performing jobs (by success rate)
      const topPerformingJobs = [...jobPerformanceData]
        .filter((job) => job.applications >= 1) // Only jobs with at least 1 application
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 5);

      // Underperforming jobs (low application count relative to duration)
      const underperformingJobs = [...jobPerformanceData]
        .filter((job) => job.jobDuration >= 7) // Jobs open for at least a week
        .sort(
          (a, b) =>
            a.applications / a.jobDuration - b.applications / b.jobDuration
        )
        .slice(0, 5);

      const response = createAnalyticsResponse(
        {
          jobPerformanceData,
          summary: {
            totalJobs,
            totalApplications,
            totalAccepted,
            totalRejected,
            avgApplicationsPerJob,
            overallSuccessRate,
            avgTimeToFill,
            // Job status breakdown
            openJobs,
            closedJobs,
            draftJobs,
            // Published/Unpublished breakdown for open jobs
            publishedJobs,
            unpublishedJobs,
            // Legacy fields for backward compatibility
            activeJobs: openJobs,
          },
          insights: {
            topPerformingJobs,
            underperformingJobs,
            avgJobDuration:
              jobPerformanceData.length > 0
                ? Math.round(
                    jobPerformanceData.reduce(
                      (sum, job) => sum + job.jobDuration,
                      0
                    ) / jobPerformanceData.length
                  )
                : 0,
          },
        },
        user.organizationId,
        {
          totalRecords: totalJobs,
          dateRange,
        }
      );

      return NextResponse.json(response);
    } catch (error: any) {
      console.error("Job performance analytics error:", error);

      // Handle specific error types with better messages
      if (
        error.message?.includes("timeout") ||
        error.message?.includes("maxTimeMS")
      ) {
        return createAnalyticsErrorResponse(
          "Query timeout - please try a smaller date range or reduce filters",
          408
        );
      }

      if (error.message?.includes("memory")) {
        return createAnalyticsErrorResponse(
          "Dataset too large - please add filters to reduce data size",
          413
        );
      }

      return createAnalyticsErrorResponse(
        "Failed to generate job performance analytics",
        500
      );
    }
  });
}
