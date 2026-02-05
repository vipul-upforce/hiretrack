import { NotificationType } from '@/lib/models/notification';
import logger from '@/lib/logger';
import { findMentionedUsers } from '@/lib/services/userMentionService';
import { batchCheckNotifications } from '../decision';
import { getUsersByRole } from '../core/userHelpers';
import {
  createBulkNotificationsWithDecision,
  createNotificationWithDecision,
} from '../core/notificationHelpers';
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

/**
 * Bulk add remark: mentioned users get one notification per candidate (as MENTIONS);
 * admin/hr get one bulk notification (as NEW_REMARKS).
 * Mimics single notifyRemarkAdded exactly.
 */
export async function notifyBulkRemarkAdded(params: {
  organizationId: string;
  remarkText: string;
  roles: string[];
  validMentionUserIds?: string[];
  candidates: Array<{
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
  }>;
  triggerUserId: string;
  triggerUserName: string;
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

    // Mentioned users get one notification per candidate (as MENTIONS type)
    for (const c of params.candidates) {
      for (const mentionedUserId of mentionedUserIds) {
        if (mentionedUserId !== params.triggerUserId) {
          await createNotificationWithDecision(
            params.organizationId,
            mentionedUserId,
            NotificationType.MENTIONS,
            c.jobId,
            params.triggerUserId,
            true, // isMention
            {
              organizationId: params.organizationId,
              recipientId: mentionedUserId,
              type: NotificationType.MENTIONS,
              title: 'New Remark Added',
              message: `${params.triggerUserName} added a remark for ${c.candidateName}`,
              relatedEntity: 'candidate',
              relatedId: c.candidateId,
              actionUrl: `/dashboard/jobs/${c.jobId}?candidateId=${c.candidateId}`,
              triggerUserId: params.triggerUserId,
              triggerUserName: params.triggerUserName,
              priority: 'low',
              metadata: {
                candidateName: c.candidateName,
                jobTitle: c.jobTitle,
                jobId: c.jobId,
                remarkText:
                  params.remarkText.substring(0, 100) +
                  (params.remarkText.length > 100 ? '...' : ''),
              },
            },
          );
        }
      }
    }

    // Admin/hr get one bulk notification (as NEW_REMARKS type) - exclude mentioned users since they already got per-candidate notifications
    if (filteredIds.length > 0) {
      await createBulkNotificationsWithDecision({
        organizationId: params.organizationId,
        recipientIds: filteredIds,
        notificationType: NotificationType.NEW_REMARKS,
        jobId: params.candidates[0]?.jobId,
        triggerUserId: params.triggerUserId,
        baseParams: {
          organizationId: params.organizationId,
          type: NotificationType.NEW_REMARKS,
          title: 'New Remarks Added',
          message: `${params.triggerUserName} added a remark to ${params.candidates.length} candidate${params.candidates.length > 1 ? 's' : ''}`,
          relatedEntity: 'job',
          relatedId: params.candidates[0]?.jobId ?? '',
          actionUrl: params.candidates[0]?.jobId
            ? `/dashboard/jobs/${params.candidates[0].jobId}`
            : '/dashboard/jobs',
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: 'low',
          metadata: {
            candidateCount: params.candidates.length,
            remarkText:
              params.remarkText.substring(0, 100) +
              (params.remarkText.length > 100 ? '...' : ''),
            isBulkRemark: true,
          },
        },
      });
    }
  } catch (error) {
    logger.error('Failed to send bulk remark notification:', error);
  }
}
