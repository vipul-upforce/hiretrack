import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Job, Organization, Candidate } from '@/lib/mongodb';
import { broadcastLaneUpdate } from '@/lib/broadcast/broadCastCandidate';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';

const DEFAULT_LANES = [
  'applied',
  'screening',
  'shortlisted',
  'processing',
  'accepted',
  'rejected',
];

const RESTRICTED_LANES = ['applied', 'accepted', 'rejected'];

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

    if (!Job || !Organization || !Candidate) {
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 400 },
      );
    }

    const { id: jobId, laneName } = await params;
    let migrationLane: string | undefined;

    try {
      const body = await request.json();
      migrationLane = body.migrationLane;
    } catch (error) {
      // Ignore error if request body is empty
    }

    // Check if lane is restricted
    if (RESTRICTED_LANES.includes(laneName)) {
      return NextResponse.json(
        { error: `Cannot delete restricted lane: ${laneName}` },
        { status: 400 },
      );
    }

    const job = await Job.findOne({
      _id: jobId,
      organizationId: user.organizationId,
    })
      .select('lanes useCustomLanes organizationId _id')
      .lean()
      .exec();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get current lanes
    let currentLanes;
    if (job.useCustomLanes && job.lanes) {
      currentLanes = [...job.lanes];
    } else {
      const organization = await Organization.findById(user.organizationId)
        .select('defaultLanes')
        .lean()
        .exec();
      currentLanes = [...(organization?.defaultLanes || DEFAULT_LANES)];
    }

    // Check if lane exists
    if (!currentLanes.includes(laneName)) {
      return NextResponse.json({ error: 'Lane not found' }, { status: 404 });
    }

    const { organizationId } = user;
    const countCandidatesInLane = await Candidate.countDocuments({
      jobId,
      organizationId,
      status: laneName,
    });
    if (countCandidatesInLane > 0) {
      if (!migrationLane) {
        const otherLanes = currentLanes.filter((lane) => lane !== laneName);
        return NextResponse.json(
          {
            error: 'Cannot delete lane: candidates are currently in this lane',
            migrationNeeded: true,
            lanes: otherLanes,
          },
          { status: 400 },
        );
      }

      // Migration lane is provided, so update candidates
      await Candidate.updateMany(
        { jobId, organizationId, status: laneName },
        { $set: { status: migrationLane } },
      );
    }

    // Remove lane from the list
    const newLanes = currentLanes.filter((lane) => lane !== laneName);

    // Update job
    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      {
        $set: {
          lanes: newLanes,
          useCustomLanes: true, // Ensure we're using custom lanes after modification
        },
      },
      { new: true },
    );
    broadcastLaneUpdate(organizationId, newLanes, jobId);
    return NextResponse.json({
      message: 'Lane deleted successfully',
      jobId: updatedJob?._id,
      lanes: updatedJob?.lanes,
      deletedLane: laneName,
    });
  } catch (error) {
    console.error('Delete job lane error:', error);
    return NextResponse.json(
      { error: 'Failed to delete job lane' },
      { status: 500 },
    );
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

    if (!Job || !Organization || !Candidate) {
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 400 },
      );
    }

    const { id: jobId, laneName } = await params;
    const body = await request.json();
    const { newLaneName } = body;

    // Validation
    if (!newLaneName || typeof newLaneName !== 'string') {
      return NextResponse.json(
        { error: 'New lane name is required and must be a string' },
        { status: 400 },
      );
    }

    const validLaneNameRegex = /^[a-zA-Z0-9\s\-_]+$/;
    if (!validLaneNameRegex.test(newLaneName)) {
      return NextResponse.json(
        {
          error:
            'Invalid lane name. Only alphanumeric characters, spaces, hyphens, and underscores allowed.',
        },
        { status: 400 },
      );
    }

    // Check if lane is restricted from editing
    if (RESTRICTED_LANES.includes(laneName)) {
      return NextResponse.json(
        { error: `Cannot rename restricted lane: ${laneName}` },
        { status: 400 },
      );
    }

    const job = await Job.findOne({
      _id: jobId,
      organizationId: user.organizationId,
    })
      .select('lanes useCustomLanes organizationId _id')
      .lean()
      .exec();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get current lanes
    let currentLanes;
    if (job.useCustomLanes && job.lanes) {
      currentLanes = [...job.lanes];
    } else {
      const organization = await Organization.findById(user.organizationId)
        .select('defaultLanes')
        .lean()
        .exec();
      currentLanes = [...(organization?.defaultLanes || DEFAULT_LANES)];
    }

    // Check if old lane exists
    if (!currentLanes.includes(laneName)) {
      return NextResponse.json({ error: 'Lane not found' }, { status: 404 });
    }

    // Check if new lane name already exists
    if (currentLanes.includes(newLaneName)) {
      return NextResponse.json(
        { error: 'New lane name already exists' },
        { status: 400 },
      );
    }

    // Update lane name in the array
    const newLanes = currentLanes.map((lane) =>
      lane === laneName ? newLaneName : lane,
    );
    const { organizationId } = user;

    const [updatedJob] = await Promise.all([
      // Update job
      Job.findByIdAndUpdate(
        jobId,
        {
          $set: {
            lanes: newLanes,
            useCustomLanes: true, // Ensure we're using custom lanes after modification
          },
        },
        { new: true },
      ),
      // Update all candidates with the old status to the new status
      Candidate.updateMany(
        {
          jobId,
          organizationId,
          status: laneName,
        },
        { $set: { status: newLaneName } },
      ),
    ]);

    broadcastLaneUpdate(organizationId, newLanes, jobId);
    return NextResponse.json({
      message: 'Lane renamed successfully',
      jobId: updatedJob?._id,
      lanes: updatedJob?.lanes,
      oldLaneName: laneName,
      newLaneName,
    });
  } catch (error) {
    logger.error({ error, url: request.url }, 'Rename job lane error');
    return NextResponse.json(
      { error: 'Failed to rename job lane' },
      { status: 500 },
    );
  }
}
