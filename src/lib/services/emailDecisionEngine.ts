import dbConnect, { User, Settings } from "@/lib/mongodb";
import { EmailNotificationSettings } from "@/lib/models/user";
import { OrganizationEmailNotifications } from "@/lib/models/settings";
import mongoose from "mongoose";

export type EmailNotificationType =
  | 'newApplications'
  | 'interviewAssignments'
  | 'statusUpdates'
  | 'newRemarks'
  | 'stepCompleted'
  | 'mentions';

export interface EmailDecisionContext {
  organizationId: string;
  recipientUserId: string;
  notificationType: EmailNotificationType;
  jobId?: string;
  triggererUserId?: string;
  isMention?: boolean;
}

export interface EmailDecisionResult {
  shouldSend: boolean;
  reason: string;
  effectiveSettings: {
    source: 'job-level' | 'global-user' | 'admin-override' | 'org-default';
    enabled: boolean;
  };
}

/**
 * Determine if an email notification should be sent to a user
 * Implements the priority chain:
 * 1. Job-Level User Settings (highest priority)
 * 2. Global User Settings
 * 3. Admin Override for User
 * 4. Organization Default Settings (lowest priority)
 */
export async function shouldSendEmailNotification(
  context: EmailDecisionContext
): Promise<EmailDecisionResult> {
  try {
    await dbConnect();

    // Skip if no recipient
    if (!context.recipientUserId) {
      return {
        shouldSend: false,
        reason: 'No recipient user ID provided',
        effectiveSettings: { source: 'org-default', enabled: false }
      };
    }

    // Skip if triggerer is the same as recipient (user shouldn't get notifications for their own actions)
    if (context.triggererUserId && context.triggererUserId === context.recipientUserId) {
      return {
        shouldSend: false,
        reason: 'User triggered the action themselves',
        effectiveSettings: { source: 'org-default', enabled: false }
      };
    }

    // Get user and organization settings
    const [user, orgSettings] = await Promise.all([
      User.findById(context.recipientUserId)
        .select('emailNotificationSettings role')
        .lean(),
      Settings.findOne({
        organizationId: new mongoose.Types.ObjectId(context.organizationId)
      })
        .select('organizationEmailNotifications')
        .lean()
    ]);

    if (!user) {
      return {
        shouldSend: false,
        reason: 'Recipient user not found',
        effectiveSettings: { source: 'org-default', enabled: false }
      };
    }

    // Only send notifications to admin, hr, and interviewer roles
    if (!['admin', 'hr', 'interviewer'].includes(user.role)) {
      return {
        shouldSend: false,
        reason: `User role '${user.role}' is not eligible for email notifications`,
        effectiveSettings: { source: 'org-default', enabled: false }
      };
    }

    // Handle mention notifications specially
    if (context.isMention) {
      const mentionDecision = await resolveMentionNotificationSetting(
        user,
        orgSettings,
        context
      );
      return mentionDecision;
    }

    // Resolve notification setting based on priority chain
    const settingDecision = await resolveNotificationSetting(
      user,
      orgSettings,
      context
    );

    return settingDecision;

  } catch (error) {
    console.error('Error in email decision engine:', error);
    return {
      shouldSend: false,
      reason: `Error determining email notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      effectiveSettings: { source: 'org-default', enabled: false }
    };
  }
}

/**
 * Resolve notification setting based on priority chain
 */
async function resolveNotificationSetting(
  user: any,
  orgSettings: any,
  context: EmailDecisionContext
): Promise<EmailDecisionResult> {
  const notificationType = context.notificationType;

  // 1. Job-Level User Settings (highest priority)
  if (context.jobId && user.emailNotificationSettings?.jobLevel) {
    const jobSettings = user.emailNotificationSettings.jobLevel.get?.(context.jobId) ||
                       user.emailNotificationSettings.jobLevel[context.jobId];

    if (jobSettings && jobSettings[notificationType] !== undefined) {
      return {
        shouldSend: jobSettings[notificationType],
        reason: `Job-level setting for ${notificationType}`,
        effectiveSettings: {
          source: 'job-level',
          enabled: jobSettings[notificationType]
        }
      };
    }
  }

  // 2. Global User Settings
  if (user.emailNotificationSettings?.global?.[notificationType] !== undefined) {
    return {
      shouldSend: user.emailNotificationSettings.global[notificationType],
      reason: `Global user setting for ${notificationType}`,
      effectiveSettings: {
        source: 'global-user',
        enabled: user.emailNotificationSettings.global[notificationType]
      }
    };
  }

  // 3. Admin Override for User
  if (orgSettings?.organizationEmailNotifications?.adminOverrides) {
    const adminOverride = orgSettings.organizationEmailNotifications.adminOverrides.get?.(context.recipientUserId) ||
                         orgSettings.organizationEmailNotifications.adminOverrides[context.recipientUserId];

    if (adminOverride && adminOverride[notificationType] !== undefined) {
      return {
        shouldSend: adminOverride[notificationType],
        reason: `Admin override setting for ${notificationType}`,
        effectiveSettings: {
          source: 'admin-override',
          enabled: adminOverride[notificationType]
        }
      };
    }
  }

  // 4. Organization Default Settings (lowest priority)
  const defaultEnabled = orgSettings?.organizationEmailNotifications?.defaultSettings?.[notificationType] ?? true;

  return {
    shouldSend: defaultEnabled,
    reason: `Organization default setting for ${notificationType}`,
    effectiveSettings: {
      source: 'org-default',
      enabled: defaultEnabled
    }
  };
}

/**
 * Handle mention notifications with deduplication logic
 * If user has both newRemarks and mentions enabled, only send mention email
 */
async function resolveMentionNotificationSetting(
  user: any,
  orgSettings: any,
  context: EmailDecisionContext
): Promise<EmailDecisionResult> {
  // Check mention setting
  const mentionContext = { ...context, notificationType: 'mentions' as EmailNotificationType };
  const mentionDecision = await resolveNotificationSetting(user, orgSettings, mentionContext);

  if (!mentionDecision.shouldSend) {
    return {
      shouldSend: false,
      reason: `Mention notifications disabled: ${mentionDecision.reason}`,
      effectiveSettings: mentionDecision.effectiveSettings
    };
  }

  // Mentions are enabled, send the notification
  return {
    shouldSend: true,
    reason: `Mention notification enabled: ${mentionDecision.reason}`,
    effectiveSettings: mentionDecision.effectiveSettings
  };
}

/**
 * Batch check for multiple users - more efficient for bulk operations
 */
export async function batchCheckEmailNotifications(
  contexts: EmailDecisionContext[]
): Promise<EmailDecisionResult[]> {
  const results: EmailDecisionResult[] = [];

  // Group by organization to optimize database queries
  const orgGroups = new Map<string, EmailDecisionContext[]>();

  contexts.forEach(context => {
    if (!orgGroups.has(context.organizationId)) {
      orgGroups.set(context.organizationId, []);
    }
    orgGroups.get(context.organizationId)!.push(context);
  });

  // Process each organization group
  for (const [orgId, orgContexts] of orgGroups) {
    const userIds = [...new Set(orgContexts.map(c => c.recipientUserId))];

    // Batch fetch users and org settings
    const [users, orgSettings] = await Promise.all([
      User.find({ _id: { $in: userIds } })
        .select('_id emailNotificationSettings role')
        .lean(),
      Settings.findOne({
        organizationId: new mongoose.Types.ObjectId(orgId)
      })
        .select('organizationEmailNotifications')
        .lean()
    ]);

    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    // Process each context in this organization
    for (const context of orgContexts) {
      const user = userMap.get(context.recipientUserId);

      if (!user) {
        results.push({
          shouldSend: false,
          reason: 'Recipient user not found',
          effectiveSettings: { source: 'org-default', enabled: false }
        });
        continue;
      }

      // Skip if triggerer is the same as recipient
      if (context.triggererUserId && context.triggererUserId === context.recipientUserId) {
        results.push({
          shouldSend: false,
          reason: 'User triggered the action themselves',
          effectiveSettings: { source: 'org-default', enabled: false }
        });
        continue;
      }

      // Skip non-eligible roles
      if (!['admin', 'hr', 'interviewer'].includes(user.role)) {
        results.push({
          shouldSend: false,
          reason: `User role '${user.role}' is not eligible for email notifications`,
          effectiveSettings: { source: 'org-default', enabled: false }
        });
        continue;
      }

      // Resolve setting
      let decision: EmailDecisionResult;
      if (context.isMention) {
        decision = await resolveMentionNotificationSetting(user, orgSettings, context);
      } else {
        decision = await resolveNotificationSetting(user, orgSettings, context);
      }

      results.push(decision);
    }
  }

  return results;
}

/**
 * Get effective settings for a user (for UI display)
 */
export async function getUserEffectiveEmailSettings(
  userId: string,
  organizationId: string,
  jobId?: string
): Promise<{
  global: Record<EmailNotificationType, { enabled: boolean; source: string }>;
  jobLevel?: Record<EmailNotificationType, { enabled: boolean; source: string }>;
}> {
  try {
    await dbConnect();

    const [user, orgSettings] = await Promise.all([
      User.findById(userId)
        .select('emailNotificationSettings role')
        .lean(),
      Settings.findOne({
        organizationId: new mongoose.Types.ObjectId(organizationId)
      })
        .select('organizationEmailNotifications')
        .lean()
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    const notificationTypes: EmailNotificationType[] = [
      'newApplications',
      'interviewAssignments',
      'statusUpdates',
      'newRemarks',
      'stepCompleted',
      'mentions'
    ];

    const global: Record<EmailNotificationType, { enabled: boolean; source: string }> = {} as any;
    const jobLevel: Record<EmailNotificationType, { enabled: boolean; source: string }> = {} as any;

    for (const type of notificationTypes) {
      // Global settings
      const globalContext: EmailDecisionContext = {
        organizationId,
        recipientUserId: userId,
        notificationType: type,
      };

      const globalDecision = await resolveNotificationSetting(user, orgSettings, globalContext);
      global[type] = {
        enabled: globalDecision.shouldSend,
        source: globalDecision.effectiveSettings.source
      };

      // Job-level settings if jobId provided
      if (jobId) {
        const jobContext: EmailDecisionContext = {
          organizationId,
          recipientUserId: userId,
          notificationType: type,
          jobId,
        };

        const jobDecision = await resolveNotificationSetting(user, orgSettings, jobContext);
        jobLevel[type] = {
          enabled: jobDecision.shouldSend,
          source: jobDecision.effectiveSettings.source
        };
      }
    }

    return jobId ? { global, jobLevel } : { global };

  } catch (error) {
    console.error('Error getting user effective email settings:', error);
    throw error;
  }
}