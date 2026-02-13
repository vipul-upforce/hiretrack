import { NotificationType } from '@/lib/models/notification';
import logger from '@/lib/logger';
import { getUsersByRole } from '../core/userHelpers';
import {
  createBulkNotificationsWithDecision,
  createNotificationWithDecision,
} from '../core/notificationHelpers';

export async function notifyCandidateAssigned(params: {
  organizationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  interviewerId: string;
  interviewerName: string;
  triggerUserId: string;
  triggerUserName: string;
  skipAdminHr?: boolean;
}): Promise<void> {
  try {
    // Notify the interviewer if they're not the triggerer
    if (params.interviewerId !== params.triggerUserId) {
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
          message: `You have been assigned to interview ${params.candidateName} for ${params.jobTitle}`,
          relatedEntity: 'candidate',
          relatedId: params.candidateId,
          actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: 'high',
          metadata: {
            candidateName: params.candidateName,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
            interviewerName: params.interviewerName,
          },
        },
      );
    }

    // Notify admin/hr
    const adminHrIds = await getUsersByRole(params.organizationId, [
      'admin',
      'hr',
    ]);
    const filteredIds = adminHrIds.filter((id) => id !== params.triggerUserId);

    if (!params.skipAdminHr) {
      await createBulkNotificationsWithDecision({
        organizationId: params.organizationId,
        recipientIds: filteredIds,
        notificationType: NotificationType.INTERVIEW_ASSIGNMENTS,
        jobId: params.jobId,
        triggerUserId: params.triggerUserId,
        baseParams: {
          organizationId: params.organizationId,
          type: NotificationType.INTERVIEW_ASSIGNMENTS,
          title: 'Candidate Assigned',
          message: `${params.candidateName} has been assigned to ${params.interviewerName}`,
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
            interviewerName: params.interviewerName,
            interviewerId: params.interviewerId,
          },
        },
      });
    }
  } catch (error) {
    logger.error('Failed to send candidate assigned notification:', error);
  }
}

export async function notifyCandidateUnassigned(params: {
  organizationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  previousInterviewerId: string;
  previousInterviewerName: string;
  triggerUserId: string;
  triggerUserName: string;
  skipAdminHr?: boolean;
}): Promise<void> {
  try {
    // Notify the previous interviewer if they're not the triggerer
    if (params.previousInterviewerId !== params.triggerUserId) {
      await createNotificationWithDecision(
        params.organizationId,
        params.previousInterviewerId,
        NotificationType.STEP_COMPLETED,
        params.jobId,
        params.triggerUserId,
        false,
        {
          organizationId: params.organizationId,
          recipientId: params.previousInterviewerId,
          type: NotificationType.STEP_COMPLETED,
          title: 'Candidate Unassigned',
          message: `You are no longer assigned to interview ${params.candidateName}`,
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
            previousInterviewerName: params.previousInterviewerName,
          },
        },
      );
    }

    // Notify admin/hr (skip when reassigning - HR already gets assign notification)
    if (!params.skipAdminHr) {
      const adminHrIds = await getUsersByRole(params.organizationId, [
        'admin',
        'hr',
      ]);
      const filteredIds = adminHrIds.filter(
        (id) => id !== params.triggerUserId,
      );

      await createBulkNotificationsWithDecision({
        organizationId: params.organizationId,
        recipientIds: filteredIds,
        notificationType: NotificationType.STEP_COMPLETED,
        jobId: params.jobId,
        triggerUserId: params.triggerUserId,
        baseParams: {
          organizationId: params.organizationId,
          type: NotificationType.STEP_COMPLETED,
          title: 'Candidate Unassigned',
          message: `${params.previousInterviewerName} are no longer assigned to interview ${params.candidateName}`,
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
            previousInterviewerName: params.previousInterviewerName,
            interviewerId: params.previousInterviewerId,
          },
        },
      });
    }
  } catch (error) {
    logger.error('Failed to send candidate unassigned notification:', error);
  }
}

export async function notifyInterviewCompleted(params: {
  organizationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  interviewerId: string;
  interviewerName: string;
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
      notificationType: NotificationType.STEP_COMPLETED,
      jobId: params.jobId,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.INTERVIEW_COMPLETED,
        title: 'Interview Completed',
        message: `${params.interviewerName} completed interview with ${params.candidateName}`,
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
          interviewerName: params.interviewerName,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to send interview completed notification:', error);
  }
}
