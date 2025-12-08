import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Job, Candidate } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const [userData, { id }, { status }] = await Promise.all([
      getAuthenticatedUser(request),
      params,
      request.json(),
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json(
        { message: 'Unauthorised Access' },
        { status: 401 },
      );
    }

    if (!Candidate || !Job) {
      return NextResponse.json({ error: 'Models not found' }, { status: 400 });
    }

    // Get current candidate data to access old status and job info
    const currentCandidate = await Candidate.findById(id).populate(
      'jobId',
      'title',
    );
    if (!currentCandidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      id,
      {
        status,
        'tracking.updatedAt': new Date(),
      },
      { new: true },
    ).populate('jobId', 'title');

    if (!updatedCandidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(updatedCandidate);
  } catch (error: unknown) {
    logger.error(
      { error, url: request.url },
      'Error updating candidate status',
    );
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: 'Unknown error occurred' },
      { status: 500 },
    );
  }
}
