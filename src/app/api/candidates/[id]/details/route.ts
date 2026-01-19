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

    // Fetch candidate exactly like the main GET route - no select(), just populate remarks
    const candidate = await Candidate.findById(candidateObjectId)
      .populate({
        path: 'remarks.userId',
        select: '_id name email',
      })
      .lean()
      .exec();

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    // Return the fields - if they're null/empty in DB, that's what we'll return
    // The debug info will help identify if this is a data issue or query issue
    return NextResponse.json({
      _id: candidate._id,
      resume: candidate.resume || null,
      attachments: candidate.attachments || [],
      remarks: candidate.remarks || [],
      // Debug info to help diagnose
      ...(process.env.NODE_ENV === 'development' && {
        _debug: {
          resumeExists: candidate.resume !== null && candidate.resume !== undefined,
          resumeValue: candidate.resume,
          attachmentsCount: candidate.attachments?.length || 0,
          attachmentsValue: candidate.attachments,
          remarksCount: candidate.remarks?.length || 0,
          remarksValue: candidate.remarks,
        },
      }),
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
