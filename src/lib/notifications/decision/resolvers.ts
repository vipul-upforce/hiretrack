import { NotificationType } from '@/lib/models/notification';
import {
  NotificationDecisionContext,
  NotificationDecisionResult,
  UserLean,
  SettingsLean,
} from './types';
import { SETTINGS_KEY, ORG_SETTINGS_KEY, createResult } from './helpers';

function getNestedSetting(
  settings: Record<string, Record<string, boolean | undefined>> | undefined,
  key: string,
  notificationType: NotificationType,
): boolean | undefined {
  return settings?.[key]?.[notificationType];
}

export function resolveNotificationSetting(
  user: UserLean,
  orgSettings: SettingsLean | null,
  context: NotificationDecisionContext,
): NotificationDecisionResult {
  const { notificationType } = context;
  const orgNotifications = orgSettings?.[ORG_SETTINGS_KEY];
  const adminOverride = getNestedSetting(
    orgNotifications?.adminOverrides as
      | Record<string, Record<string, boolean | undefined>>
      | undefined,
    context.recipientUserId,
    notificationType,
  );

  if (adminOverride === false) {
    return createResult(
      false,
      `Admin override is OFF for ${notificationType} - all notifications disabled`,
      'admin-override',
      context.notificationCategory,
    );
  }

  if (context.jobId) {
    const jobSetting = getNestedSetting(
      user[SETTINGS_KEY]?.jobLevel as
        | Record<string, Record<string, boolean | undefined>>
        | undefined,
      context.jobId,
      notificationType,
    );
    if (jobSetting !== undefined) {
      return createResult(
        jobSetting,
        `Job-level ${context.notificationCategory} setting for ${notificationType}`,
        'job-level',
        context.notificationCategory,
      );
    }
  }

  const globalSetting = user[SETTINGS_KEY]?.global?.[notificationType];
  if (globalSetting !== undefined) {
    return createResult(
      globalSetting,
      `Global user ${context.notificationCategory} setting for ${notificationType}`,
      'global-user',
      context.notificationCategory,
    );
  }

  const defaultEnabled =
    orgNotifications?.defaultSettings?.[notificationType] ?? true;
  return createResult(
    defaultEnabled,
    `Organization default ${context.notificationCategory} setting for ${notificationType}`,
    'org-default',
    context.notificationCategory,
  );
}

export function resolveMentionNotificationSetting(
  user: UserLean,
  orgSettings: SettingsLean | null,
  context: NotificationDecisionContext,
): NotificationDecisionResult {
  const mentionContext = {
    ...context,
    notificationType: NotificationType.MENTIONS,
  };
  const decision = resolveNotificationSetting(
    user,
    orgSettings,
    mentionContext,
  );
  return {
    ...decision,
    reason: decision.shouldSend
      ? `Mention ${context.notificationCategory} notification enabled: ${decision.reason}`
      : `Mention ${context.notificationCategory} notifications disabled: ${decision.reason}`,
  };
}
