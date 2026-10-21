import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Job } from '@/lib/mongodb';
import { broadcastLaneUpdate } from '@/lib/broadcast/broadCastCandidate';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';
import {
  deleteLane as deleteLaneService,
  updateLane,
  isLaneProtected,
  validateLaneName,
  normalizeLaneName,
  getJobSpecificLanes,
} from '@/lib/services/laneService';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; laneName: string } },
) {
  try {
    const [user] = await Promise.all([
      getAuthenticatedUser(request, ['admin', 'hr']),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!Job) {
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 400 },
      );
    }

    const { id: jobId, laneName: rawLaneName } = await params;
    const normalizedLaneName = normalizeLaneName(rawLaneName);

    // Check if lane is protected
    if (isLaneProtected(normalizedLaneName)) {
      return NextResponse.json(
        { error: `Cannot delete protected lane: ${normalizedLaneName}` },
        { status: 400 },
      );
    }

    // Verify job exists
    const job = await Job.findOne({
      _id: jobId,
      organizationId: user.organizationId,
    })
      .select('_id')
      .lean()
      .exec();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    let migrationLane: string | undefined;
    try {
      // Extract migrationLane from query params instead of request body
      const { searchParams } = new URL(request.url);
      const migrationLaneParam = searchParams.get('migrationLane');
      migrationLane = migrationLaneParam
        ? normalizeLaneName(migrationLaneParam)
        : undefined;
    } catch {
      // Ignore error if request body is empty
    }
    try {
      await deleteLaneService({
        organizationId: user.organizationId,
        jobId,
        laneName: normalizedLaneName,
        migrationLane,
      });

      // Get updated lanes for response
      const remainingLanes = await getJobSpecificLanes({
        organizationId: user.organizationId,
        jobId,
        includeInactive: false,
      });
      const laneNames = remainingLanes.map((lane) => lane.name);

      // Broadcast update
      broadcastLaneUpdate(user.organizationId, laneNames, jobId);

      return NextResponse.json({
        message: 'Lane deleted successfully',
        jobId,
        lanes: laneNames,
        deletedLane: normalizedLaneName,
      });
    } catch (error) {
      // Handle migration needed error
      if (
        error instanceof Error &&
        error.message.includes('migrationNeeded')
      ) {
        const errorData = JSON.parse(error.message);
        return NextResponse.json(errorData, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    logger.error({ error, url: request.url }, 'Delete job lane error');
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to delete job lane';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; laneName: string } },
) {
  try {
    const [user] = await Promise.all([
      getAuthenticatedUser(request, ['admin', 'hr']),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!Job) {
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 400 },
      );
    }

    const { id: jobId, laneName: rawLaneName } = await params;
    const normalizedLaneName = normalizeLaneName(rawLaneName);
    const body = await request.json();
    const { newLaneName: rawNewLaneName } = body;

    // Validate new lane name
    const validation = validateLaneName(rawNewLaneName);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const normalizedNewLaneName = normalizeLaneName(rawNewLaneName);

    // Check if lane is protected from editing
    if (isLaneProtected(normalizedLaneName)) {
      return NextResponse.json(
        { error: `Cannot rename protected lane: ${normalizedLaneName}` },
        { status: 400 },
      );
    }

    // Verify job exists
    const job = await Job.findOne({
      _id: jobId,
      organizationId: user.organizationId,
    })
      .select('_id')
      .lean()
      .exec();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Update the lane using centralized service
    await updateLane({
      organizationId: user.organizationId,
      jobId,
      laneName: normalizedLaneName,
      updates: {
        name: normalizedNewLaneName,
      },
    });

    // Get updated lanes for response
    const updatedLanes = await getJobSpecificLanes({
      organizationId: user.organizationId,
      jobId,
      includeInactive: false,
    });
    const laneNames = updatedLanes.map((lane) => lane.name);

    // Broadcast update
    broadcastLaneUpdate(user.organizationId, laneNames, jobId);

    return NextResponse.json({
      message: 'Lane renamed successfully',
      jobId,
      lanes: laneNames,
      oldLaneName: normalizedLaneName,
      newLaneName: normalizedNewLaneName,
    });
  } catch (error) {
    logger.error({ error, url: request.url }, 'Rename job lane error');
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to rename job lane';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
