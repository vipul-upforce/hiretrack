import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { History } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const query = searchParams.get('query') || '';

    // Build search filter
    const searchFilter = query
      ? {
        $or: [
          { 'history.title': { $regex: query, $options: 'i' } },
          { 'candidateData.name': { $regex: query, $options: 'i' } },
          { 'candidateData.email': { $regex: query, $options: 'i' } },
          { 'candidateData.skills': { $regex: query, $options: 'i' } },
          {
            'candidateData.remarks.description': {
              $regex: query,
              $options: 'i',
            },
          },
          { 'jobData.title': { $regex: query, $options: 'i' } },
        ],
      }
      : {};

    const historyLogs = await History?.aggregate([
      {
        // Unwind the history array
        $unwind: '$history',
      },
      {
        // Filter for valid ISO dateTime strings
        $match: {
          'history.dateTime': {
            $type: 'string',
            $regex: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.*Z$',
          },
        },
      },
      {
        // Convert valid ISO dateTime to Date
        $addFields: {
          'history.parsedDateTime': { $toDate: '$history.dateTime' },
        },
      },
      {
        // Add fields to handle candidateId conversion safely
        $addFields: {
          candidateObjectId: {
            $switch: {
              branches: [
                {
                  case: { $eq: [{ $type: '$candidateId' }, 'objectId'] },
                  then: '$candidateId',
                },
                {
                  case: { $eq: [{ $type: '$candidateId' }, 'string'] },
                  then: {
                    $cond: {
                      if: { $eq: [{ $strLenCP: '$candidateId' }, 24] },
                      then: { $toObjectId: '$candidateId' },
                      else: null,
                    },
                  },
                },
                {
                  case: {
                    $and: [
                      { $eq: [{ $type: '$candidateId' }, 'object'] },
                      { $ne: ['$candidateId._id', null] },
                    ],
                  },
                  then: {
                    $cond: {
                      if: { $eq: [{ $type: '$candidateId._id' }, 'objectId'] },
                      then: '$candidateId._id',
                      else: {
                        $cond: {
                          if: {
                            $and: [
                              {
                                $eq: [{ $type: '$candidateId._id' }, 'string'],
                              },
                              { $eq: [{ $strLenCP: '$candidateId._id' }, 24] },
                            ],
                          },
                          then: { $toObjectId: '$candidateId._id' },
                          else: null,
                        },
                      },
                    },
                  },
                },
              ],
              default: null,
            },
          },
        },
      },
      {
        // Add fields to handle jobId conversion safely
        $addFields: {
          jobObjectId: {
            $switch: {
              branches: [
                {
                  case: { $eq: [{ $type: '$jobId' }, 'objectId'] },
                  then: '$jobId',
                },
                {
                  case: { $eq: [{ $type: '$jobId' }, 'string'] },
                  then: {
                    $cond: {
                      if: { $eq: [{ $strLenCP: '$jobId' }, 24] },
                      then: { $toObjectId: '$jobId' },
                      else: null,
                    },
                  },
                },
                {
                  case: {
                    $and: [
                      { $eq: [{ $type: '$jobId' }, 'object'] },
                      { $ne: ['$jobId._id', null] },
                    ],
                  },
                  then: {
                    $cond: {
                      if: { $eq: [{ $type: '$jobId._id' }, 'objectId'] },
                      then: '$jobId._id',
                      else: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: [{ $type: '$jobId._id' }, 'string'] },
                              { $eq: [{ $strLenCP: '$jobId._id' }, 24] },
                            ],
                          },
                          then: { $toObjectId: '$jobId._id' },
                          else: null,
                        },
                      },
                    },
                  },
                },
              ],
              default: null,
            },
          },
        },
      },
      {
        // Lookup for candidateId - only essential fields
        $lookup: {
          from: 'candidates',
          let: { cid: '$candidateObjectId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $ne: ['$$cid', null] }, { $eq: ['$_id', '$$cid'] }],
                },
              },
            },
            {
              // Project only essential candidate fields to reduce document size
              $project: {
                _id: 1,
                name: 1,
                email: 1,
                location: 1,
                experience: 1,
                skills: {
                  $cond: {
                    if: { $isArray: '$skills' },
                    then: { $slice: ['$skills', 10] },
                    else: '$skills',
                  },
                },
                status: 1,
                expectedCTC: 1,
                currentCTC: 1,
                noticePeriod: 1,
                // Limit remarks to last 3 to reduce size
                remarks: {
                  $cond: {
                    if: { $isArray: '$remarks' },
                    then: {
                      $slice: [
                        {
                          $sortArray: {
                            input: '$remarks',
                            sortBy: { date: -1 },
                          },
                        },
                        3,
                      ],
                    },
                    else: '$remarks',
                  },
                },
                scores: {
                  overall: '$scores.overall',
                  experience: '$scores.experience',
                  skills: '$scores.skills',
                  recommendation: '$scores.recommendation',
                },
                resume: {
                  name: '$resume.name',
                  url: '$resume.url',
                  type: '$resume.type',
                },
              },
            },
          ],
          as: 'candidateData',
        },
      },
      {
        // Unwind candidateData
        $unwind: {
          path: '$candidateData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // Lookup for jobId - only essential fields
        $lookup: {
          from: 'jobs',
          let: { jid: '$jobObjectId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $ne: ['$$jid', null] }, { $eq: ['$_id', '$$jid'] }],
                },
              },
            },
            {
              // Project only essential job fields
              $project: {
                _id: 1,
                title: 1,
                description: {
                  $cond: {
                    if: { $gt: [{ $strLenCP: '$description' }, 200] },
                    then: {
                      $concat: [{ $substrCP: ['$description', 0, 197] }, '...'],
                    },
                    else: '$description',
                  },
                },
                skills: {
                  $cond: {
                    if: { $isArray: '$skills' },
                    then: { $slice: ['$skills', 10] },
                    else: '$skills',
                  },
                },
                experience: 1,
                status: 1,
                salary: 1,
                organizationId: 1,
              },
            },
          ],
          as: 'jobData',
        },
      },
      {
        // Unwind jobData
        $unwind: {
          path: '$jobData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // Lookup for assignmentBy - only essential fields
        $lookup: {
          from: 'users',
          let: { userId: '$history.assignmentBy' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$userId'] },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
                role: 1,
              },
            },
          ],
          as: 'history.assignmentBy',
        },
      },
      {
        // Lookup for currentInterviewer - only essential fields
        $lookup: {
          from: 'users',
          let: { userId: '$history.currentInterviewer' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$userId'] },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
                role: 1,
              },
            },
          ],
          as: 'history.currentInterviewer',
        },
      },
      {
        // Lookup for previousInterviewer - only essential fields
        $lookup: {
          from: 'users',
          let: { userId: '$history.previousInterviewer' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$userId'] },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
                role: 1,
              },
            },
          ],
          as: 'history.previousInterviewer',
        },
      },
      {
        // Lookup for note.userId - only essential fields
        $lookup: {
          from: 'users',
          let: { userId: '$history.note.userId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$userId'] },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
                role: 1,
              },
            },
          ],
          as: 'history.note.userId',
        },
      },
      {
        // Apply search filter
        $match: searchFilter,
      },
      {
        // Sort by parsedDateTime in descending order
        $sort: { 'history.parsedDateTime': -1 },
      },
      {
        // Remove temporary fields used for conversion
        $unset: ['candidateObjectId', 'jobObjectId', 'history.parsedDateTime'],
      },
      // {
      //   // Add field to limit attachment sizes
      //   $addFields: {
      //     "history.attachments": {
      //       $cond: {
      //         if: { $isArray: "$history.attachments" },
      //         then: { $slice: ["$history.attachments", 5] },
      //         else: "$history.attachments",
      //       },
      //     },
      //   },
      // },
      {
        // Use facet for pagination and counting
        $facet: {
          logs: [
            { $skip: offset },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                jobId: 1,
                jobData: 1,
                candidateData: 1,
                candidateId: 1,
                dateTime: '$history.dateTime',
                currentInterviewer: '$history.currentInterviewer',
                previousInterviewer: '$history.previousInterviewer',
                title: '$history.title',
                remark: {
                  id: '$history.remark.id',
                  isPrivate: '$history.remark.isPrivate',
                  description: {
                    $cond: {
                      if: {
                        $gt: [
                          {
                            $strLenCP: {
                              $ifNull: ['$history.remark.description', ''],
                            },
                          },
                          500,
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $substrCP: [
                              { $ifNull: ['$history.remark.description', ''] },
                              0,
                              497,
                            ],
                          },
                          '...',
                        ],
                      },
                      else: { $ifNull: ['$history.remark.description', ''] },
                    },
                  },
                  date: '$history.remark.date',
                  rating: '$history.remark.rating',
                  userId: '$history.remark.userId',
                },
                note: {
                  userId: '$history.note.userId',
                  description: {
                    $cond: {
                      if: { $isArray: '$history.note.description' },
                      then: { $slice: ['$history.note.description', 3] },
                      else: '$history.note.description',
                    },
                  },
                },
                attachments: '$history.attachments',
                assignmentBy: '$history.assignmentBy',
              },
            },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const logs = historyLogs[0].logs || [];
    const totalCount = historyLogs[0].totalCount[0]?.count || 0;

    return NextResponse.json({
      logs,
      offset,
      totalLines: totalCount,
    });
  } catch (error) {
    console.error('Error fetching history logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history logs.' },
      { status: 500 },
    );
  }
}
