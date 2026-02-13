import { NotificationType } from '@/lib/models/notification';
import logger from '@/lib/logger';
import { getUsersByRole } from '../core/userHelpers';
import {
  createBulkNotificationsWithDecision,
  createNotificationWithDecision,
} from '../core/notificationHelpers';

export async function notifyMeetingScheduled(params: {
  organizationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  interviewerId: string;
  interviewerName: string;
  meetingDate: Date;
  triggerUserId: string;
  triggerUserName: string;
}): Promise<void> {
  try {
    if (params.interviewerId !== params.triggerUserId) {
      await createNotificationWithDecision(
        params.organizationId,
        params.interviewerId,
        NotificationType.MEETING_SCHEDULED,
        params.jobId,
        params.triggerUserId,
        false,
        {
          organizationId: params.organizationId,
          recipientId: params.interviewerId,
          type: NotificationType.MEETING_SCHEDULED,
          title: 'Meeting Scheduled',
          message: `Meeting scheduled with ${params.candidateName} for ${params.jobTitle}`,
          relatedEntity: 'meeting',
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
            meetingDate: params.meetingDate,
          },
        },
      );
    }

    const adminHrIds = await getUsersByRole(params.organizationId, [
      'admin',
      'hr',
    ]);
    const filteredIds = adminHrIds.filter((id) => id !== params.triggerUserId);

    await createBulkNotificationsWithDecision({
      organizationId: params.organizationId,
      recipientIds: filteredIds,
      notificationType: NotificationType.MEETING_SCHEDULED,
      jobId: params.jobId,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.MEETING_SCHEDULED,
        title: 'Meeting Scheduled',
        message: `Meeting scheduled between ${params.interviewerName} and ${params.candidateName}`,
        relatedEntity: 'meeting',
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
          meetingDate: params.meetingDate,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to send meeting scheduled notification:', error);
  }
}

export async function notifyMeetingUpdated(params: {
  organizationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  interviewerId: string;
  interviewerName: string;
  meetingDate: Date;
  triggerUserId: string;
  triggerUserName: string;
}): Promise<void> {
  try {
    if (params.interviewerId !== params.triggerUserId) {
      await createNotificationWithDecision(
        params.organizationId,
        params.interviewerId,
        NotificationType.MEETING_UPDATED,
        params.jobId,
        params.triggerUserId,
        false,
        {
          organizationId: params.organizationId,
          recipientId: params.interviewerId,
          type: NotificationType.MEETING_UPDATED,
          title: 'Meeting Updated',
          message: `Meeting with ${params.candidateName} has been updated`,
          relatedEntity: 'meeting',
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
            meetingDate: params.meetingDate.toISOString(),
          },
        },
      );
    }

    const adminHrIds = await getUsersByRole(params.organizationId, [
      'admin',
      'hr',
    ]);
    const filteredIds = adminHrIds.filter((id) => id !== params.triggerUserId);

    await createBulkNotificationsWithDecision({
      organizationId: params.organizationId,
      recipientIds: filteredIds,
      notificationType: NotificationType.MEETING_UPDATED,
      jobId: params.jobId,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.MEETING_UPDATED,
        title: 'Meeting Updated',
        message: `Meeting between ${params.interviewerName} and ${params.candidateName} has been updated`,
        relatedEntity: 'meeting',
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
          meetingDate: params.meetingDate.toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('Failed to send meeting updated notification:', error);
  }
}

export async function notifyMeetingCancelled(params: {
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
    if (params.interviewerId !== params.triggerUserId) {
      await createNotificationWithDecision(
        params.organizationId,
        params.interviewerId,
        NotificationType.MEETING_CANCELLED,
        params.jobId,
        params.triggerUserId,
        false,
        {
          organizationId: params.organizationId,
          recipientId: params.interviewerId,
          type: NotificationType.MEETING_CANCELLED,
          title: 'Meeting Cancelled',
          message: `Meeting with ${params.candidateName} has been cancelled`,
          relatedEntity: 'meeting',
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

    const adminHrIds = await getUsersByRole(params.organizationId, [
      'admin',
      'hr',
    ]);
    const filteredIds = adminHrIds.filter((id) => id !== params.triggerUserId);

    await createBulkNotificationsWithDecision({
      organizationId: params.organizationId,
      recipientIds: filteredIds,
      notificationType: NotificationType.MEETING_CANCELLED,
      jobId: params.jobId,
      triggerUserId: params.triggerUserId,
      baseParams: {
        organizationId: params.organizationId,
        type: NotificationType.MEETING_CANCELLED,
        title: 'Meeting Cancelled',
        message: `Meeting between ${params.interviewerName} and ${params.candidateName} has been cancelled`,
        relatedEntity: 'meeting',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
          interviewerId: params.interviewerId,
          interviewerName: params.interviewerName,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to send meeting cancelled notification:', error);
  }
}
