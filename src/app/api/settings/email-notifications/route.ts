import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { User, Settings } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';
import type { OrganizationEmailNotifications } from '@/lib/models/settings';
import type { AdminOverrideSettings } from '@/lib/utils/emailNotificationHelpers';
import {
  mapToObject,
  objectToMap,
  mergeAdminOverrides,
} from '@/lib/utils/emailNotificationHelpers';
import {
  validateDefaultSettings,
  validateAdminOverrides,
  verifyUsersExist,
} from '@/lib/utils/emailNotificationValidators';
import {
  getOrganizationEmailNotifications,
  getAdminUsers,
  updateOrganizationEmailNotifications,
  getExistingSettings,
  type UserInfo,
} from '@/lib/services/emailNotificationService';

/**
 * Type for default notification settings
 */
type DefaultNotificationSettings =
  OrganizationEmailNotifications['defaultSettings'];

/**
 * Request body type for PUT endpoint
 */
interface UpdateEmailNotificationSettingsRequest {
  defaultSettings?: Partial<DefaultNotificationSettings>;
  adminOverrides?: Record<string, Partial<AdminOverrideSettings>>;
}

/**
 * GET response type
 */
interface GetEmailNotificationSettingsResponse {
  success: true;
  organizationSettings: OrganizationEmailNotifications;
  users: UserInfo[];
}

/**
 * PUT response type
 */
interface UpdateEmailNotificationSettingsResponse {
  success: true;
  message: string;
  settings: OrganizationEmailNotifications;
}

/**
 * MongoDB update data type
 */
interface SettingsUpdateData {
  'organizationEmailNotifications.defaultSettings'?: DefaultNotificationSettings;
  'organizationEmailNotifications.adminOverrides'?: Map<
    string,
    AdminOverrideSettings
  >;
}

/**
 * GET /api/settings/email-notifications
 * Get organization email notification settings and admin users
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const currentUser = await getAuthenticatedUser(request, ['admin', 'hr']);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    const orgNotifications = await getOrganizationEmailNotifications(
      currentUser.organizationId,
      Settings,
    );

    // Convert adminOverrides Map to object for JSON response
    const adminOverridesObj = mapToObject(orgNotifications.adminOverrides);

    const users = await getAdminUsers(
      currentUser.organizationId,
      User,
      adminOverridesObj,
    );

    const response: GetEmailNotificationSettingsResponse = {
      success: true,
      organizationSettings: {
        ...orgNotifications,
        adminOverrides: adminOverridesObj,
      },
      users,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error(
      { error, url: request.url },
      'Get email notification settings error',
    );
    return NextResponse.json(
      { error: 'Failed to get email notification settings' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/settings/email-notifications
 * Update organization email notification settings (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const [currentUser, body] = await Promise.all([
      getAuthenticatedUser(request, 'admin'),
      request.json() as Promise<UpdateEmailNotificationSettingsRequest>,
      connectToDatabase(),
    ]);

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    const { defaultSettings, adminOverrides } = body;

    // Validate default settings
    const invalidDefaultKey = validateDefaultSettings(defaultSettings);
    if (invalidDefaultKey) {
      return NextResponse.json(
        { error: `Invalid value for ${invalidDefaultKey}` },
        { status: 400 },
      );
    }

    // Validate admin overrides
    if (adminOverrides) {
      const validationError = validateAdminOverrides(adminOverrides);
      if (validationError) {
        if (validationError.userId && validationError.key) {
          return NextResponse.json(
            {
              error: `Invalid override value for ${validationError.key} in user ${validationError.userId}`,
            },
            { status: 400 },
          );
        }
        return NextResponse.json(
          { error: validationError.error },
          { status: 400 },
        );
      }

      // Verify users exist and belong to the same organization
      const userIds = Object.keys(adminOverrides);
      const userVerification = await verifyUsersExist(
        userIds,
        currentUser.organizationId,
        User,
      );

      if (userVerification?.missing.length) {
        return NextResponse.json(
          {
            error: `Users not found or access denied: ${userVerification.missing.join(', ')}`,
          },
          { status: 404 },
        );
      }
    }

    // Prepare update data
    const updateData: SettingsUpdateData = {};

    if (defaultSettings) {
      updateData['organizationEmailNotifications.defaultSettings'] =
        defaultSettings as DefaultNotificationSettings;
    }

    if (adminOverrides !== undefined) {
      // Get existing settings to merge admin overrides
      const existingSettings = await getExistingSettings(
        currentUser.organizationId,
        Settings,
      );

      const existingAdminOverrides =
        existingSettings?.organizationEmailNotifications?.adminOverrides ||
        new Map();

      // Merge admin overrides with existing ones
      const mergedOverrides = mergeAdminOverrides(
        existingAdminOverrides,
        adminOverrides,
      );

      // Convert merged overrides back to Map format for MongoDB
      updateData['organizationEmailNotifications.adminOverrides'] =
        objectToMap(mergedOverrides);
    }

    const settings = await updateOrganizationEmailNotifications(
      currentUser.organizationId,
      updateData,
      Settings,
    );

    const response: UpdateEmailNotificationSettingsResponse = {
      success: true,
      message: 'Email notification settings updated successfully',
      settings,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error(
      { error, url: request.url },
      'Update email notification settings error',
    );
    return NextResponse.json(
      { error: 'Failed to update email notification settings' },
      { status: 500 },
    );
  }
}
