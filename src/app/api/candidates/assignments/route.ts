import { NextResponse, NextRequest } from 'next/server';
import connectToDatabase, {
  Settings,
  Organization,
  Candidate,
  User,
  Job,
} from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { Types, PipelineStage } from 'mongoose';
import { parseGMTOffset, getTimeZoneDates } from '@/lib/utils/dateHelpers';
import { logger } from '@/lib/logger/logger.server';
import { ICandidate } from '@/lib/models/candidate';
import { filterSensitiveRedFlagsForInterviewerList } from '@/lib/filterSensitiveRedFlags';

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
    const sseOffset = parseInt(searchParams.get('sseOffset') || '0', 10);
    const skip = (page - 1) * limit + sseOffset;

    // Sorting parameters
    const sortByParam = searchParams.get('sortBy') || 'assignment.time';
    const sortOrderParam = searchParams.get('sortOrder') || 'asc';
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

    // Date range filtering
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const calendarView = searchParams.get('view');

    // Parse date range if provided
    let dateRangeFilter: Record<string, unknown> = {};
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      dateRangeFilter = {
        $or: [
          {
            'assignment.time': {
              $gte: startDate,
              $lte: endDate,
            },
          },
          {
            $or: [
              { 'assignment.time': null },
              { 'assignment.time': { $exists: false } },
            ],
          },
        ],
      };
    }

    // Build interviewer filter
    let interviewerFilter: PipelineStage.Match;

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
      interviewerFilter = {
        $match: {
          'assignment.interviewerId': { $exists: true, $ne: null },
        },
      };
    }

    // Fetch settings and organization data
    const [settings, orgData] = await Promise.all([
      Settings.findOne({
        organizationId: userData.organizationId,
      })
        .select('timeZone.offset')
        .lean()
        .exec(),
      Organization?.findById(userData.organizationId)
        .select('customFields')
        .lean()
        .exec(),
    ]);

    const userTimeZoneOffset = parseGMTOffset(settings?.timeZone?.offset);
    const { startOfTodayUTC, endOfTodayUTC, startOfWeekUTC, endOfWeekUTC } =
      getTimeZoneDates(userTimeZoneOffset);

    // Strictly type as Match[]
    const searchMatchStage: PipelineStage.Match[] = filterValue
      ? [
          {
            $match: {
              $or: [
                { name: { $regex: filterValue, $options: 'i' } },
                { email: { $regex: filterValue, $options: 'i' } },
                { skills: { $regex: filterValue, $options: 'i' } },
              ],
            },
          },
        ]
      : [];

    // Strictly type as Match[]
    const baseMatchStages: PipelineStage.Match[] = [
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

    if (Object.keys(dateRangeFilter).length > 0) {
      baseMatchStages.push({
        $match: dateRangeFilter,
      });
    }

    if (searchMatchStage.length > 0) {
      baseMatchStages.push(...searchMatchStage);
    }

    // Define helper type for the $lookup pipeline
    type LookupPipeline = (PipelineStage.Match | PipelineStage.Limit)[];

    const optimizedPipeline: PipelineStage[] = [
      {
        $match: {
          status: 'open',
          organizationId: new Types.ObjectId(userData.organizationId),
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        },
      },
      {
        $facet: {
          // 1. Main Data Pipeline
          mainCandidates: [
            {
              $lookup: {
                from: 'candidates',
                let: { jobId: '$_id' },
                pipeline: [
                  ...baseMatchStages,
                  ...(isPagination
                    ? ([{ $limit: limit * 10 }] as PipelineStage.Limit[])
                    : []),
                ] as LookupPipeline,
                as: 'candidates',
              },
            },
            {
              $unwind: {
                path: '$candidates',
              },
            },
            // Lookup User Details
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
                  { $project: { _id: 1, name: 1, email: 1 } },
                ],
                as: 'users',
              },
            },
            { $unwind: { path: '$users' } },
            // Lookup FollowUp User
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
            // Lookup Duplicate Info
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
            // Projection
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
            {
              $sort: {
                [sortBy]: sortOrder,
              },
            },
            {
              $group: {
                _id: null,
                data: { $push: '$$ROOT' },
              },
            },
            {
              $project: {
                _id: 0,
                data: '$data',
              },
            },
            // Complex sorting
            {
              $addFields: {
                data: {
                  $let: {
                    vars: {
                      dataWithSortKey: {
                        $map: {
                          input: '$data',
                          as: 'item',
                          in: {
                            $mergeObjects: [
                              '$$item',
                              {
                                _sortKey: (() => {
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
            ...(isPagination
              ? ([
                  {
                    $addFields: {
                      data: { $slice: ['$data', skip, limit] },
                    },
                  },
                  // ✅ FIX: Use strictly valid type here
                ] as PipelineStage.AddFields[])
              : []),
          ],
          // 2. Total Count Pipeline
          totalCount: [
            {
              $lookup: {
                from: 'candidates',
                let: { jobId: '$_id' },
                pipeline: [...baseMatchStages] as PipelineStage.Match[],
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
          // 3. Today's interviews count
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
                        ],
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
                  ...searchMatchStage,
                ] as PipelineStage.Match[],
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
          // 4. This week's interviews count
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
                        ],
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
                  ...searchMatchStage,
                ] as PipelineStage.Match[],
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
          // 5. Assignment counts
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
          totalCount: {
            $ifNull: [{ $arrayElemAt: ['$totalCount.count', 0] }, 0],
          },
          todaysInterviews: { $arrayElemAt: ['$todaysInterviews', 0] },
          thisweeksInterviews: { $arrayElemAt: ['$thisweeksInterviews', 0] },
          assignmentCounts: '$assignmentCounts',
        },
      },
    ];

    // Execute single optimized pipeline
    const [result] = await Job.aggregate(optimizedPipeline);

    const candidates = result?.mainCandidates || {
      data: [],
    };

    const totalInterviews = result?.totalCount || 0;
    const todaysInterviews = result?.todaysInterviews?.count || 0;
    const thisweeksInterviews = result?.thisweeksInterviews?.count || 0;
    const assignmentCount = result?.assignmentCounts || [];

    // Filter private custom fields
    let candidatesWithPrivateCF = candidates.data || [];

    if (isInterviewer && orgData && orgData.customFields) {
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

      candidatesWithPrivateCF = candidatesWithPrivateCF.map(
        (candidate: ICandidate) => {
          const filteredCustomFields = Object.fromEntries(
            Object.entries(candidate.customFields || {}).filter(
              ([key]) => !privateFieldLabels.includes(key),
            ),
          );
          return {
            ...candidate,
            customFields: filteredCustomFields,
          };
        },
      );
    }

    const candidatesWithFilteredRedFlags =
      filterSensitiveRedFlagsForInterviewerList(
        candidatesWithPrivateCF,
        userData.role,
      );

    const totalPages = isPagination ? Math.ceil(totalInterviews / limit) : 1;

    return NextResponse.json([
      {
        data: candidatesWithFilteredRedFlags,
        totalInterviews,
        todaysInterviews,
        thisweeksInterviews,
        assignmentCount,
        ...(isPagination && {
          pagination: {
            page,
            limit,
            total: totalInterviews,
            totalPages,
          },
        }),
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
