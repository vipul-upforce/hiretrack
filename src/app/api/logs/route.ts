import { NextRequest, NextResponse } from 'next/server';
import { PipelineStage } from 'mongoose';
import connectToDatabase, { History } from '@/lib/mongodb';
import { logger } from '@/lib/logger/logger.server';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const query = searchParams.get('query') || '';

    // Build search filter
    const searchFilter: PipelineStage.Match['$match'] = query
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

    // 1. REUSABLE LOOKUP BLOCKS (Strictly Typed)
    const lookupCandidate: PipelineStage[] = [
      {
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
      { $unwind: { path: '$candidateData', preserveNullAndEmptyArrays: true } },
    ];

    const lookupJob: PipelineStage[] = [
      {
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
      { $unwind: { path: '$jobData', preserveNullAndEmptyArrays: true } },
    ];

    // 2. BUILD BASE PIPELINE dynamically
    const pipeline: PipelineStage[] = [
      { $unwind: '$history' },
      {
        $match: {
          'history.dateTime': {
            $type: 'string',
            $regex: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.*Z$',
          },
        },
      },
      {
        $addFields: {
          'history.parsedDateTime': { $toDate: '$history.dateTime' },
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
    ];

    // If there is a text query, we MUST fetch Candidate/Job Data BEFORE sorting to filter it.
    if (query) {
      pipeline.push(...lookupCandidate);
      pipeline.push(...lookupJob);
      pipeline.push({ $match: searchFilter });
    }

    // 3. SORT DATA IN MEMORY (Footprint is now tiny)
    pipeline.push({ $sort: { 'history.parsedDateTime': -1 } });

    // 4. PREPARE THE PAGINATED LOGS (Only run expensive User lookups on 20 items!)
    const paginatedLogsPipeline: PipelineStage.FacetPipelineStage[] = [
      { $skip: offset },
      { $limit: limit },
    ];

    // If there was NO query, Candidate/Job lookups were skipped above. Run them NOW only on the paginated items.
    if (!query) {
      paginatedLogsPipeline.push(
        ...(lookupCandidate as PipelineStage.FacetPipelineStage[]),
      );
      paginatedLogsPipeline.push(
        ...(lookupJob as PipelineStage.FacetPipelineStage[]),
      );
    }

    // Always fetch Users AFTER pagination!
    const userFields = [
      'assignmentBy',
      'currentInterviewer',
      'previousInterviewer',
      'note.userId',
    ];

    userFields.forEach((field) => {
      const fieldPath =
        field === 'note.userId' ? '$history.note.userId' : `$history.${field}`;
      paginatedLogsPipeline.push({
        $lookup: {
          from: 'users',
          let: { userId: fieldPath },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
            { $project: { _id: 1, name: 1, email: 1, role: 1 } },
          ],
          as:
            field === 'note.userId'
              ? 'history.note.userId'
              : `history.${field}`,
        },
      });
    });

    // Final output projection
    paginatedLogsPipeline.push({
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
        attachments: '$history.attachments',
        assignmentBy: '$history.assignmentBy',
        remark: {
          id: '$history.remark.id',
          isPrivate: '$history.remark.isPrivate',
          date: '$history.remark.date',
          rating: '$history.remark.rating',
          userId: '$history.remark.userId',
          description: {
            $cond: {
              if: {
                $gt: [
                  {
                    $strLenCP: { $ifNull: ['$history.remark.description', ''] },
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
      },
    });

    // 5. INJECT PAGINATED PIPELINE INTO FACET
    pipeline.push({
      $facet: {
        totalCount: [{ $count: 'count' }],
        logs: paginatedLogsPipeline,
      },
    });

    if (!History) throw new Error('History model is not initialized.');

    // Execute typed aggregation and keep allowDiskUse for maximum safety net fallback
    const historyLogs = await History.aggregate(pipeline).allowDiskUse(true);

    const logs = historyLogs?.[0]?.logs ?? [];
    const totalCount = historyLogs?.[0]?.totalCount?.[0]?.count ?? 0;

    return NextResponse.json({
      logs,
      offset,
      totalLines: totalCount,
    });
  } catch (error) {
    logger.error({ error, url: request.url }, 'Error fetching history logs');
    return NextResponse.json(
      { error: 'Failed to fetch history logs.' },
      { status: 500 },
    );
  }
}
