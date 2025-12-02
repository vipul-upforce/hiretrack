import connectToDatabase, { User, Settings } from "@/lib/mongodb";
import { EmailNotificationSettings } from "@/lib/models/user";
import { OrganizationEmailNotifications } from "@/lib/models/settings";
import mongoose from "mongoose";

export type EmailNotificationType =
  | "newApplications"
  | "interviewAssignments"
  | "statusUpdates"
  | "newRemarks"
  | "stepCompleted"
  | "mentions";

export enum NotificationType {
  NEW_APPLICATIONS = "newApplications",
  INTERVIEW_ASSIGNMENTS = "interviewAssignments",
  STATUS_UPDATES = "statusUpdates",
  NEW_REMARKS = "newRemarks",
  STEP_COMPLETED = "stepCompleted",
  MENTIONS = "mentions",

  // CANDIDATE_APPLIED = "newApplications",
  // CANDIDATE_STATUS_UPDATED = "statusUpdates",
  // CANDIDATE_ASSIGNED = "interviewAssignmentsd",
  // CANDIDATE_UNASSIGNED = "stepCompleted",
  // REMARK_ADDED = "newRemarks",
  CANDIDATE_DETAILS_UPDATED = "detailsUpdated",
  MEETING_SCHEDULED = "meetingScheduled",
  MEETING_UPDATED = "meetingUpdated",
  MEETING_CANCELLED = "meetingCancelled",
  MEETING_INVITE_ACCEPTED = "meetingInviteAccepted",
  MEETING_INVITE_DECLINED = "meetingInviteDeclined",
  MEETING_INVITE_TENTATIVE = "meetingInviteTentative",
  FOLLOWUP_ADDED = "followupAdded",
  FOLLOWUP_UPDATED = "followupUpdated",
  FOLLOWUP_REMOVED = "followupRemoved",
  CHECKLIST_COMPLETED = "checklistCompleted",
  JOB_CREATED = "jobCreated",
  JOB_UPDATED = "jobUpdated",
  USER_ADDED = "userAdded",
  BULK_IMPORT_COMPLETED = "bulkImportCompleted",
  CANDIDATE_REJECTED = "candidateRejected",
  INTERVIEW_COMPLETED = "interviewCompleted",
}
export interface NotificationDecisionContext {
  organizationId: string;
  recipientUserId: string;
  notificationType: NotificationType;
  jobId?: string;
  triggererUserId?: string;
  isMention?: boolean;
  notificationCategory: "email" | "inApp";
}

export interface NotificationDecisionResult {
  shouldSend: boolean;
  reason: string;
  effectiveSettings: {
    source: "job-level" | "global-user" | "admin-override" | "org-default";
    enabled: boolean;
    category: "email" | "inApp";
  };
}

/**
 * Determine if a notification (email or in-app) should be sent to a user
 * Implements the priority chain:
 * 1. Job-Level User Settings (highest priority)
 * 2. Global User Settings
 * 3. Admin Override for User
 * 4. Organization Default Settings (lowest priority)
 */
export async function shouldSendNotification(
  context: NotificationDecisionContext
): Promise<NotificationDecisionResult> {
  try {
    await connectToDatabase();

    // Skip if no recipient
    if (!context.recipientUserId) {
      return {
        shouldSend: false,
        reason: "No recipient user ID provided",
        effectiveSettings: {
          source: "org-default",
          enabled: false,
          category: context.notificationCategory,
        },
      };
    }

    // Skip if triggerer is the same as recipient
    if (
      context.triggererUserId &&
      context.triggererUserId === context.recipientUserId
    ) {
      return {
        shouldSend: false,
        reason: "User triggered the action themselves",
        effectiveSettings: {
          source: "org-default",
          enabled: false,
          category: context.notificationCategory,
        },
      };
    }

    // Get user and organization settings
    const [user, orgSettings] = await Promise.all([
      User.findById(context.recipientUserId)
        .select("emailNotificationSettings  role")
        .lean(),
      Settings.findOne({
        organizationId: new mongoose.Types.ObjectId(context.organizationId),
      })
        .select("organizationEmailNotifications ")
        .lean(),
    ]);

    if (!user) {
      return {
        shouldSend: false,
        reason: "Recipient user not found",
        effectiveSettings: {
          source: "org-default",
          enabled: false,
          category: context.notificationCategory,
        },
      };
    }

    // Only send notifications to admin, hr, and interviewer roles
    if (!["admin", "hr", "interviewer"].includes(user.role)) {
      return {
        shouldSend: false,
        reason: `User role '${user.role}' is not eligible for notifications`,
        effectiveSettings: {
          source: "org-default",
          enabled: false,
          category: context.notificationCategory,
        },
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
    console.error("Error in notification decision engine:", error);
    return {
      shouldSend: false,
      reason: `Error determining notification: ${error instanceof Error ? error.message : "Unknown error"}`,
      effectiveSettings: {
        source: "org-default",
        enabled: false,
        category: context.notificationCategory,
      },
    };
  }
}

/**
 * Resolve notification setting based on priority chain
 */
async function resolveNotificationSetting(
  user: any,
  orgSettings: any,
  context: NotificationDecisionContext
): Promise<NotificationDecisionResult> {
  const notificationType = context.notificationType;
  const settingsKey =
    context.notificationCategory === "email" ? "emailNotificationSettings" : "";
  const orgSettingsKey =
    context.notificationCategory === "email"
      ? "organizationEmailNotifications"
      : "";

  // 1. Job-Level User Settings (highest priority)
  if (context.jobId && user[settingsKey]?.jobLevel) {
    const jobSettings =
      user[settingsKey].jobLevel.get?.(context.jobId) ||
      user[settingsKey].jobLevel[context.jobId];

    if (jobSettings && jobSettings[notificationType] !== undefined) {
      return {
        shouldSend: jobSettings[notificationType],
        reason: `Job-level ${context.notificationCategory} setting for ${notificationType}`,
        effectiveSettings: {
          source: "job-level",
          enabled: jobSettings[notificationType],
          category: context.notificationCategory,
        },
      };
    }
  }

  // 2. Global User Settings
  if (user[settingsKey]?.global?.[notificationType] !== undefined) {
    return {
      shouldSend: user[settingsKey].global[notificationType],
      reason: `Global user ${context.notificationCategory} setting for ${notificationType}`,
      effectiveSettings: {
        source: "global-user",
        enabled: user[settingsKey].global[notificationType],
        category: context.notificationCategory,
      },
    };
  }

  // 3. Admin Override for User
  if (orgSettings?.[orgSettingsKey]?.adminOverrides) {
    const adminOverride =
      orgSettings[orgSettingsKey].adminOverrides.get?.(
        context.recipientUserId
      ) || orgSettings[orgSettingsKey].adminOverrides[context.recipientUserId];

    if (adminOverride && adminOverride[notificationType] !== undefined) {
      return {
        shouldSend: adminOverride[notificationType],
        reason: `Admin override ${context.notificationCategory} setting for ${notificationType}`,
        effectiveSettings: {
          source: "admin-override",
          enabled: adminOverride[notificationType],
          category: context.notificationCategory,
        },
      };
    }
  }

  // 4. Organization Default Settings (lowest priority)
  const defaultEnabled =
    orgSettings?.[orgSettingsKey]?.defaultSettings?.[notificationType] ?? true;

  return {
    shouldSend: defaultEnabled,
    reason: `Organization default ${context.notificationCategory} setting for ${notificationType}`,
    effectiveSettings: {
      source: "org-default",
      enabled: defaultEnabled,
      category: context.notificationCategory,
    },
  };
}

/**
 * Handle mention notifications with deduplication logic
 */
async function resolveMentionNotificationSetting(
  user: any,
  orgSettings: any,
  context: NotificationDecisionContext
): Promise<NotificationDecisionResult> {
  const mentionContext = {
    ...context,
    notificationType: NotificationType.MENTIONS,
  };
  const mentionDecision = await resolveNotificationSetting(
    user,
    orgSettings,
    mentionContext
  );

  if (!mentionDecision.shouldSend) {
    return {
      shouldSend: false,
      reason: `Mention ${context.notificationCategory} notifications disabled: ${mentionDecision.reason}`,
      effectiveSettings: mentionDecision.effectiveSettings,
    };
  }

  return {
    shouldSend: true,
    reason: `Mention ${context.notificationCategory} notification enabled: ${mentionDecision.reason}`,
    effectiveSettings: mentionDecision.effectiveSettings,
  };
}

/**
 * Batch check for multiple users - more efficient for bulk operations
 */
export async function batchCheckNotifications(
  contexts: NotificationDecisionContext[]
): Promise<NotificationDecisionResult[]> {
  const results: NotificationDecisionResult[] = [];

  // Group by organization to optimize database queries
  const orgGroups = new Map<string, NotificationDecisionContext[]>();

  contexts.forEach((context) => {
    if (!orgGroups.has(context.organizationId)) {
      orgGroups.set(context.organizationId, []);
    }
    orgGroups.get(context.organizationId)!.push(context);
  });

  // Process each organization group
  for (const [orgId, orgContexts] of orgGroups) {
    const userIds = [...new Set(orgContexts.map((c) => c.recipientUserId))];

    // Batch fetch users and org settings
    const [users, orgSettings] = await Promise.all([
      User.find({ _id: { $in: userIds } })
        // .select("_id emailNotificationSettings inAppNotificationSettings role")
        .select("_id emailNotificationSettings  role")
        .lean(),
      Settings.findOne({
        organizationId: new mongoose.Types.ObjectId(orgId),
      })
        // .select("organizationEmailNotifications organizationInAppNotifications")
        .select("organizationEmailNotifications ")
        .lean(),
    ]);

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    // Process each context in this organization
    for (const context of orgContexts) {
      const user = userMap.get(context.recipientUserId);

      if (!user) {
        results.push({
          shouldSend: false,
          reason: "Recipient user not found",
          effectiveSettings: {
            source: "org-default",
            enabled: false,
            category: context.notificationCategory,
          },
        });
        continue;
      }

      // Skip if triggerer is the same as recipient
      if (
        context.triggererUserId &&
        context.triggererUserId === context.recipientUserId
      ) {
        results.push({
          shouldSend: false,
          reason: "User triggered the action themselves",
          effectiveSettings: {
            source: "org-default",
            enabled: false,
            category: context.notificationCategory,
          },
        });
        continue;
      }

      // Skip non-eligible roles
      if (!["admin", "hr", "interviewer"].includes(user.role)) {
        results.push({
          shouldSend: false,
          reason: `User role '${user.role}' is not eligible for notifications`,
          effectiveSettings: {
            source: "org-default",
            enabled: false,
            category: context.notificationCategory,
          },
        });
        continue;
      }

      // Resolve setting
      let decision: NotificationDecisionResult;
      if (context.isMention) {
        decision = await resolveMentionNotificationSetting(
          user,
          orgSettings,
          context
        );
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
export async function getUserEffectiveNotificationSettings(
  userId: string,
  organizationId: string,
  jobId?: string
): Promise<{
  email: Record<NotificationType, { enabled: boolean; source: string }>;
  inApp: Record<NotificationType, { enabled: boolean; source: string }>;
  jobLevel?: {
    email: Record<NotificationType, { enabled: boolean; source: string }>;
    inApp: Record<NotificationType, { enabled: boolean; source: string }>;
  };
}> {
  try {
    await connectToDatabase();

    const [user, orgSettings] = await Promise.all([
      User.findById(userId).select("emailNotificationSettings  role").lean(),
      Settings.findOne({
        organizationId: new mongoose.Types.ObjectId(organizationId),
      })
        .select("organizationEmailNotifications")
        .lean(),
    ]);

    if (!user) {
      throw new Error("User not found");
    }

    const notificationTypes: NotificationType[] = [
      NotificationType.NEW_APPLICATIONS,
      NotificationType.INTERVIEW_ASSIGNMENTS,
      NotificationType.STATUS_UPDATES,
      NotificationType.NEW_REMARKS,
      NotificationType.STEP_COMPLETED,
      NotificationType.MENTIONS,
      // NotificationType.CANDIDATE_APPLIED,
      // NotificationType.CANDIDATE_STATUS_UPDATED,
      NotificationType.CANDIDATE_DETAILS_UPDATED,
      // NotificationType.CANDIDATE_ASSIGNED,
      // NotificationType.CANDIDATE_UNASSIGNED,
      // NotificationType.REMARK_ADDED,
      NotificationType.MEETING_SCHEDULED,
      NotificationType.MEETING_UPDATED,
      NotificationType.MEETING_CANCELLED,
      NotificationType.MEETING_INVITE_ACCEPTED,
      NotificationType.MEETING_INVITE_DECLINED,
      NotificationType.MEETING_INVITE_TENTATIVE,
      NotificationType.FOLLOWUP_ADDED,
      NotificationType.FOLLOWUP_UPDATED,
      NotificationType.FOLLOWUP_REMOVED,
      NotificationType.CHECKLIST_COMPLETED,
      NotificationType.JOB_CREATED,
      NotificationType.JOB_UPDATED,
      NotificationType.USER_ADDED,
      NotificationType.BULK_IMPORT_COMPLETED,
      NotificationType.CANDIDATE_REJECTED,
      NotificationType.INTERVIEW_COMPLETED,
    ];

    const email: Record<
      NotificationType,
      { enabled: boolean; source: string }
    > = {} as any;
    const inApp: Record<
      NotificationType,
      { enabled: boolean; source: string }
    > = {} as any;
    const jobLevel: {
      email: Record<NotificationType, { enabled: boolean; source: string }>;
      inApp: Record<NotificationType, { enabled: boolean; source: string }>;
    } = { email: {} as any, inApp: {} as any };
    const global: {
      email: Record<NotificationType, { enabled: boolean; source: string }>;
      inApp: Record<NotificationType, { enabled: boolean; source: string }>;
    } = { email: {} as any, inApp: {} as any };

    for (const type of notificationTypes) {
      // Email settings
      const emailContext: NotificationDecisionContext = {
        organizationId,
        recipientUserId: userId,
        notificationType: type,
        notificationCategory: "email",
      };
      const emailDecision = await resolveNotificationSetting(
        user,
        orgSettings,
        emailContext
      );
      email[type] = {
        enabled: emailDecision.shouldSend,
        source: emailDecision.effectiveSettings.source,
      };

      // In-app settings
      const inAppContext: NotificationDecisionContext = {
        organizationId,
        recipientUserId: userId,
        notificationType: type,
        notificationCategory: "email",
      };
      const inAppDecision = await resolveNotificationSetting(
        user,
        orgSettings,
        inAppContext
      );
      inApp[type] = {
        enabled: inAppDecision.shouldSend,
        source: inAppDecision.effectiveSettings.source,
      };

      // Job-level settings if jobId provided
      if (jobId) {
        const jobEmailContext: NotificationDecisionContext = {
          organizationId,
          recipientUserId: userId,
          notificationType: type,
          jobId,
          notificationCategory: "email",
        };
        const jobEmailDecision = await resolveNotificationSetting(
          user,
          orgSettings,
          jobEmailContext
        );
        jobLevel.email[type] = {
          enabled: jobEmailDecision.shouldSend,
          source: jobEmailDecision.effectiveSettings.source,
        };

        const jobInAppContext: NotificationDecisionContext = {
          organizationId,
          recipientUserId: userId,
          notificationType: type,
          jobId,
          notificationCategory: "email",
        };
        const jobInAppDecision = await resolveNotificationSetting(
          user,
          orgSettings,
          jobInAppContext
        );
        jobLevel.inApp[type] = {
          enabled: jobInAppDecision.shouldSend,
          source: jobInAppDecision.effectiveSettings.source,
        };
      }
    }

    return jobId ? { email, inApp, jobLevel } : { email, inApp };
  } catch (error) {
    console.error("Error getting user effective notification settings:", error);
    throw error;
  }
}
