import logger from '@/lib/logger';
import { NotificationType } from '@/lib/models/notification';
import { getUsersByRole } from '../core/userHelpers';
import { createBulkNotificationsWithDecision } from '../core/notificationHelpers';

export async function notifyFollowUpAdded(params: {
  organizationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  followupNote: string;
  followupDate?: Date;
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
      notificationType: NotificationType.FOLLOWUP_ADDED,
      jobId: params.jobId,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.FOLLOWUP_ADDED,
        title: 'Follow-up Added',
        message: `${params.triggerUserName} added a follow-up for ${params.candidateName}`,
        relatedEntity: 'followup',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'low',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
          followupNote:
            params.followupNote.substring(0, 100) +
            (params.followupNote.length > 100 ? '...' : ''),
          followupDate: params.followupDate,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to send follow-up added notification:', error);
  }
}

export async function notifyFollowupUpdated(params: {
  organizationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
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
      notificationType: NotificationType.FOLLOWUP_UPDATED,
      jobId: params.jobId,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.FOLLOWUP_UPDATED,
        title: 'Follow-up Updated',
        message: `${params.triggerUserName} updated a follow-up for ${params.candidateName}`,
        relatedEntity: 'followup',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'low',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to send follow-up updated notification:', error);
  }
}

export async function notifyFollowupRemoved(params: {
  organizationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
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
      notificationType: NotificationType.FOLLOWUP_REMOVED,
      jobId: params.jobId,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.FOLLOWUP_REMOVED,
        title: 'Follow-up Removed',
        message: `${params.triggerUserName} removed a follow-up for ${params.candidateName}`,
        relatedEntity: 'followup',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'low',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to send follow-up removed notification:', error);
  }
}

/**
 * Bulk add follow-up: admin/hr get one bulk notification.
 * Mimics single notifyFollowUpAdded exactly.
 */
export async function notifyBulkFollowUpAdded(params: {
  organizationId: string;
  followupNote: string;
  followupDate?: string | null;
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
    const adminHrIds = await getUsersByRole(params.organizationId, [
      'admin',
      'hr',
    ]);
    const filteredIds = adminHrIds.filter((id) => id !== params.triggerUserId);

    const count = params.candidates.length;
    const followupDateObj = params.followupDate
      ? new Date(params.followupDate)
      : undefined;

    await createBulkNotificationsWithDecision({
      organizationId: params.organizationId,
      recipientIds: filteredIds,
      notificationType: NotificationType.FOLLOWUP_ADDED,
      jobId: params.candidates[0]?.jobId,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.FOLLOWUP_ADDED,
        title: 'Follow-ups Added',
        message: `${params.triggerUserName} added a follow-up to ${count} candidate${count > 1 ? 's' : ''}`,
        relatedEntity: 'job',
        relatedId: params.candidates[0]?.jobId ?? '',
        actionUrl: params.candidates[0]?.jobId
          ? `/dashboard/jobs/${params.candidates[0].jobId}`
          : '/dashboard/jobs',
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'low',
        metadata: {
          candidateCount: count,
          followupNote:
            params.followupNote.substring(0, 100) +
            (params.followupNote.length > 100 ? '...' : ''),
          followupDate: followupDateObj,
          isBulkFollowUp: true,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to send bulk follow-up added notification:', error);
  }
}
