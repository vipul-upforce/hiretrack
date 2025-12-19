import logger from '@/lib/logger';
import connectToDatabase, { User, Settings } from '@/lib/mongodb';
import { NotificationType } from '@/lib/models/notification';
import {
  NotificationDecisionContext,
  NotificationDecisionResult,
  UserLean,
  SettingsLean,
} from './types';
import { validatePreconditions, validateUserEligibility } from './validators';
import {
  resolveNotificationSetting,
  resolveMentionNotificationSetting,
} from './resolvers';
import {
  fetchUserAndSettings,
  fetchUsersAndSettingsBatch,
  createResult,
} from './helpers';

function processContext(
  context: NotificationDecisionContext,
  user: UserLean | undefined,
  orgSettings: SettingsLean | null,
): NotificationDecisionResult {
  const preCheck = validatePreconditions(context);
  if (preCheck) return preCheck;
  const eligibilityCheck = validateUserEligibility(
    user || null,
    context.notificationCategory,
  );
  if (eligibilityCheck) return eligibilityCheck;
  return context.isMention
    ? resolveMentionNotificationSetting(user!, orgSettings, context)
    : resolveNotificationSetting(user!, orgSettings, context);
}

export async function shouldSendNotification(
  context: NotificationDecisionContext,
): Promise<NotificationDecisionResult> {
  try {
    const [user, orgSettings] = await fetchUserAndSettings(
      context.recipientUserId,
      context.organizationId,
    );
    return processContext(context, user || undefined, orgSettings);
  } catch (error) {
    logger.error('Error in notification decision engine:', error);
    return createResult(
      false,
      `Error determining notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'org-default',
      context.notificationCategory,
    );
  }
}

export async function batchCheckNotifications(
  contexts: NotificationDecisionContext[],
): Promise<NotificationDecisionResult[]> {
  const results: NotificationDecisionResult[] = [];
  await connectToDatabase();
  if (!User || !Settings) {
    contexts.forEach(() =>
      results.push(
        createResult(
          false,
          'Database models not initialized',
          'org-default',
          'email',
        ),
      ),
    );
    return results;
  }

  const orgGroups = new Map<string, NotificationDecisionContext[]>();
  contexts.forEach((context) => {
    const group = orgGroups.get(context.organizationId) || [];
    group.push(context);
    orgGroups.set(context.organizationId, group);
  });

  for (const [orgId, orgContexts] of orgGroups) {
    const userIds = [...new Set(orgContexts.map((c) => c.recipientUserId))];
    const [users, orgSettings] = await fetchUsersAndSettingsBatch(
      userIds,
      orgId,
    );
    const userMap = new Map(
      users.map((u) => [u._id.toString(), u as UserLean]),
    );
    for (const context of orgContexts) {
      const user = userMap.get(context.recipientUserId);
      results.push(
        processContext(
          context,
          user || undefined,
          orgSettings as SettingsLean | null,
        ),
      );
    }
  }

  return results;
}

export async function getUserEffectiveNotificationSettings(
  userId: string,
  organizationId: string,
  jobId?: string,
): Promise<{
  email: Record<NotificationType, { enabled: boolean; source: string }>;
  inApp: Record<NotificationType, { enabled: boolean; source: string }>;
  jobLevel?: {
    email: Record<NotificationType, { enabled: boolean; source: string }>;
    inApp: Record<NotificationType, { enabled: boolean; source: string }>;
  };
}> {
  try {
    const [user, orgSettings] = await fetchUserAndSettings(
      userId,
      organizationId,
    );
    if (!user) throw new Error('User not found');
    const notificationTypes = Object.values(
      NotificationType,
    ) as NotificationType[];
    const categories: ('email' | 'inApp')[] = ['email', 'inApp'];
    const result = {
      email: {} as Record<
        NotificationType,
        { enabled: boolean; source: string }
      >,
      inApp: {} as Record<
        NotificationType,
        { enabled: boolean; source: string }
      >,
      ...(jobId && {
        jobLevel: {
          email: {} as Record<
            NotificationType,
            { enabled: boolean; source: string }
          >,
          inApp: {} as Record<
            NotificationType,
            { enabled: boolean; source: string }
          >,
        },
      }),
    };

    for (const type of notificationTypes) {
      for (const category of categories) {
        const context: NotificationDecisionContext = {
          organizationId,
          recipientUserId: userId,
          notificationType: type,
          notificationCategory: category,
          ...(jobId && { jobId }),
        };
        const decision = resolveNotificationSetting(user, orgSettings, context);
        const setting = {
          enabled: decision.shouldSend,
          source: decision.effectiveSettings.source,
        };
        result[category][type] = setting;
        if (jobId && result.jobLevel) {
          result.jobLevel[category][type] = setting;
        }
      }
    }

    return result;
  } catch (error) {
    logger.error('Error getting user effective notification settings:', error);
    throw error;
  }
}

export type {
  NotificationDecisionContext,
  NotificationDecisionResult,
  EmailNotificationType,
} from './types';

export {
  NotificationType,
  NotificationType as NotificationTypeEnum,
} from '@/lib/models/notification';
