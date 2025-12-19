/**
 * Re-export from modular structure for backward compatibility.
 * All imports from '@/lib/services/emailDecisionEngine' will continue to work.
 */
export {
  shouldSendNotification,
  batchCheckNotifications,
  getUserEffectiveNotificationSettings,
  NotificationType,
  NotificationTypeEnum,
  type NotificationDecisionContext,
  type NotificationDecisionResult,
  type NotificationType as NotificationTypeType,
} from './notificationDecisionEngine/index';
