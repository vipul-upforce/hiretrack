import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  Candidate,
  DuplicateCandidate,
  Job,
} from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import mongoose from 'mongoose';
import { logger } from '@/lib/logger/logger.server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const [{ id: candidateId }, userData] = await Promise.all([
      params,
      getAuthenticatedUser(request),
      connectToDatabase(),
    ]);

    if (!userData) {
      return NextResponse.json(
        { message: 'Unauthorised Access' },
        { status: 401 },
      );
    }

    const { organizationId } = userData;
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email || !organizationId || !candidateId) {
      return NextResponse.json(
        {
          error:
            'Missing required parameters: email, organizationId, candidateId',
        },
        { status: 400 },
      );
    }

    if (!DuplicateCandidate || !Candidate || !Job) {
      return NextResponse.json(
        { error: 'Database models not available' },
        { status: 500 },
      );
    }

    const duplicateData = await DuplicateCandidate.aggregate([
      {
        $match: {
          email: email.toLowerCase(),
          orgId: new mongoose.Types.ObjectId(organizationId),
        },
      },
      { $unwind: '$duplicates' },

      // Lookup Candidate details
      {
        $lookup: {
          from: 'candidates',
          localField: 'duplicates.candidateId',
          foreignField: '_id',
          as: 'candidateInfo',
        },
      },
      {
        $unwind: '$candidateInfo',
      },

      // Lookup Job details
      {
        $lookup: {
          from: 'jobs',
          localField: 'duplicates.jobId',
          foreignField: '_id',
          as: 'jobInfo',
        },
      },
      {
        $unwind: {
          path: '$jobInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          candidateId: '$candidateInfo._id',
          name: '$candidateInfo.name',
          email: '$candidateInfo.email',
          expectedCTC: '$candidateInfo.expectedCTC',
          currentCTC: '$candidateInfo.currentCTC',
          experience: '$candidateInfo.experience',
          relevantExperience: '$candidateInfo.relevantExperience',
          jobId: '$jobInfo._id',
          jobTitle: '$jobInfo.title',
          appliedDate: '$candidateInfo.tracking.createdAt',
          isDeleted: '$candidateInfo.isDeleted',
        },
      },
    ]).exec();

    return NextResponse.json(duplicateData);
  } catch (error) {
    logger.error(
      { error, url: request.url },
      'Error fetching duplicate candidates',
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
