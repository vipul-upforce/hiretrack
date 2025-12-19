/**
 * Main exports for the notifications module
 * Provides a clean, centralized API for all notification functionality
 */

// Core notification service
export { NotificationService } from './notificationService';
export type { CreateNotificationParams } from './types';

// Notification models and types
export {
  NotificationType,
  type INotification,
  type RelatedEntityType,
} from '@/lib/models/notification';

// Decision engine
export {
  shouldSendNotification,
  batchCheckNotifications,
  getUserEffectiveNotificationSettings,
  NotificationType as NotificationTypeEnum,
  type NotificationDecisionContext,
  type NotificationDecisionResult,
  type EmailNotificationType,
} from './decision';

// Email services
export {
  sendUnifiedMail,
  sendEventEmailWithHistory,
  sendSmartNotification,
} from './email/unifiedEmailService';
export { sendMail } from './email/emailService';

// Settings
export {
  getOrganizationEmailNotifications,
  getAdminUsers,
  updateOrganizationEmailNotifications,
  getExistingSettings,
  type UserInfo,
} from './settings/emailNotificationService';
export {
  safeSet,
  safeGet,
  mapToObject,
  objectToMap,
  mergeAdminOverrides,
  type AdminOverrideSettings,
} from './settings/helpers';
export {
  validateDefaultSettings,
  validateAdminOverrides,
  verifyUsersExist,
} from './settings/validators';
export {
  ALL_NOTIFICATION_TYPES,
  safeGetNotificationValue,
  safeSetNotificationValue,
  createDefaultNotificationSettings,
  resolveNotificationSource,
  isAdminOverrideDisabled,
  type NotificationSource,
} from './settings/constants';
