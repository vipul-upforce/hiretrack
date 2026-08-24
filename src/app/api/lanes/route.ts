import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Lane, Job, Organization } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import {
  getJobSpecificLanes,
  getOrganizationLanes,
  syncJobLanes,
  syncOrganizationDefaultLanes,
} from '@/lib/services/laneService';
import { broadcastLaneUpdate } from '@/lib/broadcast/broadCastCandidate';

const DEFAULT_LANES = [
  'applied',
  'screening',
  'shortlisted',
  'processing',
  'accepted',
  'rejected',
];

/**
 * LEGACY ROUTE - Maintained for backward compatibility
 * Use /api/jobs/[id]/lanes or /api/organizations/default-lanes instead
 * 
 * GET /api/lanes?userId=xxx&jobId=xxx
 * Returns lane names for a job or organization
 */
export async function GET(request: NextRequest) {
  try {
    const [user] = await Promise.all([
      getAuthenticatedUser(request),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams?.get('jobId');
    const { organizationId } = user;

    let lanesArray: string[] = [];

    // If jobId is provided, get job-specific lanes
    if (jobId && Job) {
      const job = await Job.findOne({
        _id: jobId,
        organizationId,
      })
        .select('useCustomLanes')
        .lean()
        .exec();

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      if (job.useCustomLanes) {
        const jobLanes = await getJobSpecificLanes({
          organizationId,
          jobId,
          includeInactive: false,
        });
        lanesArray = jobLanes.map((lane) => lane.name);
      } else {
        // Fall back to organization default lanes
        const orgLanes = await getOrganizationLanes({
          organizationId,
          includeInactive: false,
        });
        lanesArray = orgLanes.map((lane) => lane.name);
      }
    } else {
      // Get organization default lanes
      const orgLanes = await getOrganizationLanes({
        organizationId,
        includeInactive: false,
      });
      lanesArray = orgLanes.map((lane) => lane.name);
    }

    return NextResponse.json({ lanes: lanesArray });
  } catch (err: unknown) {
    const error = err as Error;
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * LEGACY ROUTE - Maintained for backward compatibility
 * Use /api/jobs/[id]/lanes (PUT) or /api/organizations/default-lanes (PUT) instead
 * 
 * PUT /api/lanes
 * Updates lanes for a job or organization
 */
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
    const { lanes: newLanes, jobId } = body;

    if (!Array.isArray(newLanes) || newLanes.length === 0) {
      return NextResponse.json(
        { error: 'Lanes must be a non-empty array' },
        { status: 400 },
      );
    }

    // If jobId is provided, update job-specific lanes
    if (jobId && Job) {
      const job = await Job.findOne({
        _id: jobId,
        organizationId: user.organizationId,
      })
        .select('_id')
        .lean();

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      const { lanes: syncedLanes } = await syncJobLanes(
        user.organizationId,
        jobId,
        newLanes,
      );

      const laneNames = syncedLanes.map((lane) => lane.name);
      broadcastLaneUpdate(user.organizationId, laneNames, jobId);

      return NextResponse.json({
        message: 'Job lanes updated successfully',
        jobId,
        lanes: laneNames,
        useCustomLanes: true,
      });
    }

    // Update organization default lanes
    const { lanes: syncedLanes } = await syncOrganizationDefaultLanes(
      user.organizationId,
      newLanes,
    );

    const laneNames = syncedLanes.map((lane) => lane.name);
    broadcastLaneUpdate(user.organizationId, laneNames);

    return NextResponse.json({
      message: 'Organization lanes updated successfully',
      lanes: laneNames,
    });
  } catch (err: unknown) {
    const error = err as Error;
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
/**
 * LEGACY ROUTE - DEPRECATED
 * This route uses old schema (userId field which doesn't exist in new Lane model)
 * Use /api/jobs/[id]/lanes (POST) or /api/organizations/default-lanes (POST) instead
 * 
 * POST /api/lanes
 * Creates a new lane (legacy - may not work with new Lane model)
 */
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    // This route appears to be using an old schema with userId
    // The new Lane model doesn't have userId, it has organizationId and optional jobId
    // For backward compatibility, we'll return an error suggesting the new route
    return NextResponse.json(
      {
        error:
          'This endpoint is deprecated. Use /api/jobs/[id]/lanes (POST) for job lanes or /api/organizations/default-lanes (POST) for organization lanes instead.',
        deprecated: true,
      },
      { status: 410 }, // 410 Gone - indicates resource is no longer available
    );
  } catch (err: unknown) {
    const error = err as Error;
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
