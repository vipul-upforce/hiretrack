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

export async function notifyCandidateMoved(params: {
  organizationId: string;
  candidateId: string;
  candidateName: string;
  fromJobId: string;
  fromJobTitle: string;
  toJobId: string;
  toJobTitle: string;
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
      notificationType: NotificationType.CANDIDATE_MOVED,
      jobId: params.toJobId,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.CANDIDATE_MOVED,
        title: 'Candidate Moved',
        message: `${params.candidateName} was moved from ${params.fromJobTitle} to ${params.toJobTitle}`,
        relatedEntity: 'candidate',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.toJobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          candidateName: params.candidateName,
          fromJobTitle: params.fromJobTitle,
          fromJobId: params.fromJobId,
          toJobTitle: params.toJobTitle,
          toJobId: params.toJobId,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to send candidate moved notification:', error);
  }
}

export async function notifyBulkCandidateMoved(params: {
  organizationId: string;
  candidateIds: string[];
  toJobId: string;
  toJobTitle: string;
  triggerUserId: string;
  triggerUserName: string;
}): Promise<void> {
  try {
    const adminHrIds = await getUsersByRole(params.organizationId, [
      'admin',
      'hr',
    ]);
    const filteredIds = adminHrIds.filter((id) => id !== params.triggerUserId);

    const candidateCount = params.candidateIds.length;

    await createBulkNotificationsWithDecision({
      organizationId: params.organizationId,
      recipientIds: filteredIds,
      notificationType: NotificationType.CANDIDATE_MOVED,
      jobId: params.toJobId,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.CANDIDATE_MOVED,
        title: 'Candidate Moved',
        message: `${candidateCount} candidate${candidateCount > 1 ? 's' : ''} ${candidateCount > 1 ? 'were' : 'was'} moved to ${params.toJobTitle}`,
        relatedEntity: 'job',
        relatedId: params.toJobId,
        actionUrl: `/dashboard/jobs/${params.toJobId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          candidateCount,
          candidateIds: params.candidateIds,
          toJobTitle: params.toJobTitle,
          toJobId: params.toJobId,
          isBulkMove: true,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to send bulk candidate moved notification:', error);
  }
}
