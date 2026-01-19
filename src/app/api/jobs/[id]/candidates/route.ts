import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Candidate } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { Types } from 'mongoose';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Resolve params and authenticate in parallel
    const [{ id }, userData] = await Promise.all([
      params,
      getAuthenticatedUser(_request, ['interviewer', 'admin', 'hr']),
    ]);

    // Handle authentication errors
    if (!userData) {
      return NextResponse.json(
        { message: 'Unauthorised Access' },
        { status: 401 },
      );
    }

    // Validate job ID
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    // Connect to database
    await connectToDatabase();

    if (!Candidate) {
      return NextResponse.json(
        { error: 'Database model not available' },
        { status: 500 },
      );
    }
    // Use aggregation to efficiently get candidates with remarksCount
    // Excludes large arrays (history, resume, attachments, remarks) to reduce payload size
    const jobObjectId = new Types.ObjectId(id);
    const candidates = await Candidate.aggregate([
      // Match candidates for this job
      { $match: { jobId: jobObjectId } },
      
      // Add remarksCount field
      {
        $addFields: {
          remarksCount: { $size: { $ifNull: ['$remarks', []] } },
        },
      },
      
      // Project fields (exclude large arrays)
      {
        $project: {
          history: 0,
          resume: 0,
          attachments: 0,
          remarks: 0, // Exclude full remarks array
          ...(userData?.role === 'interviewer'
            ? {
                currentCTC: 0,
                expectedCTC: 0,
                customFields: 0,
              }
            : {}),
        },
      },
      
      // Sort by createdAt
      { $sort: { 'tracking.createdAt': -1 } },
      
      // Lookup interviewer
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
      {
        $unwind: {
          path: '$interviewerData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          assignment: {
            $cond: {
              if: { $ne: ['$assignment', null] },
              then: {
                $mergeObjects: [
                  '$assignment',
                  { interviewerId: '$interviewerData' },
                ],
              },
              else: null,
            },
          },
        },
      },
      { $project: { interviewerData: 0 } },
      
      // Lookup followUp user
      {
        $lookup: {
          from: 'users',
          let: { followUpUserId: '$followUp.userId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$followUpUserId'] } } },
            { $project: { _id: 1, name: 1, email: 1 } },
          ],
          as: 'followUpUser',
        },
      },
      {
        $unwind: {
          path: '$followUpUser',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          'followUp.userId': '$followUpUser',
        },
      },
      { $project: { followUpUser: 0 } },
      
      // Lookup job
      {
        $lookup: {
          from: 'jobs',
          let: { jobId: '$jobId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$jobId'] } } },
            { $project: { _id: 1, title: 1, description: 1 } },
          ],
          as: 'jobData',
        },
      },
      {
        $unwind: {
          path: '$jobData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          jobId: '$jobData',
        },
      },
      { $project: { jobData: 0 } },
      
      // Add empty remarks array for compatibility
      {
        $addFields: {
          remarks: [],
        },
      },
    ]).exec();

    // SAFE OPTIMIZATION: Add cache header (doesn't change response structure)
    const response = NextResponse.json(candidates);
    response.headers.set('Cache-Control', 'private, max-age=10'); // 10s cache
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
