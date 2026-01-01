import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Candidate } from '@/lib/mongodb';
import dayjs from 'dayjs';
import { CustomField } from '@/Custom_Fields/Types/CustomField';
import { logger } from '@/lib/logger/logger.server';
import { PipelineStage } from 'mongoose';
import {
  buildDateRangeCondition,
  buildTimeRangeCondition,
  getKeysType,
} from './util';

interface FilterRequestBody {
  page?: string;
  limit?: string;
  name?: string;
  skills?: string[];
  location?: string;
  minExpectedCTC?: string;
  maxExpectedCTC?: string;
  minCurrentCTC?: string;
  maxCurrentCTC?: string;
  minExperience?: string;
  maxExperience?: string;
  createdAfter?: string;
  createdBefore?: string;
  organizationId?: string;
  // customFields values can be strings, arrays of strings, dates, etc.
  customFields?: Record<string, unknown>;
  logicOperator?: '$or' | '$and';
}

// MongoDB Query Object structure
interface MongoQuery extends Record<string, unknown> {
  $or?: Record<string, unknown>[];
  $and?: Record<string, unknown>[];
}

// Define the structure of the Aggregation Result
interface AggregationResult {
  paginatedData: Record<string, unknown>[];
  totalCount: { count: number }[];
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = (await request.json()) as FilterRequestBody;

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
    const limit = parseInt(
      request.nextUrl.searchParams.get('limit') || '20',
      10,
    );
    const skip = (page - 1) * limit;

    const {
      name,
      skills,
      location,
      minExpectedCTC,
      maxExpectedCTC,
      minCurrentCTC,
      maxCurrentCTC,
      minExperience,
      maxExperience,
      createdAfter,
      createdBefore,
      organizationId,
      customFields,
      logicOperator = '$or',
    } = body;

    const query: MongoQuery = { [logicOperator]: [] };

    const addLogicCondition = (condition: Record<string, unknown>) => {
      const operatorArray = query[logicOperator];
      if (Array.isArray(operatorArray)) {
        operatorArray.push(condition);
      } else {
        query[logicOperator] = [condition];
      }
    };

    if (organizationId) {
      if (!query.$and) query.$and = [];
      query.$and.push({ organizationId });
    } else {
      return NextResponse.json({ error: 'Please Add OrgID' }, { status: 500 });
    }

    if (name) {
      addLogicCondition({
        name: {
          $regex: name.trim(),
          $options: 'i',
        },
      });
    }

    if (skills && Array.isArray(skills) && skills.length > 0) {
      const skillsConditions = skills.map((skill: string) => ({
        skills: {
          $regex: skill.trim(),
          $options: 'i',
        },
      }));
      addLogicCondition({ $or: skillsConditions });
    }

    if (location) {
      addLogicCondition({
        location: {
          $regex: location.trim(),
          $options: 'i',
        },
      });
    }

    // Handle CTC ranges
    if (minExpectedCTC || maxExpectedCTC) {
      const expectedCTCQuery: { $gte?: number; $lte?: number } = {};
      if (minExpectedCTC) expectedCTCQuery.$gte = parseFloat(minExpectedCTC);
      if (maxExpectedCTC) expectedCTCQuery.$lte = parseFloat(maxExpectedCTC);
      addLogicCondition({ expectedCTC: expectedCTCQuery });
    }

    if (minCurrentCTC || maxCurrentCTC) {
      const currentCTCQuery: { $gte?: number; $lte?: number } = {};
      if (minCurrentCTC) currentCTCQuery.$gte = parseFloat(minCurrentCTC);
      if (maxCurrentCTC) currentCTCQuery.$lte = parseFloat(maxCurrentCTC);
      addLogicCondition({ currentCTC: currentCTCQuery });
    }

    if (minExperience || maxExperience) {
      const experienceQuery: { $gte?: number; $lte?: number } = {};
      if (minExperience) experienceQuery.$gte = parseFloat(minExperience);
      if (maxExperience) experienceQuery.$lte = parseFloat(maxExperience);
      addLogicCondition({ experience: experienceQuery });
    }

    if (createdAfter || createdBefore) {
      const dateQuery: { $gte?: Date; $lte?: Date } = {};
      if (createdAfter) dateQuery.$gte = new Date(createdAfter);
      if (createdBefore) dateQuery.$lte = new Date(createdBefore);
      addLogicCondition({ 'tracking.createdAt': dateQuery });
    }

    if (customFields && typeof customFields === 'object') {
      
      const types: CustomField[] = (await getKeysType(organizationId)) || [];

      Object.entries(customFields).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }

        const fieldPath = `customFields.${key}`;
        const matchedType = types.find(
          (type: CustomField) => type.label === key,
        );
        const fieldType = matchedType?.type;

        if (Array.isArray(value)) {
          const arrayValue = value as unknown[];

          if (fieldType && (fieldType === 'date' || fieldType === 'datetime')) {
            const dateCondition = buildDateRangeCondition(
              fieldPath,
              arrayValue,
              fieldType,
            );

            if (dateCondition) {
              addLogicCondition(dateCondition);
            }
            return;
          }

          if (fieldType === 'time') {
            const timeCondition = buildTimeRangeCondition(
              fieldPath,
              arrayValue,
            );
            if (timeCondition) {
              addLogicCondition(timeCondition);
            }
            return;
          }

          // Fallback date check
          if (
            !fieldType &&
            arrayValue.some((entry) =>
              dayjs(entry as string | number | Date | undefined).isValid(),
            )
          ) {
            const fallbackCondition = buildDateRangeCondition(
              fieldPath,
              arrayValue,
              'datetime',
            );
            if (fallbackCondition) {
              addLogicCondition(fallbackCondition);
            }
            return;
          }

          if (arrayValue.length > 0) {
            const regexArray = arrayValue
              .filter(
                (v): v is string => typeof v === 'string' && v.trim() !== '',
              )
              .map((v) => new RegExp(v, 'i'));

            if (regexArray.length > 0) {
              addLogicCondition({
                [fieldPath]: {
                  $in: regexArray,
                },
              });
            }
          }
        }
        // Handle direct string matches
        else if (typeof value === 'string' && value.trim() !== '') {
          addLogicCondition({
            [fieldPath]: {
              $regex: value,
              $options: 'i',
            },
          });
        }
      });
    }

    if (!Candidate) {
      throw new Error('Candidate model is not available');
    }

    // Clean up empty logic operator array
    const logicOpArray = query[logicOperator];
    if (Array.isArray(logicOpArray) && logicOpArray.length === 0) {
      delete query[logicOperator];
    }

    const candidatesResult = await Candidate.aggregate<AggregationResult>([
      { $match: query } as PipelineStage,
      { $sort: { 'tracking.createdAt': -1 } },

      // $facet to run two pipelines: paginated data and total count
      {
        $facet: {
          paginatedData: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: 'users',
                localField: 'remarks.userId',
                foreignField: '_id',
                as: 'remarksUser',
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: 'assignment.interviewerId',
                foreignField: '_id',
                as: 'interviewer',
              },
            },
            {
              $unwind: {
                path: '$interviewer',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: 'jobs',
                localField: 'jobId',
                foreignField: '_id',
                as: 'job',
              },
            },
            {
              $unwind: {
                path: '$job',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: 'histories',
                let: {
                  jobId: { $toString: '$jobId' },
                  candidateId: { $toString: '$_id' },
                },
                pipeline: [
                  {
                    $unwind: '$history',
                  },
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: [{ $toString: '$jobId' }, '$$jobId'] },
                          {
                            $eq: [
                              { $toString: '$candidateId' },
                              '$$candidateId',
                            ],
                          },
                        ],
                      },
                    },
                  },
                  { $unwind: '$history' },
                  {
                    $lookup: {
                      from: 'users',
                      localField: 'history.assignmentBy',
                      foreignField: '_id',
                      as: 'history.assignmentBy',
                    },
                  },
                  {
                    $unwind: {
                      path: '$history.assignmentBy',
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $lookup: {
                      from: 'users',
                      localField: 'history.currentInterviewer',
                      foreignField: '_id',
                      as: 'history.currentInterviewer',
                    },
                  },
                  {
                    $unwind: {
                      path: '$history.currentInterviewer',
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $lookup: {
                      from: 'users',
                      localField: 'history.previousInterviewer',
                      foreignField: '_id',
                      as: 'history.previousInterviewer',
                    },
                  },
                  {
                    $unwind: {
                      path: '$history.previousInterviewer',
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $unwind: {
                      path: '$history.note',
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $lookup: {
                      from: 'users',
                      localField: 'history.note.userId',
                      foreignField: '_id',
                      as: 'history.note.userId',
                    },
                  },
                  {
                    $unwind: {
                      path: '$history.note.userId',
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $group: {
                      _id: '$_id',
                      jobId: { $first: '$jobId' },
                      candidateId: { $first: '$candidateId' },
                      history: { $push: '$history' },
                    },
                  },
                ],
                as: 'history',
              },
            },
            {
              $project: {
                _id: 1,
                jobId: '$job',
                organizationId: 1,
                name: 1,
                location: 1,
                experience: 1,
                skills: 1,
                email: 1,
                resume: 1,
                scores: 1,
                status: 1,
                createdAt: 1,
                updatedAt: 1,
                remarksUser: 1,
                attachments: 1,
                contact: 1,
                currentCTC: 1,
                expectedCTC: 1,
                customFields: 1,
                tracking: 1,
                isDeleted: 1,
                history: { $arrayElemAt: ['$history.history', 0] },
                assignment: {
                  $mergeObjects: [
                    '$assignment',
                    {
                      interviewerId: {
                        $cond: {
                          if: { $gt: ['$interviewer._id', null] },
                          then: {
                            _id: '$interviewer._id',
                            name: '$interviewer.name',
                            email: '$interviewer.email',
                          },
                          else: null,
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const paginatedData = candidatesResult[0]?.paginatedData || [];
    const totalCount = candidatesResult[0]?.totalCount[0]?.count || 0;

    return NextResponse.json({
      candidates: paginatedData,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    logger.error({ error, url: request.url }, 'Error in candidate filtering.');

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
