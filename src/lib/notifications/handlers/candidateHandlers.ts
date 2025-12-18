import { NotificationType } from '@/lib/models/notification';
import logger from '@/lib/logger';
import { getUsersByRole } from '../core/userHelpers';
import { createBulkNotificationsWithDecision } from '../core/notificationHelpers';

export async function notifyCandidateApplied(params: {
  organizationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  triggerUserId?: string;
  triggerUserName?: string;
}): Promise<void> {
  try {
    const adminHrIds = await getUsersByRole(params.organizationId, [
      'admin',
      'hr',
    ]);
    const filteredIds = adminHrIds.filter((id) => id !== params.triggerUserId);

    if (filteredIds.length === 0) return;

    await createBulkNotificationsWithDecision({
      organizationId: params.organizationId,
      recipientIds: filteredIds,
      notificationType: NotificationType.NEW_APPLICATIONS,
      jobId: params.jobId,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.NEW_APPLICATIONS,
        title: 'New Candidate Application',
        message: `A new application from ${params.candidateName} has been received for the ${params.jobTitle} role.`,
        relatedEntity: 'candidate',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'high',
        metadata: {
          candidateName: params.candidateName,
          candidateEmail: params.candidateEmail,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to send candidate applied notification:', error);
  }
}

export async function notifyCandidateStatusUpdated(params: {
  organizationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  oldStatus: string;
  newStatus: string;
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
      notificationType: NotificationType.STATUS_UPDATES,
      jobId: params.jobId,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.STATUS_UPDATES,
        title: 'Candidate Status Updated',
        message: `The status for ${params.candidateName} has been updated from ${params.oldStatus} to ${params.newStatus}.`,
        relatedEntity: 'candidate',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
          oldStatus: params.oldStatus,
          newStatus: params.newStatus,
        },
      },
    });
  } catch (error) {
    logger.error(
      'Failed to send candidate status updated notification:',
      error,
    );
  }
}

export async function notifyCandidateRejected(params: {
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
      notificationType: NotificationType.CANDIDATE_REJECTED,
      jobId: params.jobId,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.CANDIDATE_REJECTED,
        title: 'Candidate Rejected',
        message: `${params.triggerUserName} rejected ${params.candidateName} for ${params.jobTitle}`,
        relatedEntity: 'candidate',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to send candidate rejected notification:', error);
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

export async function notifyCandidateDetailsUpdated(params: {
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
      notificationType: NotificationType.CANDIDATE_DETAILS_UPDATED,
      jobId: params.jobId,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.CANDIDATE_DETAILS_UPDATED,
        title: 'Candidate Details Updated',
        message: `${params.triggerUserName} updated details for ${params.candidateName}`,
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
        },
      },
    });
  } catch (error) {
    logger.error(
      'Failed to send candidate details updated notification:',
      error,
    );
  }
}
