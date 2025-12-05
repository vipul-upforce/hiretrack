import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { User, Job } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import mongoose from 'mongoose';
import { getUserEffectiveNotificationSettings } from '@/lib/services/emailDecisionEngine';

/**
 * GET /api/settings/email-notifications/job/[jobId]
 * Get job-level email notification settings for current user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const [currentUser, { jobId }] = await Promise.all([
      getAuthenticatedUser(request),
      params,
      connectToDatabase(),
    ]);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Validate jobId
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    // Verify job exists and user has access
    const job = await Job.findById(jobId)
      .select('_id title organizationId')
      .lean();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Ensure job is from the same organization
    if (job.organizationId.toString() !== currentUser.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get user's current settings for this job
    const userId = currentUser.id;
    const { organizationId } = currentUser;

    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Invalid user data in token' },
        { status: 401 },
      );
    }

    const user = await User.findById(userId)
      .select('emailNotificationSettings')
      .lean();

    const jobLevelSettings = user?.emailNotificationSettings?.jobLevel?.[jobId] || null;

    // Get effective settings (resolved through priority chain)

    const effectiveSettings = await getUserEffectiveNotificationSettings(
      userId.toString(),
      organizationId.toString(),
      jobId,
    );

    return NextResponse.json({
      success: true,
      job: {
        _id: job._id,
        title: job.title,
      },
      currentJobSettings: jobLevelSettings,
      effectiveSettings,
      hasJobLevelOverrides: !!jobLevelSettings,
    });
  } catch (error) {
    console.error('Get job-level email notification settings error:', error);
    return NextResponse.json(
      { error: 'Failed to get job-level email notification settings' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/settings/email-notifications/job/[jobId]
 * Update job-level email notification settings for current user
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const [currentUser, { jobId }] = await Promise.all([
      getAuthenticatedUser(request),
      params,
      connectToDatabase(),
    ]);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Validate jobId
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    // Verify job exists and user has access
    const job = await Job.findById(jobId)
      .select('_id title organizationId')
      .lean();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Ensure job is from the same organization
    if (job.organizationId.toString() !== currentUser.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { settings } = body;

    // Validate settings
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid settings object' },
        { status: 400 },
      );
    }

    // const validKeys = [
    //   "newApplications",
    //   "interviewAssignments",
    //   "statusUpdates",
    //   "newRemarks",
    //   "stepCompleted",
    //   "mentions",
    // ];
    const validKeys = [
      "mentions",
      "newApplications",
      "statusUpdates",
      "detailsUpdated",
      "interviewAssignments",
      "stepCompleted",
      "newRemarks",
      "meetingScheduled",
      "meetingUpdated",
      "meetingCancelled",
      "meetingInviteAccepted",
      "meetingInviteDeclined",
      "meetingInviteTentative",
      "followupAdded",
      "followupUpdated",
      "followupRemoved",
      "jobCreated",
      "jobUpdated",
      "userAdded",
      "bulkImportCompleted",
      "candidateRejected",
      "interviewCompleted",
      "candidateMoved",
    ];
    for (const key of validKeys) {
      if (settings[key] !== undefined && typeof settings[key] !== 'boolean') {
        return NextResponse.json(
          { error: `Invalid value for ${key}` },
          { status: 400 },
        );
      }
    }

    // Update job-level settings
    const userId = currentUser.id;
    const {organizationId} = currentUser;
    
    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: "Invalid user data in token" },
        { status: 401 }
      );
    }
    
    const updatePath = `emailNotificationSettings.jobLevel.${jobId}`;
    const result = await User.findByIdAndUpdate(
      userId,
      { $set: { [updatePath]: settings } },
      { new: true, upsert: false },
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 },
      );
    }

    // Get updated effective settings
    const effectiveSettings = await getUserEffectiveNotificationSettings(
      userId.toString(),
      organizationId.toString(),
      jobId
    );

    return NextResponse.json({
      success: true,
      message: 'Job-level email notification settings updated successfully',
      jobSettings: settings,
      effectiveSettings,
    });
  } catch (error) {
    console.error('Update job-level email notification settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update job-level email notification settings' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/settings/email-notifications/job/[jobId]
 * Remove job-level overrides (fall back to global settings)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const [currentUser, { jobId }] = await Promise.all([
      getAuthenticatedUser(request),
      params,
      connectToDatabase(),
    ]);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate jobId
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    // Verify job exists and user has access
    const job = await Job.findById(jobId).select('_id organizationId').lean();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Ensure job is from the same organization
    if (job.organizationId.toString() !== currentUser.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Remove job-level settings
    const userId = currentUser.id;
    const { organizationId } = currentUser;
    const unsetPath = `emailNotificationSettings.jobLevel.${jobId}`;
    await User.findByIdAndUpdate(userId, {
      $unset: { [unsetPath]: 1 },
    });

    // Get updated effective settings
    const effectiveSettings = await getUserEffectiveNotificationSettings(
      userId.toString(),
      organizationId.toString(),
      jobId,
    );

    return NextResponse.json({
      success: true,
      message: 'Job-level email notification overrides removed',
      effectiveSettings,
    });
  } catch (error) {
    console.error('Remove job-level email notification settings error:', error);
    return NextResponse.json(
      { error: 'Failed to remove job-level email notification settings' },
      { status: 500 },
    );
  }
}
