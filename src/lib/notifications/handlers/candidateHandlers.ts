import { NotificationType } from '@/lib/models/notification';
import logger from '@/lib/logger';
import { getUsersByRole } from '../core/userHelpers';
import {
  createBulkNotificationsWithDecision,
  createNotificationWithDecision,
} from '../core/notificationHelpers';

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

/**
 * Bulk assign: interviewer receives one notification per candidate (as usual);
 * admin/hr receive a single bulk notification.
 */
export async function notifyBulkCandidateAssigned(params: {
  organizationId: string;
  interviewerId: string;
  interviewerName: string;
  jobId: string;
  jobTitle: string;
  candidates: Array<{ candidateId: string; candidateName: string }>;
  triggerUserId: string;
  triggerUserName: string;
}): Promise<void> {
  try {
    // Interviewer gets separate notifications per candidate (existing behaviour)
    if (params.interviewerId !== params.triggerUserId) {
      for (const c of params.candidates) {
        await createNotificationWithDecision(
          params.organizationId,
          params.interviewerId,
          NotificationType.INTERVIEW_ASSIGNMENTS,
          params.jobId,
          params.triggerUserId,
          false,
          {
            organizationId: params.organizationId,
            recipientId: params.interviewerId,
            type: NotificationType.INTERVIEW_ASSIGNMENTS,
            title: 'Candidate Assigned',
            message: `You have been assigned to interview ${c.candidateName} for ${params.jobTitle}`,
            relatedEntity: 'candidate',
            relatedId: c.candidateId,
            actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${c.candidateId}`,
            triggerUserId: params.triggerUserId,
            triggerUserName: params.triggerUserName,
            priority: 'high',
            metadata: {
              candidateName: c.candidateName,
              jobTitle: params.jobTitle,
              jobId: params.jobId,
              interviewerName: params.interviewerName,
            },
          },
        );
      }
    }

    // Admin/hr get one bulk notification
    const adminHrIds = await getUsersByRole(params.organizationId, [
      'admin',
      'hr',
    ]);
    const filteredIds = adminHrIds.filter((id) => id !== params.triggerUserId);
    const count = params.candidates.length;

    await createBulkNotificationsWithDecision({
      organizationId: params.organizationId,
      recipientIds: filteredIds,
      notificationType: NotificationType.INTERVIEW_ASSIGNMENTS,
      jobId: params.jobId,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.INTERVIEW_ASSIGNMENTS,
        title: 'Candidates Assigned',
        message: `${count} candidate${count > 1 ? 's' : ''} ${count > 1 ? 'were' : 'was'} assigned to ${params.interviewerName}`,
        relatedEntity: 'job',
        relatedId: params.jobId,
        actionUrl: `/dashboard/jobs/${params.jobId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          candidateCount: count,
          interviewerName: params.interviewerName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
          isBulkAssign: true,
        },
      },
    });
  } catch (error) {
    logger.error(
      'Failed to send bulk candidate assigned notification:',
      error,
    );
  }
}

/**
 * Bulk unassign: each previous interviewer receives one notification per candidate (as usual);
 * admin/hr receive a single bulk notification.
 */
export async function notifyBulkCandidateUnassigned(params: {
  organizationId: string;
  unassignments: Array<{
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    previousInterviewerId: string;
    previousInterviewerName: string;
  }>;
  triggerUserId: string;
  triggerUserName: string;
}): Promise<void> {
  try {
    // Each previous interviewer gets separate notifications per candidate
    for (const u of params.unassignments) {
      if (u.previousInterviewerId !== params.triggerUserId) {
        await createNotificationWithDecision(
          params.organizationId,
          u.previousInterviewerId,
          NotificationType.STEP_COMPLETED,
          u.jobId,
          params.triggerUserId,
          false,
          {
            organizationId: params.organizationId,
            recipientId: u.previousInterviewerId,
            type: NotificationType.STEP_COMPLETED,
            title: 'Candidate Unassigned',
            message: `You are no longer assigned to interview ${u.candidateName}`,
            relatedEntity: 'candidate',
            relatedId: u.candidateId,
            actionUrl: `/dashboard/jobs/${u.jobId}?candidateId=${u.candidateId}`,
            triggerUserId: params.triggerUserId,
            triggerUserName: params.triggerUserName,
            priority: 'medium',
            metadata: {
              candidateName: u.candidateName,
              jobTitle: u.jobTitle,
              jobId: u.jobId,
              previousInterviewerName: u.previousInterviewerName,
            },
          },
        );
      }
    }

    // Admin/hr get one bulk notification
    const adminHrIds = await getUsersByRole(params.organizationId, [
      'admin',
      'hr',
    ]);
    const filteredIds = adminHrIds.filter((id) => id !== params.triggerUserId);
    const count = params.unassignments.length;

    await createBulkNotificationsWithDecision({
      organizationId: params.organizationId,
      recipientIds: filteredIds,
      notificationType: NotificationType.STEP_COMPLETED,
      jobId: params.unassignments[0]?.jobId,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.STEP_COMPLETED,
        title: 'Candidates Unassigned',
        message: `${count} candidate${count > 1 ? 's' : ''} ${count > 1 ? 'were' : 'was'} unassigned`,
        relatedEntity: 'job',
        relatedId: params.unassignments[0]?.jobId ?? '',
        actionUrl: params.unassignments[0]?.jobId
          ? `/dashboard/jobs/${params.unassignments[0].jobId}`
          : '/dashboard/jobs',
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          unassignCount: count,
          isBulkUnassign: true,
        },
      },
    });
  } catch (error) {
    logger.error(
      'Failed to send bulk candidate unassigned notification:',
      error,
    );
  }
}

/**
 * Bulk status update: admin/hr get one bulk notification.
 * Mimics single notifyCandidateStatusUpdated exactly.
 */
export async function notifyBulkCandidateStatusUpdated(params: {
  organizationId: string;
  newStatus: string;
  candidates: Array<{
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    oldStatus: string;
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

    await createBulkNotificationsWithDecision({
      organizationId: params.organizationId,
      recipientIds: filteredIds,
      notificationType: NotificationType.STATUS_UPDATES,
      jobId: params.candidates[0]?.jobId,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.STATUS_UPDATES,
        title: 'Candidate Status Updated',
        message: `${count} candidate${count > 1 ? 's' : ''} ${count > 1 ? 'have' : 'has'} been updated to ${params.newStatus}`,
        relatedEntity: 'job',
        relatedId: params.candidates[0]?.jobId ?? '',
        actionUrl: params.candidates[0]?.jobId
          ? `/dashboard/jobs/${params.candidates[0].jobId}`
          : '/dashboard/jobs',
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          candidateCount: count,
          newStatus: params.newStatus,
          isBulkStatusUpdate: true,
        },
      },
    });
  } catch (error) {
    logger.error(
      'Failed to send bulk candidate status updated notification:',
      error,
    );
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
