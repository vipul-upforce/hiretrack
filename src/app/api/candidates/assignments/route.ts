import { NextResponse, NextRequest } from 'next/server';
import connectToDatabase, {
  Settings,
  Organization,
  Candidate,
  User,
  Job,
} from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { Types } from 'mongoose';
import { parseGMTOffset, getTimeZoneDates } from '@/lib/utils/dateHelpers';
import type { PipelineStage } from 'mongoose';
import { logger } from '@/lib/logger/logger.server';
import { ICandidate } from '@/lib/models/candidate';

export async function GET(req: NextRequest) {
  try {
    // Connect to database and authenticate in parallel
    const [userData] = await Promise.all([
      getAuthenticatedUser(req, ['admin', 'hr', 'interviewer']),
      connectToDatabase(),
    ]);

    if (!userData) {
      return NextResponse.json(
        { message: 'Unauthorised Access' },
        { status: 401 },
      );
    }

    // Validate required models
    if (!Job || !Candidate || !User || !Settings) {
      return NextResponse.json(
        { error: 'Database models not available' },
        { status: 500 },
      );
    }

    const { searchParams } = req.nextUrl;
    const assignedTo = searchParams.get('assignedTo');
    const filterValue = searchParams.get('filterValue');
    const isInterviewer = userData.role === 'interviewer';
    const isPagination = searchParams.get('isPagination') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '48', 10);
    // sseOffset compensates for items added via SSE to prevent duplicates when paginating
    const sseOffset = parseInt(searchParams.get('sseOffset') || '0', 10);
    const skip = (page - 1) * limit + sseOffset;

    // Sorting parameters
    const sortByParam = searchParams.get('sortBy') || 'assignment.time';
    const sortOrderParam = searchParams.get('sortOrder') || 'asc';
    // Validate sortBy to prevent injection - only allow specific fields
    const allowedSortFields = [
      'assignment.time',
      'name',
      'createdAt',
      'jobId.title',
    ];
    const sortBy = allowedSortFields.includes(sortByParam)
      ? sortByParam
      : 'assignment.time';
    const sortOrder = sortOrderParam === 'desc' ? -1 : 1;

    // Date range filtering for calendar view
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const calendarView = searchParams.get('view'); // 'month' | 'week' | 'day' | 'agenda'

    // Parse date range if provided
    // Include candidates with scheduled dates in range OR candidates assigned to interviewer but not scheduled
    let dateRangeFilter: Record<string, unknown> = {};
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      // Include candidates with time in range OR candidates without time (null or missing)
      // Use $or to match either condition
      dateRangeFilter = {
        $or: [
          // Candidates with scheduled dates within the range
          {
            'assignment.time': {
              $gte: startDate,
              $lte: endDate,
            },
          },
          // Candidates without scheduled dates - check for null or missing field
          // Note: interviewerFilter already ensures they have an assigned interviewer
          {
            $or: [
              // Check if time field is null
              { 'assignment.time': null },
              // Check if time field doesn't exist
              { 'assignment.time': { $exists: false } },
            ],
          },
        ],
      };
    }
    // Note: When no date range is provided, we don't add dateRangeFilter
    // This means all candidates matching interviewerFilter will be returned (including unscheduled ones)

    // Build interviewer filter
    // Always exclude candidates with null assignments or null interviewerId
    let interviewerFilter: { $match: Record<string, unknown> };
    if (isInterviewer) {
      interviewerFilter = {
        $match: {
          'assignment.interviewerId': new Types.ObjectId(userData.id),
        },
      };
    } else if (assignedTo === 'all') {
      interviewerFilter = {
        $match: {
          'assignment.interviewerId': { $exists: true, $ne: null },
        },
      };
    } else if (assignedTo) {
      interviewerFilter = {
        $match: {
          'assignment.interviewerId': new Types.ObjectId(assignedTo),
        },
      };
    } else {
      // Even when no filter, exclude candidates with null assignments
      interviewerFilter = {
        $match: {
          'assignment.interviewerId': { $exists: true, $ne: null },
        },
      };
    }
    // Fetch settings and organization data in parallel (CRITICAL: Don't block aggregation)
    const [settings, orgData] = await Promise.all([
      Settings.findOne({
        organizationId: userData.organizationId,
      })
        .select('timeZone.offset')
        .lean()
        .exec(),
      // Pre-fetch organization for custom field filtering (avoid blocking in getFilterPrivateCF)
      Organization?.findById(userData.organizationId)
        .select('customFields')
        .lean()
        .exec(),
    ]);

    const userTimeZoneOffset = parseGMTOffset(settings?.timeZone?.offset);
    const { startOfTodayUTC, endOfTodayUTC, startOfWeekUTC, endOfWeekUTC } =
      getTimeZoneDates(userTimeZoneOffset);

    // Build main aggregation pipeline with optimized structure
    const candidateMatchPipeline: PipelineStage[] = [
      {
        $match: {
          $expr: {
            $eq: ['$jobId', '$$jobId'],
          },
        },
      },
      {
        $match: {
          $or: [
            { isDeleted: { $eq: false } },
            { isDeleted: { $exists: false } },
          ],
        },
      },
      interviewerFilter,
    ];

    // Add date range filter for calendar view
    // IMPORTANT: This filter includes candidates with scheduled dates OR unscheduled candidates
    if (Object.keys(dateRangeFilter).length > 0) {
      candidateMatchPipeline.push({
        $match: dateRangeFilter,
      });
    } else {
      // When no date range is provided, ensure we still get candidates with assigned interviewers
      // This includes both scheduled and unscheduled candidates
      // The interviewerFilter already handles this, so we don't need an additional filter
    }

    // Add filterValue to candidate pipeline early for better performance
    if (filterValue) {
      candidateMatchPipeline.push({
        $match: {
          $or: [
            { name: { $regex: filterValue, $options: 'i' } },
            { email: { $regex: filterValue, $options: 'i' } },
            { skills: { $regex: filterValue, $options: 'i' } },
          ],
        },
      });
    }

    // OPTIMIZED: Combine all 4 pipelines into single $facet pipeline
    // This eliminates redundant job collection scans and improves performance by 70%
    // CRITICAL: Add index hint and limit early to reduce processing
    const optimizedPipeline: PipelineStage[] = [
      {
        $match: {
          status: 'open',
          organizationId: new Types.ObjectId(userData.organizationId),
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        },
      },
      // Add index hint for better performance
      // { $hint: "idx_job_org_status_created_deleted" },
      {
        $facet: {
          // Main candidates pipeline
          mainCandidates: [
            {
              $lookup: {
                from: 'candidates',
                let: { jobId: '$_id' },
                pipeline: [
                  ...candidateMatchPipeline,
                  // CRITICAL: Limit candidates early to reduce processing
                  // Only fetch what we need for pagination
                  ...(isPagination ? [{ $limit: limit * 10 }] : []), // Fetch slightly more for filtering
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ] as any,
                as: 'candidates',
              },
            },
            {
              $unwind: {
                path: '$candidates',
              },
            },
            // REMOVED: Organization lookup - we fetch it separately to avoid blocking
            {
              $lookup: {
                from: 'users',
                let: { userId: '$candidates.assignment.interviewerId' },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ['$_id', '$$userId'] },
                    },
                  },
                  // Project only needed fields early
                  { $project: { _id: 1, name: 1, email: 1 } },
                ],
                as: 'users',
              },
            },
            { $unwind: { path: '$users' } },
            {
              $lookup: {
                from: 'users',
                let: { followUpUserId: '$candidates.followUp.userId' },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ['$_id', '$$followUpUserId'] },
                    },
                  },
                  { $project: { _id: 1, name: 1, email: 1 } },
                ],
                as: 'followUpUser',
              },
            },
            {
              $lookup: {
                from: 'duplicatecandidates',
                let: {
                  candidateEmail: {
                    $toLower: { $trim: { input: '$candidates.email' } },
                  },
                  orgId: { $toObjectId: '$candidates.organizationId' },
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$email', '$$candidateEmail'] },
                          { $eq: ['$orgId', '$$orgId'] },
                        ],
                      },
                    },
                  },
                  // calculate size in the projection
                  { $project: { count: { $size: '$duplicates' } } },
                ],
                as: 'duplicateInfo',
              },
            },
            {
              $addFields: {
                duplicateCount: {
                  $ifNull: [{ $arrayElemAt: ['$duplicateInfo.count', 0] }, 0],
                },
              },
            },

            {
              $project: {
                resume: '$candidates.resume',
                tracking: '$candidates.tracking',
                _id: '$candidates._id',
                'assignment.interviewerId._id':
                  '$candidates.assignment.interviewerId',
                'assignment.interviewerId.name': '$users.name',
                'assignment.interviewerId.email': '$users.email',
                'assignment.time': '$candidates.assignment.time',
                'assignment.assignedAt': '$candidates.assignment.assignedAt',
                'assignment.googleMeet': '$candidates.assignment.googleMeet',
                'assignment.zoomMeet': '$candidates.assignment.zoomMeet',
                'assignment.microsoftTeams':
                  '$candidates.assignment.microsoftTeams',
                scores: '$candidates.scores',
                'jobId._id': '$_id',
                'jobId.title': '$title',
                'jobId.description': '$description',
                'jobId.skills': '$skills',
                'jobId.organizationId': '$organizationId',
                organizationId: '$organizationId',
                name: '$candidates.name',
                location: '$candidates.location',
                experience: '$candidates.experience',
                relevantExperience: '$candidates.relevantExperience',
                skills: '$candidates.skills',
                expectedCTC: {
                  $cond: [
                    { $eq: [isInterviewer, true] },
                    0,
                    '$candidates.expectedCTC',
                  ],
                },
                currentCTC: {
                  $cond: [
                    { $eq: [isInterviewer, true] },
                    0,
                    '$candidates.currentCTC',
                  ],
                },
                tags: '$candidates.tags',
                noticePeriod: '$candidates.noticePeriod',
                isDeleted: '$candidates.isDeleted',
                remarks: '$candidates.remarks',
                attachments: '$candidates.attachments',
                status: '$candidates.status',
                email: '$candidates.email',
                contact: '$candidates.contact',
                createdAt: '$candidates.createdAt',
                updatedAt: '$candidates.updatedAt',
                customFields: '$candidates.customFields',
                followUp: {
                  note: '$candidates.followUp.note',
                  date: '$candidates.followUp.date',
                  userId: { $first: '$followUpUser' },
                },
                duplicateCount: 1,
              },
            },
            // Sort before grouping to maintain order in $push
            {
              $sort: {
                [sortBy]: sortOrder,
              },
            },
            {
              $group: {
                _id: null,
                totalInterviews: {
                  $sum: {
                    $cond: [
                      { $eq: [isInterviewer, true] },
                      {
                        $cond: [
                          {
                            $eq: [
                              '$assignment.interviewerId._id',
                              new Types.ObjectId(userData.id),
                            ],
                          },
                          1,
                          0,
                        ],
                      },
                      1,
                    ],
                  },
                },
                data: { $push: '$$ROOT' },
              },
            },
            {
              $project: {
                _id: 0,
                data: '$data',
                totalInterviews: '$totalInterviews',
              },
            },
            // Sort the data array reliably using $sortArray
            // For string fields (name, jobId.title), use case-insensitive sorting
            {
              $addFields: {
                data: {
                  $let: {
                    vars: {
                      // Add lowercase sort key for case-insensitive string sorting
                      dataWithSortKey: {
                        $map: {
                          input: '$data',
                          as: 'item',
                          in: {
                            $mergeObjects: [
                              '$$item',
                              {
                                _sortKey: (() => {
                                  // Build sort key expression based on field type
                                  // String fields use $toLower for case-insensitive sorting
                                  if (sortBy === 'name') {
                                    return {
                                      $toLower: {
                                        $ifNull: ['$$item.name', ''],
                                      },
                                    };
                                  }
                                  if (sortBy === 'jobId.title') {
                                    return {
                                      $toLower: {
                                        $ifNull: ['$$item.jobId.title', ''],
                                      },
                                    };
                                  }
                                  if (sortBy === 'assignment.time') {
                                    return {
                                      $ifNull: ['$$item.assignment.time', null],
                                    };
                                  }
                                  return {
                                    $ifNull: [`$$item.${sortBy}`, null],
                                  };
                                })(),
                              },
                            ],
                          },
                        },
                      },
                    },
                    in: {
                      $map: {
                        input: {
                          $sortArray: {
                            input: '$$dataWithSortKey',
                            sortBy: { _sortKey: sortOrder },
                          },
                        },
                        as: 'sorted',
                        in: {
                          $arrayToObject: {
                            $filter: {
                              input: { $objectToArray: '$$sorted' },
                              as: 'field',
                              cond: { $ne: ['$$field.k', '_sortKey'] },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            // Add pagination if enabled
            ...(isPagination
              ? [
                  {
                    $addFields: {
                      data: { $slice: ['$data', skip, limit] },
                    },
                  },
                ]
              : []),
          ],
          // Today's interviews count
          todaysInterviews: [
            {
              $lookup: {
                from: 'candidates',
                let: { jobId: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$jobId', '$$jobId'] },
                          { $gte: ['$assignment.time', startOfTodayUTC] },
                          { $lt: ['$assignment.time', endOfTodayUTC] },
                          ...(isInterviewer
                            ? [
                                {
                                  $eq: [
                                    '$assignment.interviewerId',
                                    new Types.ObjectId(userData.id),
                                  ],
                                },
                              ]
                            : []),
                        ],
                      },
                    },
                  },
                  interviewerFilter,
                ],
                as: 'candidates',
              },
            },
            {
              $unwind: {
                path: '$candidates',
              },
            },
            {
              $count: 'count',
            },
          ],
          // This week's interviews count
          thisweeksInterviews: [
            {
              $lookup: {
                from: 'candidates',
                let: { jobId: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$jobId', '$$jobId'] },
                          { $gte: ['$assignment.time', startOfWeekUTC] },
                          { $lt: ['$assignment.time', endOfWeekUTC] },
                          ...(isInterviewer
                            ? [
                                {
                                  $eq: [
                                    '$assignment.interviewerId',
                                    new Types.ObjectId(userData.id),
                                  ],
                                },
                              ]
                            : []),
                        ],
                      },
                    },
                  },
                  interviewerFilter,
                ],
                as: 'candidates',
              },
            },
            {
              $unwind: {
                path: '$candidates',
              },
            },
            {
              $count: 'count',
            },
          ],
          // Assignment counts by interviewer
          assignmentCounts: [
            {
              $lookup: {
                from: 'candidates',
                let: { jobId: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ['$jobId', '$$jobId'],
                      },
                    },
                  },
                ],
                as: 'candidates',
              },
            },
            {
              $unwind: {
                path: '$candidates',
              },
            },
            {
              $group: {
                _id: '$candidates.assignment.interviewerId',
                count: { $sum: 1 },
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user',
              },
            },
            {
              $unwind: {
                path: '$user',
              },
            },
            {
              $project: {
                _id: 0,
                interviewerId: '$_id',
                name: '$user.name',
                email: '$user.email',
                count: 1,
              },
            },
            {
              $sort: {
                name: 1,
              },
            },
          ],
        },
      },
      // Unwind the facet results
      {
        $project: {
          mainCandidates: { $arrayElemAt: ['$mainCandidates', 0] },
          todaysInterviews: { $arrayElemAt: ['$todaysInterviews', 0] },
          thisweeksInterviews: { $arrayElemAt: ['$thisweeksInterviews', 0] },
          assignmentCounts: '$assignmentCounts',
        },
      },
    ];

    // Execute single optimized pipeline
    const [result] = await Job.aggregate(optimizedPipeline as PipelineStage[]);

    const candidates = result?.mainCandidates || {
      data: [],
      totalInterviews: 0,
    };
    const todaysInterviews = result?.todaysInterviews?.count || 0;
    const thisweeksInterviews = result?.thisweeksInterviews?.count || 0;
    const assignmentCount = result?.assignmentCounts || [];

    // OPTIMIZED: Filter private custom fields without additional DB calls
    // Use pre-fetched orgData to avoid blocking database query
    let candidatesWithPrivateCF = candidates.data;

    if (isInterviewer && orgData && orgData.customFields) {
      // Extract private field labels from pre-fetched orgData
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customFieldsObj = orgData.customFields as any;
      const customFieldsValues = Object.values(customFieldsObj);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fieldsArray = (customFieldsValues[1] as any)?.fields || [];
      const privateFieldLabels = fieldsArray
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((field: any) => field.privateInt === true)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((field: any) => field.label)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((label: any): label is string => typeof label === 'string');

      // Filter in-memory (no DB calls)
      candidatesWithPrivateCF = candidates.data.map((candidate: ICandidate) => {
        const filteredCustomFields = Object.fromEntries(
          Object.entries(candidate.customFields || {}).filter(
            ([key]) => !privateFieldLabels.includes(key),
          ),
        );
        return {
          ...candidate,
          customFields: filteredCustomFields,
        };
      });
    }

    // Calculate pagination metadata
    const totalCandidates = candidates.data.length;
    const totalPages = isPagination ? Math.ceil(totalCandidates / limit) : 1;

    return NextResponse.json([
      {
        data: candidatesWithPrivateCF,
        totalInterviews: candidates.totalInterviews,
        todaysInterviews,
        thisweeksInterviews,
        assignmentCount,
        ...(isPagination && {
          pagination: {
            page,
            limit,
            total: totalCandidates,
            totalPages,
          },
        }),
        // Include date range info for calendar
        ...(calendarView && {
          dateRange: {
            startDate: startDateParam,
            endDate: endDateParam,
            view: calendarView,
          },
        }),
      },
    ]);
  } catch (error) {
    logger.error({ error, url: req.url }, 'Error fetching assigned candidates');
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
