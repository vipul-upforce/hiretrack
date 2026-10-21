import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Candidate, Lane } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { Types, FilterQuery } from 'mongoose';
import { filterSensitiveRedFlagsForInterviewerList } from '@/lib/filterSensitiveRedFlags';

/**
 * Resolve a lane display name to Lane ObjectId(s) for status filtering.
 * Tries job-specific lanes first, then organization-level lanes.
 */
async function resolveLaneIdsByName(
  laneName: string,
  jobObjectId: Types.ObjectId,
  organizationId: string,
): Promise<Types.ObjectId[]> {
  if (!Lane) return [];

  let laneDocuments = await Lane.find({
    name: laneName,
    organizationId,
    jobId: jobObjectId,
    isActive: true,
  })
    .select('_id')
    .lean()
    .exec();

  if (laneDocuments.length === 0) {
    laneDocuments = await Lane.find({
      name: laneName,
      organizationId,
      jobId: null,
      isActive: true,
    })
      .select('_id')
      .lean()
      .exec();
  }

  return laneDocuments.map((lane) => lane._id as Types.ObjectId);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const [{ id }, userData] = await Promise.all([
      params,
      getAuthenticatedUser(_request, ['interviewer', 'admin', 'hr']),
    ]);

      if (!userData) {
      return NextResponse.json({ message: 'Unauthorised Access' }, { status: 401 });
    }

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(_request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const searchQuery = searchParams.get('search') || '';
    const logicalOperator = searchParams.get('logicalOperator') || 'AND';
    const status = searchParams.get('status');
    const isArchivedParam = searchParams.get('isArchived'); // Keep as string for checking existence

    // Sorting & Kanban filters
    const sortBy = searchParams.get('sortBy') || 'tracking.createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    const topCandidates = searchParams.get('topCandidates') === 'true';
    const appliedThisWeek = searchParams.get('appliedThisWeek') === 'true';
    const appliedToday = searchParams.get('appliedToday') === 'true';
    const appliedIn15Days = searchParams.get('appliedIn15Days') === 'true';
    const toFollowUp = searchParams.get('toFollowUp') === 'true';
    const assigned = searchParams.get('assigned') === 'true';
    const notAssigned = searchParams.get('notAssigned') === 'true';
    const withRemarks = searchParams.get('withRemarks') === 'true';
    const withoutRemarks = searchParams.get('withoutRemarks') === 'true';

    const jobObjectId = new Types.ObjectId(id);
    const organizationId = userData?.organizationId;

    // Base filters: scoped to job and archive status
    const baseFilters: FilterQuery<any>[] = [
      { jobId: jobObjectId }
    ];

    if (isArchivedParam === 'true') {
      // Explicit archived filter: only candidates explicitly marked as deleted
      baseFilters.push({
        $and: [{ isDeleted: true }, { isDeleted: { $exists: true } }],
      });
    } else {
      // DEFAULT CASE (including false or missing): show non-archived + legacy records
      baseFilters.push({
        $or: [
          { isDeleted: false },
          { isDeleted: { $exists: false } },
        ],
      });
    }

    const dynamicFilters: FilterQuery<any>[] = [];

    // Search filter
    if (searchQuery) {
      dynamicFilters.push({
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { email: { $regex: searchQuery, $options: 'i' } },
          { location: { $regex: searchQuery, $options: 'i' } },
          { skills: { $regex: searchQuery, $options: 'i' } }
        ]
      });
    }

    if (status && status !== 'all' && organizationId) {
      const laneIds = await resolveLaneIdsByName(
        status,
        jobObjectId,
        organizationId,
      );
      dynamicFilters.push({
        status: laneIds.length > 0 ? { $in: laneIds } : { $in: [] },
      });
    }

    if (topCandidates) {
      dynamicFilters.push({ 'scores.overall': { $gte: 7 } });
    }

    if (appliedToday) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dynamicFilters.push({ 'tracking.createdAt': { $gte: today } }); 
    }

    if (appliedThisWeek) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dynamicFilters.push({ 'tracking.createdAt': { $gte: weekAgo } });
    }

    if (appliedIn15Days) {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      dynamicFilters.push({ 'tracking.createdAt': { $gte: fifteenDaysAgo } });
    }

    if (toFollowUp) {
      dynamicFilters.push({ 'followUp.note': { $exists: true, $ne: null } });
    }

    if (assigned) {
      dynamicFilters.push({ 'assignment.interviewerId': { $exists: true, $ne: null } });
    } else if (notAssigned) {
      dynamicFilters.push({ $or: [{ assignment: null }, { 'assignment.interviewerId': null }] });
    }

    if (withRemarks) {
      dynamicFilters.push({ remarks: { $exists: true, $not: { $size: 0 } } });
    } else if (withoutRemarks) {
      dynamicFilters.push({ $or: [{ remarks: { $exists: false } }, { remarks: { $size: 0 } }] });
    }

    // Combine filters
    let finalMatch: FilterQuery<any>;
    if (dynamicFilters.length > 0) {
      if (logicalOperator === 'OR') {
        finalMatch = { $and: baseFilters, $or: dynamicFilters };
      } else {
        finalMatch = { $and: [...baseFilters, ...dynamicFilters] };
      }
    } else {
      finalMatch = { $and: baseFilters };
    }

    const sortField = sortBy === 'dateTime' ? 'tracking.createdAt' : sortBy;
    const followUpMissingHigh = new Date('9999-12-31T00:00:00.000Z');
    // For desc sorts, use an old-but-safe timestamp so missing followUps go last.
    const followUpMissingLow = new Date('1970-01-01T00:00:00.000Z');
    const followUpSortField =
      sortField === 'followUp.date' ? 'followUpSortDate' : sortField;
    const sortObject = { [followUpSortField]: sortOrder };

    // Aggregation Pipeline
    const pipeline: any[] = [
      { $match: finalMatch },
      { $addFields: { remarksCount: { $size: { $ifNull: ['$remarks', []] } } } },
      ...(sortField === 'followUp.date'
        ? [
            {
              $addFields: {
                // Always push null/undefined followUps to the bottom, for both asc/desc sorts.
                followUpSortDate: {
                  $ifNull: [
                    '$followUp.date',
                    sortOrder === 1 ? followUpMissingHigh : followUpMissingLow,
                  ],
                },
              },
            },
          ]
        : []),

      // Duplicate lookup, project, interviewer lookup, sort, facet...
      {
        $lookup: {
          from: 'duplicatecandidates',
          let: {
            candidateEmail: { $toLower: { $trim: { input: '$email' } } },
            orgId: { $toObjectId: organizationId },
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
      { $addFields: { duplicateCount: { $ifNull: [{ $arrayElemAt: ['$duplicateInfo.count', 0] }, 0] } } },
      {
        $project: {
          history: 0,
          remarks: 0,
          duplicateInfo: 0,
          ...(userData?.role === 'interviewer' ? { currentCTC: 0, expectedCTC: 0, customFields: 0 } : {}),
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { interviewerId: '$assignment.interviewerId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$interviewerId'] } } },
            { $project: { _id: 1, name: 1, email: 1 } },
          ],
          as: 'interviewerData',
        },
      },
      { $unwind: { path: '$interviewerData', preserveNullAndEmptyArrays: true } },
      { $addFields: { 'assignment.interviewerId': '$interviewerData' } },
      { $project: { interviewerData: 0 } },
      {
        $lookup: {
          from: 'lanes',
          localField: 'status',
          foreignField: '_id',
          pipeline: [{ $project: { _id: 0, name: 1 } }],
          as: 'statusData',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'followUp.userId',
          foreignField: '_id',
          pipeline: [{ $project: { _id: 1, name: 1, email: 1 } }],
          as: 'followUpUser',
        },
      },
      {
        $addFields: {
          followUp: {
            $cond: [
              { $ifNull: ['$followUp', false] },
              {
                $mergeObjects: [
                  '$followUp',
                  { userId: { $first: '$followUpUser' } },
                ],
              },
              '$followUp',
            ],
          },
          status: {
            $let: {
              vars: { statusObj: { $first: '$statusData' } },
              in: {
                $cond: [
                  { $ifNull: ['$$statusObj', false] },
                  '$$statusObj.name',
                  null,
                ],
              },
            },
          },
        },
      },
      { $project: { statusData: 0, followUpUser: 0 } },
      { $sort: sortObject },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: skip }, { $limit: limit }]
        }
      }
    ];

    if (!Candidate) {
      return NextResponse.json(
        { error: 'Candidate model not available' },
        { status: 500 },
      );
    }

    const result = await Candidate.aggregate(pipeline).exec();

    const total = result[0]?.metadata[0]?.total || 0;
    const candidates = result[0]?.data || [];

    const filteredCandidates = filterSensitiveRedFlagsForInterviewerList(candidates, userData?.role);

    return NextResponse.json({
      candidates: filteredCandidates,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error(' API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
