import { NotificationType } from '@/lib/models/notification';
import logger from '@/lib/logger';
import { getUsersByRole } from '../core/userHelpers';
import { createBulkNotificationsWithDecision } from '../core/notificationHelpers';

export async function notifyJobCreated(params: {
  organizationId: string;
  jobId: string;
  jobTitle: string;
  triggerUserId: string;
  triggerUserName: string;
}): Promise<void> {
  try {
    const userIds = await getUsersByRole(params.organizationId, [
      'admin',
      'hr',
    ]);
    const filteredIds = userIds.filter((id) => id !== params.triggerUserId);

    await createBulkNotificationsWithDecision({
      organizationId: params.organizationId,
      recipientIds: filteredIds,
      notificationType: NotificationType.JOB_CREATED,
      jobId: params.jobId,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.JOB_CREATED,
        title: 'New Job Created',
        message: `${params.triggerUserName} created a new job: ${params.jobTitle}`,
        relatedEntity: 'job',
        relatedId: params.jobId,
        actionUrl: `/dashboard/jobs/${params.jobId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          jobTitle: params.jobTitle,
          jobId: params.jobId,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to send job created notification:', error);
  }
}

export async function notifyJobUpdated(params: {
  organizationId: string;
  jobId: string;
  jobTitle: string;
  triggerUserId: string;
  triggerUserName: string;
}): Promise<void> {
  try {
    const userIds = await getUsersByRole(params.organizationId, [
      'admin',
      'hr',
    ]);
    const filteredIds = userIds.filter((id) => id !== params.triggerUserId);

    await createBulkNotificationsWithDecision({
      organizationId: params.organizationId,
      recipientIds: filteredIds,
      notificationType: NotificationType.JOB_UPDATED,
      jobId: params.jobId,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.JOB_UPDATED,
        title: 'Job Updated',
        message: `${params.triggerUserName} updated job: ${params.jobTitle}`,
        relatedEntity: 'job',
        relatedId: params.jobId,
        actionUrl: `/dashboard/jobs/${params.jobId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'low',
        metadata: {
          jobTitle: params.jobTitle,
          jobId: params.jobId,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to send job updated notification:', error);
  }
}
