import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { User } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import mongoose from 'mongoose';
import { getUserEffectiveNotificationSettings } from '@/lib/services/emailDecisionEngine';

// Valid notification setting keys (using Set for O(1) lookup)
const VALID_NOTIFICATION_KEYS = new Set([
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
]);

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
 * GET /api/settings/email-notifications/[userId]
 * Get individual user email notification settings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const [currentUser, { userId }] = await Promise.all([
      getAuthenticatedUser(request),
      params,
      connectToDatabase(),
    ]);

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Get user basic info
    const user = await User?.findById(userId)
      .select('_id name email role organizationId')
      .lean().exec();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure user is from the same organization
    if (user.organizationId.toString() !== currentUser?.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get jobId from query params if provided
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    // Get effective email settings using the decision engine
    const { organizationId } = currentUser;
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Invalid organization data in token' },
        { status: 401 },
      );
    }

    const effectiveSettings = await getUserEffectiveNotificationSettings(
      userId,
      organizationId.toString(),
      jobId || undefined,
    );

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      settings: effectiveSettings,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to get user email notification settings' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/settings/email-notifications/[userId]
 * Update individual user email notification settings
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    await connectToDatabase();

    const [currentUser, { userId }] = await Promise.all([
      getAuthenticatedUser(request, ['admin']),
      params,
      connectToDatabase(),
    ]);

    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const body = await request.json();
    const { global, jobLevel } = body;

    // Validate global settings
    if (global && typeof global === 'object') {
      const invalidKey = validateNotificationSettings(
        global as Record<string, unknown>,
        VALID_NOTIFICATION_KEYS,
      );
      if (invalidKey) {
        return NextResponse.json(
          { error: `Invalid value for global.${invalidKey}` },
          { status: 400 },
        );
      }
    }

    // Validate job-level settings
    if (jobLevel && typeof jobLevel === 'object') {
      for (const [jobId, jobSettings] of Object.entries(jobLevel)) {
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
          return NextResponse.json(
            { error: `Invalid job ID: ${jobId}` },
            { status: 400 },
          );
        }

        if (jobSettings && typeof jobSettings === 'object') {
          // Job-level settings exclude "candidateMoved" (only valid at global level)
          const jobLevelValidKeys = new Set(
            Array.from(VALID_NOTIFICATION_KEYS).filter(
              (key) => key !== 'candidateMoved',
            ),
          );
          
          const invalidKey = validateNotificationSettings(
            jobSettings as Record<string, unknown>,
            jobLevelValidKeys,
          );
          if (invalidKey) {
            return NextResponse.json(
              { error: `Invalid job-level value for ${invalidKey} in job ${jobId}` },
              { status: 400 },
            );
          }
        }
      }
    }

    // Get current user to verify organization
    const targetUser = await User?.findById(userId)
      .select('organizationId')
      .lean();
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure user is from the same organization
    if (targetUser.organizationId.toString() !== currentUser.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (global) {
      updateData['emailNotificationSettings.global'] = global;
    }

    if (jobLevel !== undefined) {
      // Convert jobLevel to Map format for MongoDB
      const jobLevelMap = new Map();
      if (jobLevel && typeof jobLevel === 'object') {
        Object.entries(jobLevel).forEach(([jobId, settings]) => {
          if (settings) {
            jobLevelMap.set(jobId, settings);
          }
        });
      }
      updateData['emailNotificationSettings.jobLevel'] = jobLevelMap;
    }

    // Update user settings
    const updatedUser = await User?.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true },
    )
      .select('emailNotificationSettings name email role')
      .lean();

    return NextResponse.json({
      success: true,
      message: 'User email notification settings updated successfully',
      settings: updatedUser?.emailNotificationSettings,
      user: {
        name: updatedUser?.name,
        email: updatedUser?.email,
        role: updatedUser?.role,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to update user email notification settings' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/settings/email-notifications/[userId]
 * Reset user email notification settings to defaults (remove custom settings)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const [{ userId }, currentUser] = await Promise.all([
      params,
      getAuthenticatedUser(request, ['admin']),
      connectToDatabase(),
    ]);

    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Get current user to verify organization
    const targetUser = await User?.findById(userId)
      .select('organizationId')
      .lean();
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure user is from the same organization
    if (targetUser.organizationId.toString() !== currentUser.organizationId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Reset email notification settings to defaults
    await User?.findByIdAndUpdate(userId, {
      $unset: { emailNotificationSettings: 1 },
    });

    return NextResponse.json({
      success: true,
      message: 'User email notification settings reset to defaults',
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to reset user email notification settings' },
      { status: 500 },
    );
  }
}
