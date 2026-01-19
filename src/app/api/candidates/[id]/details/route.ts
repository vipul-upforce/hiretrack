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

    // Validate candidate ID
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid candidate ID' },
        { status: 400 },
      );
    }

    // Ensure database connection is established and models are registered
    await connectToDatabase();

    if (!Candidate) {
      return NextResponse.json(
        { error: 'Database model not available' },
        { status: 500 },
      );
    }

    const candidateObjectId = new Types.ObjectId(id);

    // Fetch only attachments, resume, and remarks with populated userId
    const candidate = await Candidate.aggregate([
      { $match: { _id: candidateObjectId } },
      
      // Project only the fields we need
      {
        $project: {
          _id: 1,
          resume: 1,
          attachments: 1,
          remarks: {
            $cond: {
              if: { $eq: [{ $type: '$remarks' }, 'array'] },
              then: '$remarks',
              else: [],
            },
          },
        },
      },
      
      // Lookup remark users
      {
        $lookup: {
          from: 'users',
          let: {
            remarkUserIds: {
              $cond: {
                if: { $gt: [{ $size: '$remarks' }, 0] },
                then: { $map: { input: '$remarks', as: 'r', in: '$$r.userId' } },
                else: [],
              },
            },
          },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$_id', '$$remarkUserIds'] },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
              },
            },
          ],
          as: 'remarkUsers',
        },
      },
      
      // Map remarks with populated userId
      {
        $addFields: {
          remarks: {
            $map: {
              input: '$remarks',
              as: 'remark',
              in: {
                $mergeObjects: [
                  '$$remark',
                  {
                    userId: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$remarkUsers',
                            as: 'user',
                            cond: { $eq: ['$$user._id', '$$remark.userId'] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },
      
      { $project: { remarkUsers: 0 } },
    ]).exec();

    if (!candidate || candidate.length === 0) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    const candidateData = candidate[0];

    return NextResponse.json({
      _id: candidateData._id,
      resume: candidateData.resume || null,
      attachments: candidateData.attachments || [],
      remarks: candidateData.remarks || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
