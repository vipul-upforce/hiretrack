import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Organization } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';
import {
  getOrganizationLanes as getOrgLanes,
  syncOrganizationDefaultLanes,
  createLane,
  deleteLane as deleteLaneService,
  validateLaneName,
  isLaneProtected,
  normalizeLaneName,
  LANE_RESTRICTIONS,
} from '@/lib/services/laneService';
import { broadcastLaneUpdate } from '@/lib/broadcast/broadCastCandidate';

// GET /api/organizations/default-lanes - Fetch organization default lanes
export async function GET(request: NextRequest) {
  try {
    const [user] = await Promise.all([
      getAuthenticatedUser(request, ['admin', 'hr', 'interviewer']),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lanes = await getOrgLanes({
      organizationId: user.organizationId,
      includeInactive: false,
    });

    const defaultLanes = lanes.map((lane) => lane.name);

    // Get organization for lane restrictions
    const organization = await Organization?.findById(user.organizationId, {
      laneRestrictions: 1,
    }).lean();

    return NextResponse.json({
      defaultLanes,
      laneRestrictions: organization?.laneRestrictions || LANE_RESTRICTIONS,
    });
  } catch (error) {
    logger.error({ error, url: request.url }, 'Get default lanes error');
    return NextResponse.json(
      { error: 'Failed to fetch default lanes' },
      { status: 500 },
    );
  }
}

// PUT /api/organizations/default-lanes - Update organization default lanes
export async function PUT(request: NextRequest) {
  try {
    const [user] = await Promise.all([
      getAuthenticatedUser(request, ['admin', 'hr']),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { defaultLanes } = body;

    // Validation is handled by syncOrganizationDefaultLanes
    const { lanes } = await syncOrganizationDefaultLanes(
      user.organizationId,
      defaultLanes,
    );

    const laneNames = lanes.map((lane) => lane.name);

    // Broadcast update
    broadcastLaneUpdate(user.organizationId, laneNames);

    return NextResponse.json({
      message: 'Default lanes updated successfully',
      defaultLanes: laneNames,
      laneRestrictions: LANE_RESTRICTIONS,
    });
  } catch (error) {
    logger.error({ error, url: request.url }, 'Update default lanes error');
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to update default lanes';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/organizations/default-lanes - Add a new default lane
export async function POST(request: NextRequest) {
  try {
    const [user] = await Promise.all([
      getAuthenticatedUser(request, ['admin', 'hr']),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { laneName: rawLaneName, position } = body;

    // Validate lane name
    const validation = validateLaneName(rawLaneName);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Get current lanes
    const currentLanes = await getOrgLanes({
      organizationId: user.organizationId,
      includeInactive: false,
    });
    const currentLaneNames = currentLanes.map((lane) => lane.name);

    // Check if lane already exists
    const normalizedName = normalizeLaneName(rawLaneName);
    if (currentLaneNames.includes(normalizedName)) {
      return NextResponse.json(
        { error: 'Lane already exists' },
        { status: 400 },
      );
    }

    // Determine position
    let insertPosition = currentLaneNames.length;
    if (
      typeof position === 'number' &&
      position >= 0 &&
      position <= currentLaneNames.length
    ) {
      insertPosition = position;
    }

    // Create new lane
    await createLane({
      organizationId: user.organizationId,
      jobId: null,
      name: normalizedName,
      order: insertPosition,
    });

    // Reorder existing lanes
    const updatedLaneNames = [...currentLaneNames];
    updatedLaneNames.splice(insertPosition, 0, normalizedName);

    // Sync organization lanes array
    await syncOrganizationDefaultLanes(
      user.organizationId,
      updatedLaneNames,
    );

    // Broadcast update
    broadcastLaneUpdate(user.organizationId, updatedLaneNames);

    return NextResponse.json({
      message: 'Default lane added successfully',
      defaultLanes: updatedLaneNames,
    });
  } catch (error) {
    logger.error({ error, url: request.url }, 'Add default lane error');
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to add default lane';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE /api/organizations/default-lanes - Delete a default lane
export async function DELETE(request: NextRequest) {
  try {
    const [user] = await Promise.all([
      getAuthenticatedUser(request, ['admin', 'hr']),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { laneName, migrationLane } = body;

    // Validation
    if (!laneName || typeof laneName !== 'string') {
      return NextResponse.json(
        { error: 'Lane name is required and must be a string' },
        { status: 400 },
      );
    }

    // Check if lane is protected
    if (isLaneProtected(laneName)) {
      return NextResponse.json(
        { error: `Cannot delete protected lane: ${laneName}` },
        { status: 400 },
      );
    }

    try {
      await deleteLaneService({
        organizationId: user.organizationId,
        jobId: null,
        laneName,
        migrationLane,
      });

      // Get updated lanes
      const remainingLanes = await getOrgLanes({
        organizationId: user.organizationId,
        includeInactive: false,
      });
      const laneNames = remainingLanes.map((lane) => lane.name);

      // Broadcast update
      broadcastLaneUpdate(user.organizationId, laneNames);

      return NextResponse.json({
        message: 'Default lane deleted successfully',
        defaultLanes: laneNames,
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
    logger.error({ error, url: request.url }, 'Delete default lane error');
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to delete default lane';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
