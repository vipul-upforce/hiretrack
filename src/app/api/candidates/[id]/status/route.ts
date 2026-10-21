import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Job, Candidate, Lane } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';
import { getLaneIdByName } from '@/lib/services/laneService';
import { broadcastCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';

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
    const currentCandidate = await Candidate.findById(id).populate([
      {
        path: 'jobId',
        select: 'title',
      },
      {
        path: 'status',
        select: 'name',
      },
    ]);
    if (!currentCandidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    // Capture previous status for SSE broadcast
    let previousStatus: string | undefined;
    if (currentCandidate.status) {
      if (typeof currentCandidate.status === 'string') {
        // If it's already a string (lane name), use it directly
        previousStatus = currentCandidate.status.toLowerCase();
      } else if (
        typeof currentCandidate.status === 'object' &&
        currentCandidate.status !== null &&
        'name' in currentCandidate.status
      ) {
        // If it's populated, use the name
        previousStatus = String(
          (currentCandidate.status as { name?: string }).name ?? '',
        ).toLowerCase();
      } else if (Lane && typeof currentCandidate.status === 'object') {
        // If it's an ObjectId, fetch the lane name
        const previousLane = await Lane.findById(currentCandidate.status)
          .select('name')
          .lean();
        if (previousLane?.name) {
          previousStatus = previousLane.name.toLowerCase();
        }
      }
    }

    // Convert lane name to ObjectId if status is a string (lane name)
    let statusObjectId = status;
    if (typeof status === 'string' && !status.match(/^[0-9a-fA-F]{24}$/)) {
      // It's a lane name, not an ObjectId - convert it
      const jobId = currentCandidate.jobId
        ? (currentCandidate.jobId as { _id: unknown })._id
        : null;
      const { organizationId } = userData;

      if (!organizationId) {
        return NextResponse.json(
          { error: 'Organization ID not found' },
          { status: 400 },
        );
      }

      statusObjectId = await getLaneIdByName(
        organizationId,
        jobId as string | null,
        status,
      );

      if (!statusObjectId) {
        return NextResponse.json(
          {
            error: `Lane "${status}" not found for this job/organization`,
          },
          { status: 404 },
        );
      }
    }

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      id,
      {
        status: statusObjectId,
        'tracking.updatedAt': new Date(),
      },
      { new: true },
    ).populate([
      {
        path: 'jobId',
        select: 'title',
      },
      {
        path: 'status',
        select: 'name',
      },
    ]);

    if (!updatedCandidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    // Broadcast the update with previous status for SSE clients to compute deltas
    broadcastCandidateUpdate(
      updatedCandidate as unknown as Parameters<
        typeof broadcastCandidateUpdate
      >[0],
      { previousStatus },
    ).catch((error) => {
      logger.error({ error }, 'Failed to broadcast candidate status update');
    });

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
