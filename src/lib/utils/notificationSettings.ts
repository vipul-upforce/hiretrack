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
  "candidateMoved",
] as const;

/**
 * Set of valid notification types for fast lookup
 * Used for validation and safe property access
 */
const VALID_NOTIFICATION_TYPES_SET = new Set<EmailNotificationType>(
  ALL_NOTIFICATION_TYPES,
);

/**
 * Type guard to validate if a string is a valid EmailNotificationType
 */
function isValidNotificationType(
  key: string,
): key is EmailNotificationType {
  return VALID_NOTIFICATION_TYPES_SET.has(key as EmailNotificationType);
}

/**
 * Safely get a value from a record using validated notification type key
 * Prevents Object Injection Sink warnings by validating keys
 * Works with both Record types and interfaces with specific properties
 */
export function safeGetNotificationValue<T>(
  record: Record<string, T> | Record<EmailNotificationType, T> | undefined | null,
  type: EmailNotificationType,
): T | undefined {
  if (!record || !isValidNotificationType(type)) {
    return undefined;
  }
  // Use Reflect.get to avoid Object Injection Sink warnings
  // Key is validated as a valid EmailNotificationType before access
  return Reflect.get(record, type) as T | undefined;
}

/**
 * Safely set a value in a record using validated notification type key
 * Prevents Object Injection Sink warnings by validating keys
 */
export function safeSetNotificationValue<T>(
  record: Record<EmailNotificationType, T>,
  type: EmailNotificationType,
  value: T,
): void {
  if (!isValidNotificationType(type)) {
    return;
  }
  // Use Reflect.set to avoid Object Injection Sink warnings
  // Key is validated as a valid EmailNotificationType before access
  Reflect.set(record, type, value);
}

/**
 * Create default notification settings with all types enabled
 */
export const createDefaultNotificationSettings = (): Record<
  EmailNotificationType,
  boolean
> => Object.fromEntries(
    ALL_NOTIFICATION_TYPES.map((type) => [type, true])
  ) as Record<EmailNotificationType, boolean>;

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
  adminOverrides: Record<string, boolean> | undefined | null,
  effectiveSettings?: Record<string, { enabled: boolean; source: string }>,
  fallback: NotificationSource = "global-user"
): NotificationSource {
  // Check admin override first (highest priority)
  const adminOverrideValue = safeGetNotificationValue(adminOverrides, type);
  if (adminOverrideValue === false) {
    return "admin-override";
  }

  // Check effective settings
  const effectiveSetting = safeGetNotificationValue(effectiveSettings, type);
  if (effectiveSetting?.source) {
    return effectiveSetting.source as NotificationSource;
  }

  return fallback;
}

/**
 * Whether the toggle is locked by admin override
 * Optimized with safe property access
 */
export function isAdminOverrideDisabled(
  type: EmailNotificationType,
  adminOverrides: Record<string, boolean> | undefined | null
): boolean {
  const overrideValue = safeGetNotificationValue(adminOverrides, type);
  return overrideValue === false;
}

