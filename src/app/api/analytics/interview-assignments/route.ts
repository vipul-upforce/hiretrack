import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Candidate, User } from '@/lib/mongodb';
import { Types } from 'mongoose';
import { logger } from '@/lib/logger/logger.server';
import {
  withAnalyticsAuth,
  createAnalyticsResponse,
  createAnalyticsErrorResponse,
} from '../middleware';
import { parseAnalyticsRequest } from '../utils';
import { AssignmentData } from '../types';

export async function GET(request: NextRequest) {
  return withAnalyticsAuth(request, async (user, req) => {
    try {
      await connectToDatabase();

      if (!Candidate || !User) {
        return createAnalyticsErrorResponse('Database connection failed', 500);
      }

      const { dateRange, filters } = parseAnalyticsRequest(req);

      // First, let's check if we have any candidates with interview assignments
      const candidateCount = await Candidate.countDocuments({
        organizationId: user.organizationId,
        'assignment.interviewerId': { $exists: true, $ne: null },
        isDeleted: { $ne: true },
      });

      if (candidateCount === 0) {
        // Return empty data if no candidates with assignments
        const response = createAnalyticsResponse(
          {
            assignmentData: [],
            summary: {
              totalInterviewers: 0,
              totalAssignments: 0,
              totalCompletions: 0,
              totalAccepted: 0,
              totalRejected: 0,
              overallCompletionRate: 0,
              overallSuccessRate: 0,
              avgAssignmentsPerInterviewer: 0,
              activeInterviewers: 0,
            },
            insights: {
              topPerformers: [],
              overloadedInterviewers: [],
              underutilizedInterviewers: [],
              workloadBalance: {
                balanced: 0,
                overloaded: 0,
                underutilized: 0,
              },
            },
          },
          user.organizationId,
          {
            totalRecords: 0,
            dateRange,
          },
        );
        return NextResponse.json(response);
      }

      // Build aggregation pipeline for interview assignment analysis
      const pipeline = [
        // Match candidates with interview assignments
        {
          $match: {
            organizationId: user.organizationId,
            'assignment.interviewerId': { $exists: true, $ne: null },
            ...(dateRange && {
              'assignment.assignedAt': {
                $gte: dateRange.start,
                $lte: dateRange.end,
              },
            }),
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
            ...(filters?.interviewerIds?.length && {
              'assignment.interviewerId': { $in: filters.interviewerIds },
            }),
            // Exclude deleted candidates
            isDeleted: { $ne: true },
          },
        },
        // Group by interviewer to calculate assignment metrics
        {
          $group: {
            _id: '$assignment.interviewerId',
            totalAssignments: { $sum: 1 },
            completedInterviews: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$status', 'accepted'] },
                      { $eq: ['$status', 'rejected'] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            pendingInterviews: {
              $sum: {
                $cond: [
                  {
                    $not: [
                      {
                        $or: [
                          { $eq: ['$status', 'accepted'] },
                          { $eq: ['$status', 'rejected'] },
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            acceptedCandidates: {
              $sum: {
                $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0],
              },
            },
            rejectedCandidates: {
              $sum: {
                $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0],
              },
            },
            // Calculate average candidate scores if available
            avgOverallScore: {
              $avg: '$scores.overall',
            },
            avgExperienceScore: {
              $avg: '$scores.experience',
            },
            avgSkillsScore: {
              $avg: '$scores.skills',
            },
            // Collect assignment dates for workload analysis
            assignmentDates: { $push: '$assignment.assignedAt' },
            interviewTimes: { $push: '$assignment.time' },
            // Collect candidate details for analysis
            candidateDetails: {
              $push: {
                candidateId: '$_id',
                candidateName: '$name',
                status: '$status',
                assignedAt: '$assignment.assignedAt',
                interviewTime: '$assignment.time',
                scores: '$scores',
              },
            },
          },
        },
        // Lookup interviewer details
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'interviewer',
          },
        },
        // Unwind interviewer array with preserveNullAndEmptyArrays
        {
          $unwind: {
            path: '$interviewer',
            preserveNullAndEmptyArrays: true,
          },
        },
        // Add calculated fields for performance metrics
        {
          $addFields: {
            completionRate: {
              $cond: {
                if: { $gt: ['$totalAssignments', 0] },
                then: {
                  $multiply: [
                    { $divide: ['$completedInterviews', '$totalAssignments'] },
                    100,
                  ],
                },
                else: 0,
              },
            },
            successRate: {
              $cond: {
                if: { $gt: ['$completedInterviews', 0] },
                then: {
                  $multiply: [
                    {
                      $divide: ['$acceptedCandidates', '$completedInterviews'],
                    },
                    100,
                  ],
                },
                else: 0,
              },
            },
            avgDailyAssignments: {
              $cond: {
                if: {
                  $and: [
                    { $gt: [{ $size: '$assignmentDates' }, 0] },
                    {
                      $gt: [
                        { $max: '$assignmentDates' },
                        { $min: '$assignmentDates' },
                      ],
                    },
                  ],
                },
                then: {
                  $divide: [
                    '$totalAssignments',
                    {
                      $max: [
                        1, // Minimum 1 day to prevent division by zero
                        {
                          $divide: [
                            {
                              $subtract: [
                                { $max: '$assignmentDates' },
                                { $min: '$assignmentDates' },
                              ],
                            },
                            1000 * 60 * 60 * 24, // Convert to days
                          ],
                        },
                      ],
                    },
                  ],
                },
                else: '$totalAssignments', // If all assignments on same day, return total
              },
            },
          },
        },
        // Project final fields
        {
          $project: {
            interviewerId: '$_id',
            interviewerName: {
              $ifNull: ['$interviewer.name', 'Unknown Interviewer'],
            },
            interviewerEmail: {
              $ifNull: ['$interviewer.email', 'unknown@example.com'],
            },
            role: { $ifNull: ['$interviewer.role', 'interviewer'] },
            totalAssignments: 1,
            completedInterviews: 1,
            pendingInterviews: 1,
            acceptedCandidates: 1,
            rejectedCandidates: 1,
            completionRate: {
              $round: [{ $ifNull: ['$completionRate', 0] }, 2],
            },
            successRate: { $round: [{ $ifNull: ['$successRate', 0] }, 2] },
            avgOverallScore: {
              $round: [{ $ifNull: ['$avgOverallScore', 0] }, 2],
            },
            avgExperienceScore: {
              $round: [{ $ifNull: ['$avgExperienceScore', 0] }, 2],
            },
            avgSkillsScore: {
              $round: [{ $ifNull: ['$avgSkillsScore', 0] }, 2],
            },
            avgDailyAssignments: {
              $round: [{ $ifNull: ['$avgDailyAssignments', 0] }, 2],
            },
            candidateDetails: 1,
            assignmentDates: 1,
            interviewTimes: 1,
          },
        },
        // Sort by total assignments descending
        {
          $sort: { totalAssignments: -1 },
        },
      ];

      let results;
      try {
        results = await Candidate.collection
          .aggregate(pipeline, {
            maxTimeMS: 15000, // 15 second timeout
            allowDiskUse: false, // Use memory only for better performance
          })
          .toArray();
      } catch (aggregationError: any) {
        logger.error(
          { error: aggregationError, url: request.url },
          ' Interview assignments - Aggregation failed',
          aggregationError,
        );
        if (aggregationError.message?.includes('timeout')) {
          throw new Error(
            'Query timeout - please try a smaller date range or add more filters',
          );
        }
        throw new Error(`Aggregation failed: ${aggregationError.message}`);
      }

      // Process results to create assignment analytics data
      const assignmentData: AssignmentData[] = results.map((result) => ({
        interviewerId: result.interviewerId
          ? result.interviewerId.toString()
          : 'unknown',
        interviewerName: result.interviewerName || 'Unknown Interviewer',
        interviewerEmail: result.interviewerEmail || 'unknown@example.com',
        role: result.role || 'interviewer',
        assignments: result.totalAssignments || 0,
        completions: result.completedInterviews || 0,
        pending: result.pendingInterviews || 0,
        accepted: result.acceptedCandidates || 0,
        rejected: result.rejectedCandidates || 0,
        completionRate: result.completionRate || 0,
        successRate: result.successRate || 0,
        avgRating: result.avgOverallScore || 0,
        avgExperienceScore: result.avgExperienceScore || 0,
        avgSkillsScore: result.avgSkillsScore || 0,
        avgDailyAssignments: result.avgDailyAssignments || 0,
        candidateDetails: result.candidateDetails || [],
        workloadDistribution: result.assignmentDates || [],
      }));

      // Calculate overall assignment metrics
      const totalAssignments = assignmentData.reduce(
        (sum, interviewer) => sum + interviewer.assignments,
        0,
      );
      const totalCompletions = assignmentData.reduce(
        (sum, interviewer) => sum + interviewer.completions,
        0,
      );
      const totalAccepted = assignmentData.reduce(
        (sum, interviewer) => sum + interviewer.accepted,
        0,
      );
      const totalRejected = assignmentData.reduce(
        (sum, interviewer) => sum + interviewer.rejected,
        0,
      );

      const overallCompletionRate =
        totalAssignments > 0
          ? Math.round((totalCompletions / totalAssignments) * 100 * 100) / 100
          : 0;

      const overallSuccessRate =
        totalCompletions > 0
          ? Math.round((totalAccepted / totalCompletions) * 100 * 100) / 100
          : 0;

      // Identify workload distribution insights
      const avgAssignmentsPerInterviewer =
        assignmentData.length > 0
          ? Math.round(totalAssignments / assignmentData.length)
          : 0;

      // Top performers by success rate
      const topPerformers = [...assignmentData]
        .filter((interviewer) => interviewer.completions >= 3) // Minimum completions for meaningful data
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 5);

      // Overloaded interviewers (high assignment count)
      const overloadedInterviewers = [...assignmentData]
        .filter(
          (interviewer) =>
            interviewer.assignments > avgAssignmentsPerInterviewer * 1.5,
        )
        .sort((a, b) => b.assignments - a.assignments)
        .slice(0, 5);

      // Underutilized interviewers
      const underutilizedInterviewers = [...assignmentData]
        .filter(
          (interviewer) =>
            interviewer.assignments < avgAssignmentsPerInterviewer * 0.5,
        )
        .sort((a, b) => a.assignments - b.assignments)
        .slice(0, 5);

      const response = createAnalyticsResponse(
        {
          assignmentData,
          summary: {
            totalInterviewers: assignmentData.length,
            totalAssignments,
            totalCompletions,
            totalAccepted,
            totalRejected,
            overallCompletionRate,
            overallSuccessRate,
            avgAssignmentsPerInterviewer,
            activeInterviewers: assignmentData.length,
          },
          insights: {
            topPerformers,
            overloadedInterviewers,
            underutilizedInterviewers,
            workloadBalance: {
              balanced: assignmentData.filter(
                (i) =>
                  i.assignments >= avgAssignmentsPerInterviewer * 0.8 &&
                  i.assignments <= avgAssignmentsPerInterviewer * 1.2,
              ).length,
              overloaded: overloadedInterviewers.length,
              underutilized: underutilizedInterviewers.length,
            },
          },
        },
        user.organizationId,
        {
          totalRecords: assignmentData.length,
          dateRange,
        },
      );

      return NextResponse.json(response);
    } catch (error) {
      logger.error(
        { error, url: request.url },
        'Interview assignment analytics error:',
        error,
      );
      return createAnalyticsErrorResponse(
        'Failed to generate interview assignment analytics',
        500,
      );
    }
  });
}
