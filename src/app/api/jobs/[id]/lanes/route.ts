import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  Job,
  Candidate,
} from '@/lib/mongodb';
import { isValidObjectId } from 'mongoose';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';
import {
  getJobSpecificLanes,
  getOrganizationLanes,
  syncJobLanes,
  validateLaneName,
  normalizeLaneName,
  LANE_RESTRICTIONS,
} from '@/lib/services/laneService';
import { broadcastLaneUpdate } from '@/lib/broadcast/broadCastCandidate';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const [user, { id: jobId }] = await Promise.all([
      getAuthenticatedUser(request, ['admin', 'hr']),
      params,
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

    // Validate ObjectId
    if (!isValidObjectId(jobId)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    // Find the job
    const job = await Job.findOne({
      _id: jobId,
      organizationId: user.organizationId,
    })
      .select('lanes useCustomLanes organizationId title _id')
      .lean()
      .exec();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const useCustomLanes = Boolean(job.useCustomLanes || false);
    let lanes: { name: string; _id: string }[] = [];

    if (useCustomLanes && job.lanes && job.lanes.length > 0) {
      // Get ONLY job-specific lanes (excludes organization defaults)
      const jobLanes = await getJobSpecificLanes({
        organizationId: user.organizationId,
        jobId,
        includeInactive: false,
      });
      lanes = jobLanes.map((lane) => ({
        name: lane.name,
        _id: lane._id.toString(),
      }));
    } else {
      // Get organization default lanes
      const orgLanes = await getOrganizationLanes({
        organizationId: user.organizationId,
        includeInactive: false,
      });
      lanes = orgLanes.map((lane) => ({
        name: lane.name,
        _id: lane._id.toString(),
      }));
    }

    return NextResponse.json({
      jobId: job._id,
      jobTitle: job.title,
      lanes,
      useCustomLanes,
      laneRestrictions: LANE_RESTRICTIONS,
    });
  } catch (error) {
    logger.error({ error, url: request.url }, 'Get job lanes error');
    return NextResponse.json(
      { error: 'Failed to fetch job lanes' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const [user, { id: jobId }] = await Promise.all([
      getAuthenticatedUser(request, ['admin', 'hr']),
      params,
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!Job || !Candidate) {
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { lanes, useCustomLanes } = body;

    // Find the job
    const job = await Job.findOne({
      _id: jobId,
      organizationId: user.organizationId,
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (useCustomLanes) {
      // Validation is handled by syncJobLanes
      const { lanes: syncedLanes } = await syncJobLanes(
        user.organizationId,
        jobId,
        lanes,
      );

      const laneNames = syncedLanes.map((lane) => lane.name);

      // Broadcast update
      broadcastLaneUpdate(user.organizationId, laneNames, jobId);

      return NextResponse.json({
        message: 'Job lanes updated successfully',
        jobId,
        lanes: laneNames,
        useCustomLanes: true,
      });
    } 
      // When switching to default lanes, clear custom lanes
      await Job.findByIdAndUpdate(
        jobId,
        {
          $set: { useCustomLanes: false },
          $unset: { lanes: 1 },
        },
        { new: true },
      );

      // Get organization default lanes for response
      const orgLanes = await getOrganizationLanes({
        organizationId: user.organizationId,
        includeInactive: false,
      });
      const laneNames = orgLanes.map((lane) => lane.name);

      // Broadcast update
      broadcastLaneUpdate(user.organizationId, laneNames, jobId);

      return NextResponse.json({
        message: 'Job lanes updated successfully',
        jobId,
        lanes: laneNames,
        useCustomLanes: false,
      });
    
  } catch (error) {
    logger.error({ error, url: request.url }, 'Update job lanes error');
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to update job lanes';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const [user, { id: jobId }] = await Promise.all([
      getAuthenticatedUser(request, ['admin', 'hr']),
      params,
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

    const body = await request.json();
    const { laneName: rawLaneName, position } = body;

    // Validate lane name
    const validation = validateLaneName(rawLaneName);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const normalizedName = normalizeLaneName(rawLaneName);

    // Find the job
    const job = await Job.findOne({
      _id: jobId,
      organizationId: user.organizationId,
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get current lanes
    let currentLanes: string[] = [];
    if (job.useCustomLanes && job.lanes && job.lanes.length > 0) {
      // Get ONLY job-specific lanes (excludes organization defaults)
      const jobLanes = await getJobSpecificLanes({
        organizationId: user.organizationId,
        jobId,
        includeInactive: false,
      });
      currentLanes = jobLanes.map((lane) => lane.name);
    } else {
      const orgLanes = await getOrganizationLanes({
        organizationId: user.organizationId,
        includeInactive: false,
      });
      currentLanes = orgLanes.map((lane) => lane.name);
    }

    // Check if lane already exists
    const normalizedCurrentLanes = currentLanes.map(normalizeLaneName);
    if (normalizedCurrentLanes.includes(normalizedName)) {
      return NextResponse.json(
        { error: 'Lane already exists' },
        { status: 400 },
      );
    }

    // Add lane at specified position
    const newLanes = [...normalizedCurrentLanes];
    if (
      typeof position === 'number' &&
      position >= 0 &&
      position <= newLanes.length
    ) {
      newLanes.splice(position, 0, normalizedName);
    } else {
      newLanes.push(normalizedName);
    }

    // Sync job lanes (this will create the new lane and update the job)
    const { lanes: syncedLanes } = await syncJobLanes(
      user.organizationId,
      jobId,
      newLanes,
    );

    const laneNames = syncedLanes.map((lane) => lane.name);

    // Broadcast update
    broadcastLaneUpdate(user.organizationId, laneNames, jobId);

    return NextResponse.json({
      message: 'Lane added successfully',
      jobId,
      lanes: laneNames,
      useCustomLanes: true,
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        url: request.url,
      },
      'Add job lane error',
    );

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to add job lane. Please try again.';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
