import { NotificationType } from '@/lib/models/notification';
import logger from '@/lib/logger';
import { batchCheckNotifications } from '@/lib/services/emailDecisionEngine';
import { findMentionedUsers } from '@/lib/services/userMentionService';
import { getUsersByRole } from '../core/userHelpers';
import { createBulkNotificationsWithDecision } from '../core/notificationHelpers';
import { CreateNotificationParams } from '../types';
import { createBulkNotifications } from '../core/notificationCore';

export async function notifyRemarkAdded(params: {
  organizationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  remarkText: string;
  triggerUserId: string;
  triggerUserName: string;
  roles: string[];
  validMentionUserIds?: string[];
}): Promise<void> {
  try {
    const userIds = await getUsersByRole(params.organizationId, params.roles);
    const filteredIds = userIds.filter((id) => id !== params.triggerUserId);

    let mentionedUserIds: string[] = [];
    try {
      const mentionResult = await findMentionedUsers(
        params.remarkText,
        params.organizationId,
        params.validMentionUserIds,
      );
      mentionedUserIds = mentionResult.mentionedUsers.map((u) =>
        u._id.toString(),
      );
    } catch (mentionError) {
      logger.error('Error in mention detection:', mentionError);
    }

    const allRecipients = [...new Set([...filteredIds, ...mentionedUserIds])];
    if (allRecipients.length === 0) return;

    const baseParams: Omit<CreateNotificationParams, 'recipientId'> = {
      organizationId: params.organizationId,
      type: NotificationType.NEW_REMARKS,
      title: 'New Remark Added',
      message: `${params.triggerUserName} added a remark for ${params.candidateName}`,
      relatedEntity: 'candidate',
      relatedId: params.candidateId,
      actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
      triggerUserId: params.triggerUserId,
      triggerUserName: params.triggerUserName,
      priority: 'low',
      metadata: {
        candidateName: params.candidateName,
        jobTitle: params.jobTitle,
        jobId: params.jobId,
        remarkText:
          params.remarkText.substring(0, 100) +
          (params.remarkText.length > 100 ? '...' : ''),
      },
    };

    const decisionContexts = allRecipients.map((userId) => ({
      organizationId: params.organizationId,
      recipientUserId: userId,
      notificationType: mentionedUserIds.includes(userId)
        ? NotificationType.MENTIONS
        : NotificationType.NEW_REMARKS,
      jobId: params.jobId,
      triggererUserId: params.triggerUserId,
      isMention: mentionedUserIds.includes(userId),
      notificationCategory: 'inApp' as const,
    }));

    const decisions = await batchCheckNotifications(decisionContexts);
    const eligibleIds = allRecipients.filter(
      (_userId, index) => decisions[index]?.shouldSend,
    );

    if (eligibleIds.length > 0) {
      await createBulkNotifications(baseParams, eligibleIds);
    }
  } catch (error) {
    logger.error('Failed to send remark notification:', error);
  }
}

export async function notifyUserAdded(params: {
  organizationId: string;
  newUserId: string;
  newUserName: string;
  newUserEmail: string;
  newUserRole: string;
  triggerUserId: string;
  triggerUserName: string;
}): Promise<void> {
  try {
    const adminIds = await getUsersByRole(params.organizationId, [
      'admin',
      'hr',
    ]);
    const filteredIds = adminIds.filter(
      (id) => id !== params.triggerUserId && id !== params.newUserId,
    );

    await createBulkNotificationsWithDecision({
      organizationId: params.organizationId,
      recipientIds: filteredIds,
      notificationType: NotificationType.USER_ADDED,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.USER_ADDED,
        title: 'New User Added',
        message: `${params.triggerUserName} added ${params.newUserName} as ${params.newUserRole}`,
        relatedEntity: 'user',
        relatedId: params.newUserId,
        actionUrl: `/dashboard/users`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          newUserName: params.newUserName,
          newUserEmail: params.newUserEmail,
          newUserRole: params.newUserRole,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to send user added notification:', error);
  }
}

export async function notifyBulkImportCompleted(params: {
  organizationId: string;
  batchId: string;
  successCount: number;
  failureCount: number;
  triggerUserId: string;
  triggerUserName: string;
}): Promise<void> {
  try {
    const adminHrIds = await getUsersByRole(params.organizationId, [
      'admin',
      'hr',
    ]);
    const filteredIds = adminHrIds.filter((id) => id !== params.triggerUserId);

    await createBulkNotificationsWithDecision({
      organizationId: params.organizationId,
      recipientIds: filteredIds,
      notificationType: NotificationType.BULK_IMPORT_COMPLETED,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.BULK_IMPORT_COMPLETED,
        title: 'Bulk Import Completed',
        message: `${params.triggerUserName} completed processing a CV batch with ${params.successCount} successful and ${params.failureCount} failed items`,
        relatedEntity: 'cvBatch',
        relatedId: params.batchId,
        actionUrl: `/dashboard/cv-upload`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          batchId: params.batchId,
          successCount: params.successCount,
          failureCount: params.failureCount,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to send bulk import completed notification:', error);
  }
}
