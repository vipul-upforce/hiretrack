/**
 * Shared utilities for email notification settings
 */

import { EmailNotificationType } from "@/components/ui/email-notification-toggle";

/**
 * All notification types as an array
 * Used across all notification settings dialogs
 */
export const ALL_NOTIFICATION_TYPES: EmailNotificationType[] = [
  "mentions",
  "newRemarks",
  "newApplications",
  "statusUpdates",
  "detailsUpdated",
  "interviewAssignments",
  "stepCompleted",
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
] as const;

/**
 * Create default notification settings with all types enabled
 */
export const createDefaultNotificationSettings = (): Record<
  EmailNotificationType,
  boolean
> => {
  return Object.fromEntries(
    ALL_NOTIFICATION_TYPES.map((type) => [type, true])
  ) as Record<EmailNotificationType, boolean>;
};

/**
 * Type for admin override settings
 */
export type AdminOverrideSettings = Record<string, boolean>;

/**
 * Source type for notification settings
 */
export type NotificationSource =
  | "job-level"
  | "global-user"
  | "admin-override"
  | "org-default";

/**
 * Get source for a notification type
 * Unified logic usable for job-level, global-user, org-default
 */
export function resolveNotificationSource(
  type: EmailNotificationType,
  adminOverrides: Record<string, boolean>,
  effectiveSettings?: Record<string, { enabled: boolean; source: string }>,
  fallback: NotificationSource = "global-user"
): NotificationSource {
  if (adminOverrides?.[type] === false) {
    return "admin-override";
  }

  if (effectiveSettings?.[type]?.source) {
    return effectiveSettings[type].source as NotificationSource;
  }

  return fallback;
}

/**
 * Whether the toggle is locked by admin override
 */
export function isAdminOverrideDisabled(
  type: EmailNotificationType,
  adminOverrides: Record<string, boolean>
): boolean {
  return adminOverrides?.[type] === false;
}

