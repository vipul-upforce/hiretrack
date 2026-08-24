/**
 * LEGACY ROUTE - Maintained for backward compatibility
 * Note: laneId in URL is actually a lane name (string), not an ObjectId
 * Use /api/organizations/default-lanes (DELETE/PATCH) instead
 * 
 * These routes work with organization-level lanes only
 */
import { NextResponse } from 'next/server';
import connectToDatabase, { Organization } from '@/lib/mongodb';
import { broadcastLaneUpdate } from '@/lib/broadcast/broadCastCandidate';
import { logger } from '@/lib/logger/logger.server';
import {
  deleteLane as deleteLaneService,
  updateLane,
  getOrganizationLanes,
  normalizeLaneName,
  isLaneProtected,
  validateLaneName,
} from '@/lib/services/laneService';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ laneId: string }> },
) {
  try {
    await connectToDatabase();
    const { organizationId, migrationLane } = await request.json();

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 },
      );
    }

    const { laneId: rawLaneName } = await params;
    const normalizedLaneName = normalizeLaneName(rawLaneName);

    // Check if lane is protected
    if (isLaneProtected(normalizedLaneName)) {
      return NextResponse.json(
        { error: `Cannot delete protected lane: ${normalizedLaneName}` },
        { status: 400 },
      );
    }

    const normalizedMigrationLane = migrationLane
      ? normalizeLaneName(migrationLane)
      : undefined;

    try {
      await deleteLaneService({
        organizationId,
        jobId: null, // Organization-level lane
        laneName: normalizedLaneName,
        migrationLane: normalizedMigrationLane,
      });

      // Get updated lanes for response
      const remainingLanes = await getOrganizationLanes({
        organizationId,
        includeInactive: false,
      });
      const laneNames = remainingLanes.map((lane) => lane.name);

      // Broadcast update
      broadcastLaneUpdate(organizationId, laneNames);

      return NextResponse.json({
        message: 'Lane deleted successfully',
        lanes: laneNames,
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
  } catch (err) {
    logger.error({ err, url: request.url }, 'Delete lane error');
    const error = err as Error;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to delete lane';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ laneId: string }> },
) {
  try {
    await connectToDatabase();
    const { organizationId, newLaneId: rawNewLaneName } = await request.json();

    if (!organizationId || !rawNewLaneName) {
      return NextResponse.json(
        { error: 'Missing organizationId or newLaneId' },
        { status: 400 },
      );
    }

    // Validate new lane name
    const validation = validateLaneName(rawNewLaneName);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { laneId: rawLaneName } = await params;
    const normalizedLaneName = normalizeLaneName(rawLaneName);
    const normalizedNewLaneName = normalizeLaneName(rawNewLaneName);

    // Check if lane is protected from editing
    if (isLaneProtected(normalizedLaneName)) {
      return NextResponse.json(
        { error: `Cannot rename protected lane: ${normalizedLaneName}` },
        { status: 400 },
      );
    }

    // Update the lane using centralized service
    await updateLane({
      organizationId,
      jobId: null, // Organization-level lane
      laneName: normalizedLaneName,
      updates: {
        name: normalizedNewLaneName,
      },
    });

    // Get updated lanes for response
    const updatedLanes = await getOrganizationLanes({
      organizationId,
      includeInactive: false,
    });
    const laneNames = updatedLanes.map((lane) => lane.name);

    // Broadcast update
    broadcastLaneUpdate(organizationId, laneNames);

    return NextResponse.json({
      message: 'Lane updated successfully',
      updatedLanes: laneNames,
      oldLaneName: normalizedLaneName,
      newLaneName: normalizedNewLaneName,
    });
  } catch (err) {
    logger.error({ err, url: request.url }, 'Error updating lane.');
    const error = err as Error;
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
