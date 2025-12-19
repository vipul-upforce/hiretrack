/**
 * Backward compatibility re-export
 * @deprecated Use '@/lib/notifications' instead
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
} from '@/lib/notifications/decision';
