import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Organization } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';

const DEFAULT_LANES = [
  'applied',
  'screening',
  'shortlisted',
  'processing',
  'accepted',
  'rejected',
];

const DEFAULT_RESTRICTIONS = {
  nonEditable: ['applied', 'accepted', 'rejected'],
  nonDeletable: ['applied', 'accepted', 'rejected'],
};

async function getOrganizationLanes(orgId: string) {
  const org = await Organization.findById(orgId, {
    defaultLanes: 1,
    laneRestrictions: 1,
  }).lean();

  return org || null;
}

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

    const organization = await getOrganizationLanes(user.organizationId);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      defaultLanes: organization.defaultLanes || DEFAULT_LANES,
      laneRestrictions: organization.laneRestrictions || DEFAULT_RESTRICTIONS,
    });
  } catch (error) {
    console.error('Get default lanes error:', error);
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

    // Validation
    if (!Array.isArray(defaultLanes) || defaultLanes.length === 0) {
      return NextResponse.json(
        { error: 'defaultLanes must be a non-empty array of strings' },
        { status: 400 },
      );
    }

    // Validate lane names
    const validLaneNameRegex = /^[a-zA-Z0-9\s\-_]+$/;
    for (const lane of defaultLanes) {
      if (typeof lane !== 'string' || !validLaneNameRegex.test(lane)) {
        return NextResponse.json(
          {
            error: `Invalid lane name: ${lane}. Only alphanumeric characters, spaces, hyphens, and underscores allowed.`,
          },
          { status: 400 },
        );
      }
    }

    // Ensure required lanes are present
    const requiredLanes = ['applied', 'accepted', 'rejected'];
    for (const requiredLane of requiredLanes) {
      if (!defaultLanes.includes(requiredLane)) {
        return NextResponse.json(
          {
            error: `Required lane '${requiredLane}' must be included in default lanes`,
          },
          { status: 400 },
        );
      }
    }

    // Check for duplicates
    const uniqueLanes = [...new Set(defaultLanes)];
    if (uniqueLanes.length !== defaultLanes.length) {
      return NextResponse.json(
        { error: 'Duplicate lane names are not allowed' },
        { status: 400 },
      );
    }

    // Update organization
    const updatedOrganization = await Organization.findByIdAndUpdate(
      user.organizationId,
      {
        $set: {
          defaultLanes,
          // Ensure lane restrictions are set
          laneRestrictions: DEFAULT_RESTRICTIONS,
        },
      },
      {
        new: true,
        projection: { defaultLanes: 1, laneRestrictions: 1 },
        lean: true,
      },
    );

    if (!updatedOrganization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: 'Default lanes updated successfully',
      defaultLanes: updatedOrganization.defaultLanes,
      laneRestrictions: updatedOrganization.laneRestrictions,
    });
  } catch (error) {
    console.error('Update default lanes error:', error);
    return NextResponse.json(
      { error: 'Failed to update default lanes' },
      { status: 500 },
    );
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
    const { laneName, position } = body;

    // Validation
    if (!laneName || typeof laneName !== 'string') {
      return NextResponse.json(
        { error: 'Lane name is required and must be a string' },
        { status: 400 },
      );
    }

    const validLaneNameRegex = /^[a-zA-Z0-9\s\-_]+$/;
    if (!validLaneNameRegex.test(laneName)) {
      return NextResponse.json(
        {
          error:
            'Invalid lane name. Only alphanumeric characters, spaces, hyphens, and underscores allowed.',
        },
        { status: 400 },
      );
    }

    const organization = await getOrganizationLanes(user.organizationId);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    const currentLanes = organization.defaultLanes || DEFAULT_LANES;

    // Check if lane already exists
    if (currentLanes.includes(laneName)) {
      return NextResponse.json(
        { error: 'Lane already exists' },
        { status: 400 },
      );
    }

    // Add lane at specified position or at the end
    const newLanes = [...currentLanes];
    if (
      typeof position === 'number'
      && position >= 0
      && position <= newLanes.length
    ) {
      newLanes.splice(position, 0, laneName);
    } else {
      newLanes.push(laneName);
    }

    // Update organization
    const updatedOrganization = await Organization.findByIdAndUpdate(
      user.organizationId,
      { $set: { defaultLanes: newLanes } },
      { new: true },
    )
      .select('defaultLanes')
      .lean()
      .exec();

    return NextResponse.json({
      message: 'Default lane added successfully',
      defaultLanes: updatedOrganization.defaultLanes,
    });
  } catch (error) {
    console.error('Add default lane error:', error);
    return NextResponse.json(
      { error: 'Failed to add default lane' },
      { status: 500 },
    );
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
    const { laneName } = body;

    // Validation
    if (!laneName || typeof laneName !== 'string') {
      return NextResponse.json(
        { error: 'Lane name is required and must be a string' },
        { status: 400 },
      );
    }

    const organization = await getOrganizationLanes(user.organizationId);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    const currentLanes = organization.defaultLanes || DEFAULT_LANES;

    // Check if lane exists
    if (!currentLanes.includes(laneName)) {
      return NextResponse.json({ error: 'Lane not found' }, { status: 404 });
    }

    // Check if lane is restricted
    const restrictedLanes = ['applied', 'accepted', 'rejected'];
    if (restrictedLanes.includes(laneName)) {
      return NextResponse.json(
        { error: `Cannot delete restricted lane: ${laneName}` },
        { status: 400 },
      );
    }

    // Remove lane from the list
    const newLanes = currentLanes.filter((lane) => lane !== laneName);

    // Update organization
    const updatedOrganization = await Organization.findByIdAndUpdate(
      user.organizationId,
      { $set: { defaultLanes: newLanes } },
      {
        new: true,
        projection: { defaultLanes: 1 },
        lean: true,
      },
    );

    return NextResponse.json({
      message: 'Default lane deleted successfully',
      defaultLanes: updatedOrganization.defaultLanes,
    });
  } catch (error) {
    console.error('Delete default lane error:', error);
    return NextResponse.json(
      { error: 'Failed to delete default lane' },
      { status: 500 },
    );
  }
}
