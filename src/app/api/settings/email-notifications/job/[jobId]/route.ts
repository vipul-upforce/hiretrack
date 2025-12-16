import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { User, Job } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import mongoose from 'mongoose';
import { getUserEffectiveNotificationSettings } from '@/lib/services/emailDecisionEngine';
import { logger } from '@/lib/logger/logger.server';
import { VALID_NOTIFICATION_KEYS } from '@/lib/constants/notificationDefaults';

// Valid notification setting keys (using Set for O(1) lookup)
const VALID_NOTIFICATION_KEYS_SET = new Set(VALID_NOTIFICATION_KEYS);

/**
 * Safely validates notification settings object
 * Prevents Object Injection Sink vulnerabilities
 */
function validateNotificationSettings(
  settings: Record<string, unknown>,
  validKeys: Set<string>,
): string | null {
  // Iterate only over existing properties (more efficient)
  for (const key of Object.keys(settings)) {
    // O(1) lookup - only validate keys in whitelist
    // Safe property access using hasOwnProperty + getOwnPropertyDescriptor
    if (
      validKeys.has(key) &&
      Object.prototype.hasOwnProperty.call(settings, key)
    ) {
      const value = Object.getOwnPropertyDescriptor(settings, key)?.value;
      if (value !== undefined && typeof value !== 'boolean') {
        return key;
      }
    }
  }
  return null;
}

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
    const job = await Job?.findById(jobId)
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

    const user = await User?.findById(userId)
      .select('emailNotificationSettings')
      .lean();

    // Safe property access - jobId is validated as ObjectId above
    const jobLevel = user?.emailNotificationSettings?.jobLevel;
    const jobLevelSettings =
      jobLevel && typeof jobLevel === 'object' && Object.prototype.hasOwnProperty.call(jobLevel, jobId)
        ? Object.getOwnPropertyDescriptor(jobLevel, jobId)?.value || null
        : null;

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
    logger.error(
      { error, url: request.url },
      'Get job-level email notification settings error',
    );
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
    const job = await Job?.findById(jobId)
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

    // Validate settings using safe property access (prevents Object Injection Sink)
    const invalidKey = validateNotificationSettings(
      settings as Record<string, unknown>,
      VALID_NOTIFICATION_KEYS_SET,
    );
    if (invalidKey) {
      return NextResponse.json(
        { error: `Invalid value for ${invalidKey}` },
        { status: 400 },
      );
    }

    // Update job-level settings
    const userId = currentUser.id;
    const { organizationId } = currentUser;

    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'Invalid user data in token' },
        { status: 401 },
      );
    }

    const updatePath = `emailNotificationSettings.jobLevel.${jobId}`;
    const result = await User?.findByIdAndUpdate(
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
      jobId,
    );

    return NextResponse.json({
      success: true,
      message: 'Job-level email notification settings updated successfully',
      jobSettings: settings,
      effectiveSettings,
    });
  } catch (error) {
    logger.error(
      { error, url: request.url },
      'Update job-level email notification settings error',
    );
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
    const job = await Job?.findById(jobId).select('_id organizationId').lean();

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
    await User?.findByIdAndUpdate(userId, {
      $unset: { [unsetPath]: 1 },
    });

    // Get updated effective settings
    const effectiveSettings = await getUserEffectiveNotificationSettings(
      userId!.toString(),
      organizationId.toString(),
      jobId,
    );

    return NextResponse.json({
      success: true,
      message: 'Job-level email notification overrides removed',
      effectiveSettings,
    });
  } catch (error) {
    logger.error(
      { error, url: request.url },
      'Remove job-level email notification settings error',
    );
    return NextResponse.json(
      { error: 'Failed to remove job-level email notification settings' },
      { status: 500 },
    );
  }
}
