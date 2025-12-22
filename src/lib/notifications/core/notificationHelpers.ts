import {
  batchCheckNotifications,
  NotificationDecisionContext,
} from '../decision';
import { NotificationType } from '@/lib/models/notification';
import { CreateNotificationParams } from '../types';
import {
  createBulkNotifications,
  createNotification,
} from './notificationCore';

interface BulkNotificationOptions {
  organizationId: string;
  recipientIds: string[];
  notificationType: NotificationType;
  jobId?: string;
  triggerUserId?: string;
  isMention?: boolean;
  baseParams: Omit<CreateNotificationParams, 'recipientId'>;
}

/**
 * Helper to create bulk notifications with decision checking
 */
export async function createBulkNotificationsWithDecision(
  options: BulkNotificationOptions,
): Promise<void> {
  const {
    organizationId,
    recipientIds,
    notificationType,
    jobId,
    triggerUserId,
    isMention = false,
    baseParams,
  } = options;

  if (recipientIds.length === 0) {
    return;
  }

  const decisionContexts: NotificationDecisionContext[] = recipientIds.map(
    (userId) => ({
      organizationId,
      recipientUserId: userId,
      notificationType,
      jobId,
      triggererUserId: triggerUserId,
      isMention,
      notificationCategory: 'inApp',
    }),
  );

  const decisions = await batchCheckNotifications(decisionContexts);
  const eligibleUserIds = recipientIds.filter(
    (_userId, index) => decisions[index]?.shouldSend,
  );

  if (eligibleUserIds.length === 0) {
    return;
  }

  await createBulkNotifications(baseParams, eligibleUserIds);
}

/**
 * Helper to create a single notification with decision checking
 */
export async function createNotificationWithDecision(
  organizationId: string,
  recipientId: string,
  notificationType: NotificationType,
  jobId: string | undefined,
  triggerUserId: string | undefined,
  isMention: boolean,
  baseParams: CreateNotificationParams,
): Promise<void> {
  const decisionContext: NotificationDecisionContext = {
    organizationId,
    recipientUserId: recipientId,
    notificationType,
    jobId,
    triggererUserId: triggerUserId,
    isMention,
    notificationCategory: 'inApp',
  };

  const decisions = await batchCheckNotifications([decisionContext]);
  if (decisions[0]?.shouldSend) {
    await createNotification(baseParams);
  }
}
