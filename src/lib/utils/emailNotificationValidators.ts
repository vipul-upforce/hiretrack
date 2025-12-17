import mongoose from 'mongoose';
import type { Model } from 'mongoose';
import { VALID_NOTIFICATION_KEYS } from '@/lib/constants/notificationDefaults';
import type { OrganizationEmailNotifications } from '@/lib/models/settings';
import type { IUser } from '@/lib/models/user';

/**
 * Type for default notification settings
 */
type DefaultNotificationSettings =
  OrganizationEmailNotifications['defaultSettings'];

/**
 * Type for admin override settings (partial notification settings)
 */
type AdminOverrideSettings =
  OrganizationEmailNotifications['adminOverrides'][string];

/**
 * Type for lean user query result
 */
type LeanUser = Pick<IUser, '_id'> & {
  _id: mongoose.Types.ObjectId;
};

/**
 * Validate default notification settings
 */
export function validateDefaultSettings(
  defaultSettings: Partial<DefaultNotificationSettings> | undefined,
): string | null {
  if (!defaultSettings) {
    return null;
  }

  for (const key of VALID_NOTIFICATION_KEYS) {
    const value = defaultSettings[key as keyof typeof defaultSettings];
    if (value !== undefined && typeof value !== 'boolean') {
      return key;
    }
  }

  return null;
}

/**
 * Validate admin override settings structure and values
 */
export function validateAdminOverrides(
  adminOverrides: Record<string, Partial<AdminOverrideSettings>> | undefined,
): { error: string; userId?: string; key?: string } | null {
  if (!adminOverrides) {
    return null;
  }

  const userIds = Object.keys(adminOverrides);

  // Validate all user IDs first
  for (const userId of userIds) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { error: `Invalid user ID: ${userId}`, userId };
    }
  }

  // Validate override settings structure and values
  for (const [userId, overrideSettings] of Object.entries(adminOverrides)) {
    if (overrideSettings && typeof overrideSettings === 'object') {
      for (const key of VALID_NOTIFICATION_KEYS) {
        const value = overrideSettings[key as keyof AdminOverrideSettings];
        if (value !== undefined && typeof value !== 'boolean') {
          return { error: `Invalid override value for ${key}`, userId, key };
        }
      }
    }
  }

  return null;
}

/**
 * Verify users exist and belong to the same organization
 */
export async function verifyUsersExist(
  userIds: string[],
  organizationId: string,
  User: Model<IUser> | null,
): Promise<{ missing: string[] } | null> {
  if (userIds.length === 0) {
    return null;
  }

  const users = await User?.find({
    _id: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) },
    organizationId: new mongoose.Types.ObjectId(organizationId),
    isDeleted: { $ne: true },
  })
    .select('_id')
    .lean<LeanUser[]>();

  const foundUserIds = new Set(
    users?.map((u) => u._id.toString()) ?? [],
  );
  const missingUserIds = userIds.filter((id) => !foundUserIds.has(id));

  if (missingUserIds.length > 0) {
    return { missing: missingUserIds };
  }

  return null;
}

