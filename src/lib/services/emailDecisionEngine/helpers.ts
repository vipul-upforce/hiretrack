import connectToDatabase, { User, Settings } from '@/lib/mongodb';
import mongoose from 'mongoose';
import { NotificationDecisionResult, UserLean, SettingsLean } from './types';

export const ELIGIBLE_ROLES = ['admin', 'hr', 'interviewer'] as const;
export const SETTINGS_KEY = 'emailNotificationSettings';
export const ORG_SETTINGS_KEY = 'organizationEmailNotifications';

export function createResult(
  shouldSend: boolean,
  reason: string,
  source: NotificationDecisionResult['effectiveSettings']['source'],
  category: 'email' | 'inApp',
): NotificationDecisionResult {
  return {
    shouldSend,
    reason,
    effectiveSettings: { source, enabled: shouldSend, category },
  };
}

export async function fetchUserAndSettings(
  recipientUserId: string,
  organizationId: string,
): Promise<[UserLean | null, SettingsLean | null]> {
  await connectToDatabase();
  if (!User || !Settings) throw new Error('Database models not initialized');
  const [user, orgSettings] = await Promise.all([
    User.findById(recipientUserId)
      .select('emailNotificationSettings role')
      .lean(),
    Settings.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    })
      .select('organizationEmailNotifications')
      .lean(),
  ]);
  return [user as UserLean | null, orgSettings as SettingsLean | null];
}

export async function fetchUsersAndSettingsBatch(
  userIds: string[],
  organizationId: string,
): Promise<[UserLean[], SettingsLean | null]> {
  await connectToDatabase();
  if (!User || !Settings) throw new Error('Database models not initialized');

  const [users, orgSettings] = await Promise.all([
    User.find({ _id: { $in: userIds } })
      .select('_id emailNotificationSettings role')
      .lean(),
    Settings.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    })
      .select('organizationEmailNotifications')
      .lean(),
  ]);

  return [users as UserLean[], orgSettings as SettingsLean | null];
}

