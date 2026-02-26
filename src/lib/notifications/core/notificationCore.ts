import connectToDatabase, { Notification } from '@/lib/mongodb';
import {
  broadcastNotification,
  broadcastNotifications,
  broadcastNotificationCount,
} from '@/lib/broadcast/broadcastNotifications';
import { INotification } from '@/lib/models/notification';
import logger from '@/lib/logger';
import { CreateNotificationParams } from '../types';

/**
 * Creates a single notification and broadcasts it
 */
export async function createNotification(
  params: CreateNotificationParams,
): Promise<INotification | null> {
  try {
    await connectToDatabase();

    if (!Notification) {
      throw new Error('Notification model not available');
    }

    const notification = await Notification.create({
      organizationId: params.organizationId,
      recipientId: params.recipientId,
      type: params.type,
      title: params.title,
      message: params.message,
      relatedEntity: params.relatedEntity,
      relatedId: params.relatedId,
      actionUrl: params.actionUrl,
      triggerUserId: params.triggerUserId,
      triggerUserName: params.triggerUserName,
      priority: params.priority || 'medium',
      metadata: params.metadata || {},
      isRead: false,
      createdAt: new Date(), // Explicit timestamp - guaranteed to exist and be accurate
    });

    const obj = notification.toObject();

    try {
      await broadcastNotification(
        params.organizationId,
        params.recipientId,
        obj,
      );
      const unread = await Notification.countDocuments({
        organizationId: params.organizationId,
        recipientId: params.recipientId,
        isRead: false,
      });
      broadcastNotificationCount(
        params.organizationId,
        params.recipientId,
        unread,
      );
    } catch (e) {
      logger.error('Failed to broadcast notification:', e);
    }

    return obj;
  } catch (error) {
    logger.error('❌ Error creating notification:', error);
    return null;
  }
}

/**
 * Creates multiple notifications for different recipients
 */
export async function createBulkNotifications(
  baseParams: Omit<CreateNotificationParams, 'recipientId'>,
  recipientIds: string[],
): Promise<INotification[]> {
  try {
    await connectToDatabase();

    if (!Notification) {
      throw new Error('Notification model not available');
    }

    const recipients = recipientIds.filter(
      (id) =>
        id !== baseParams.triggerUserId &&
        id !== baseParams.metadata?.interviewerId,
    );

    const notifications = recipients.map((recipientId) => ({
      organizationId: baseParams.organizationId,
      recipientId,
      type: baseParams.type,
      title: baseParams.title,
      message: baseParams.message,
      relatedEntity: baseParams.relatedEntity,
      relatedId: baseParams.relatedId,
      actionUrl: baseParams.actionUrl,
      triggerUserId: baseParams.triggerUserId,
      triggerUserName: baseParams.triggerUserName,
      priority: baseParams.priority || 'medium',
      metadata: baseParams.metadata || {},
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const createdNotifications = await Notification.insertMany(notifications);
    const created = createdNotifications.map((n) => n.toObject());

    try {
      await broadcastNotifications(baseParams.organizationId, created);
      const uniqueRecipients = Array.from(
        new Set(created.map((n) => n.recipientId)),
      );
      for (const recipientId of uniqueRecipients) {
        const unread = await Notification.countDocuments({
          organizationId: baseParams.organizationId,
          recipientId,
          isRead: false,
        });
        broadcastNotificationCount(
          baseParams.organizationId,
          recipientId,
          unread,
        );
      }
    } catch (e) {
      logger.error('Failed to broadcast bulk notifications:', e);
    }

    return created;
  } catch (error) {
    logger.error('❌ Error creating bulk notifications:', error);
    return [];
  }
}
