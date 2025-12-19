import mongoose from 'mongoose';
import type { Model } from 'mongoose';
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/lib/constants/notificationDefaults';
import type {
  OrganizationEmailNotifications,
  ISettings,
} from '@/lib/models/settings';
import type { IUser } from '@/lib/models/user';
import type { AdminOverrideSettings } from './helpers';
import { safeGet } from './helpers';

/**
 * Type for MongoDB update data
 */
type SettingsUpdateData = {
  'organizationEmailNotifications.defaultSettings'?: OrganizationEmailNotifications['defaultSettings'];
  'organizationEmailNotifications.adminOverrides'?: Map<
    string,
    AdminOverrideSettings
  >;
};

/**
 * Type for lean user query result with selected fields
 */
type LeanUserWithFields = Pick<
  IUser,
  '_id' | 'name' | 'email' | 'role' | 'emailNotificationSettings'
> & {
  _id: mongoose.Types.ObjectId;
};

/**
 * Type for lean settings query result
 */
type LeanSettings = Pick<ISettings, 'organizationEmailNotifications'> | null;

/**
 * User info type for GET response
 */
export interface UserInfo {
  _id: string;
  name: string;
  email: string;
  role: string;
  hasCustomSettings: boolean;
  currentOverride: AdminOverrideSettings | null;
}

/**
 * Get organization email notification settings
 */
export async function getOrganizationEmailNotifications(
  organizationId: string,
  Settings: Model<ISettings> | null,
): Promise<OrganizationEmailNotifications> {
  const settings = await Settings?.findOne({
    organizationId: new mongoose.Types.ObjectId(organizationId),
  })
    .select('organizationEmailNotifications')
    .lean<LeanSettings>();

  const orgNotifications = settings?.organizationEmailNotifications || {
    defaultSettings: DEFAULT_NOTIFICATION_SETTINGS,
    adminOverrides: {},
  };

  return orgNotifications as OrganizationEmailNotifications;
}

/**
 * Get all HR/Admin users for override management
 */
export async function getAdminUsers(
  organizationId: string,
  User: Model<IUser> | null,
  adminOverrides: Record<string, AdminOverrideSettings>,
): Promise<UserInfo[]> {
  const users = await User?.find({
    organizationId: new mongoose.Types.ObjectId(organizationId),
    role: { $in: ['admin', 'hr'] },
    isDeleted: { $ne: true },
  })
    .select('_id name email role emailNotificationSettings')
    .lean<LeanUserWithFields[]>();

  return (users || []).map((user) => ({
    _id: user._id.toString(),
    name: user.name || '',
    email: user.email || '',
    role: user.role || '',
    hasCustomSettings: !!user.emailNotificationSettings,
    currentOverride: safeGet(adminOverrides, user._id.toString()) || null,
  }));
}

/**
 * Update organization email notification settings in database
 */
export async function updateOrganizationEmailNotifications(
  organizationId: string,
  updateData: SettingsUpdateData,
  Settings: Model<ISettings> | null,
): Promise<OrganizationEmailNotifications> {
  const result = await Settings?.findOneAndUpdate(
    {
      organizationId: new mongoose.Types.ObjectId(organizationId),
    },
    { $set: updateData },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  ).lean<LeanSettings>();

  return (
    (result?.organizationEmailNotifications as OrganizationEmailNotifications) || {
      defaultSettings: DEFAULT_NOTIFICATION_SETTINGS,
      adminOverrides: {},
    }
  );
}

/**
 * Get existing settings for merging
 */
export async function getExistingSettings(
  organizationId: string,
  Settings: Model<ISettings> | null,
): Promise<LeanSettings> {
  return (
    (await Settings?.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    }).lean<LeanSettings>()) ?? null
  );
}
