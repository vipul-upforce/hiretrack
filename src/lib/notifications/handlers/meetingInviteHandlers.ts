import { NotificationType } from '@/lib/models/notification';
import { batchCheckNotifications } from '@/lib/services/emailDecisionEngine';
import { getUsersEmailByRole } from '../core/userHelpers';
import {
  createNotification,
  createBulkNotifications,
} from '../core/notificationCore';
import { CreateNotificationParams } from '../types';

export async function notifyMeetingInviteAccepted(params: {
  organizationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  attendeeEmail: string;
  attendeeName: string;
  interviewerId?: string;
  interviewerName?: string;
  interviewerEmail?: string;
  meetingDate?: Date;
}): Promise<void> {
  const shouldNotifyInterviewer =
    params.interviewerId &&
    params.interviewerEmail &&
    params.attendeeEmail &&
    params.interviewerEmail !== params.attendeeEmail;

  if (shouldNotifyInterviewer && params.interviewerId) {
    await createNotification({
      organizationId: params.organizationId,
      recipientId: params.interviewerId,
      type: NotificationType.MEETING_INVITE_ACCEPTED,
      title: 'Meeting Invite Accepted',
      message: `${params.attendeeName} has accepted the interview invitation with ${params.candidateName}`,
      relatedEntity: 'meeting',
      relatedId: params.candidateId,
      actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
      priority: 'medium',
      metadata: {
        candidateName: params.candidateName,
        jobTitle: params.jobTitle,
        jobId: params.jobId,
        attendeeEmail: params.attendeeEmail,
        attendeeName: params.attendeeName,
        interviewerName: params.interviewerName,
        meetingDate: params.meetingDate,
      },
    });
  }

  const adminHrEmails = await getUsersEmailByRole(params.organizationId, [
    'admin',
    'hr',
  ]);
  const filteredIds = adminHrEmails
    .filter((admin) => admin.email !== params.attendeeEmail)
    .map((admin) => admin.id);

  if (filteredIds.length === 0) return;

  const decisionContexts = filteredIds.map((userId) => ({
    organizationId: params.organizationId,
    recipientUserId: userId,
    notificationType: NotificationType.MEETING_INVITE_ACCEPTED,
    jobId: params.jobId,
    triggererUserId: params.interviewerId ?? userId,
    isMention: false,
    notificationCategory: 'inApp' as const,
  }));

  const decisions = await batchCheckNotifications(decisionContexts);
  const eligibleIds = filteredIds.filter(
    (_userId, idx) => decisions[idx]?.shouldSend,
  );

  if (eligibleIds.length > 0) {
    const baseParams: Omit<CreateNotificationParams, 'recipientId'> = {
      organizationId: params.organizationId,
      type: NotificationType.MEETING_INVITE_ACCEPTED,
      title: 'Meeting Invite Accepted',
      message: `${params.attendeeName} has accepted the interview invitation with ${params.candidateName}`,
      relatedEntity: 'meeting',
      relatedId: params.candidateId,
      actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
      priority: 'medium',
      metadata: {
        candidateName: params.candidateName,
        jobTitle: params.jobTitle,
        jobId: params.jobId,
        attendeeEmail: params.attendeeEmail,
        attendeeName: params.attendeeName,
        interviewerName: params.interviewerName,
        interviewerId: params.interviewerId,
        meetingDate: params.meetingDate,
      },
    };
    await createBulkNotifications(baseParams, eligibleIds);
  }
}

export async function notifyMeetingInviteDeclined(params: {
  organizationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  attendeeEmail: string;
  attendeeName: string;
  interviewerId?: string;
  interviewerName?: string;
  interviewerEmail?: string;
  meetingDate?: Date;
}): Promise<void> {
  const shouldNotifyInterviewer =
    params.interviewerId &&
    params.interviewerEmail &&
    params.attendeeEmail &&
    params.interviewerEmail !== params.attendeeEmail;

  if (shouldNotifyInterviewer && params.interviewerId) {
    await createNotification({
      organizationId: params.organizationId,
      recipientId: params.interviewerId,
      type: NotificationType.MEETING_INVITE_DECLINED,
      title: 'Meeting Invite Declined',
      message: `⚠️ ${params.attendeeName} has declined the interview invitation with ${params.candidateName}`,
      relatedEntity: 'meeting',
      relatedId: params.candidateId,
      actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
      priority: 'high',
      metadata: {
        candidateName: params.candidateName,
        jobTitle: params.jobTitle,
        jobId: params.jobId,
        attendeeEmail: params.attendeeEmail,
        attendeeName: params.attendeeName,
        interviewerName: params.interviewerName,
        meetingDate: params.meetingDate,
      },
    });
  }

  const adminHrEmails = await getUsersEmailByRole(params.organizationId, [
    'admin',
    'hr',
  ]);
  const filteredIds = adminHrEmails
    .filter((admin) => admin.email !== params.attendeeEmail)
    .map((admin) => admin.id);

  if (filteredIds.length === 0) return;

  const decisionContexts = filteredIds.map((userId) => ({
    organizationId: params.organizationId,
    recipientUserId: userId,
    notificationType: NotificationType.MEETING_INVITE_DECLINED,
    jobId: params.jobId,
    triggererUserId: params.interviewerId ?? userId,
    isMention: false,
    notificationCategory: 'inApp' as const,
  }));

  const decisions = await batchCheckNotifications(decisionContexts);
  const eligibleIds = filteredIds.filter(
    (_userId, idx) => decisions[idx]?.shouldSend,
  );

  if (eligibleIds.length === 0) return;

  const baseParams: Omit<CreateNotificationParams, 'recipientId'> = {
    organizationId: params.organizationId,
    type: NotificationType.MEETING_INVITE_DECLINED,
    title: 'Meeting Invite Declined - Action Required',
    message: `⚠️ ${params.attendeeName} has declined the interview invitation with ${params.candidateName}`,
    relatedEntity: 'meeting',
    relatedId: params.candidateId,
    actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
    priority: 'high',
    metadata: {
      candidateName: params.candidateName,
      jobTitle: params.jobTitle,
      jobId: params.jobId,
      attendeeEmail: params.attendeeEmail,
      attendeeName: params.attendeeName,
      interviewerName: params.interviewerName,
      interviewerId: params.interviewerId,
      meetingDate: params.meetingDate,
    },
  };
  await createBulkNotifications(baseParams, eligibleIds);
}

export async function notifyMeetingInviteTentative(params: {
  organizationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  attendeeEmail: string;
  attendeeName: string;
  interviewerId?: string;
  interviewerName?: string;
  interviewerEmail?: string;
  meetingDate?: Date;
}): Promise<void> {
  const shouldNotifyInterviewer =
    params.interviewerId &&
    params.interviewerEmail &&
    params.attendeeEmail &&
    params.interviewerEmail !== params.attendeeEmail;

  if (shouldNotifyInterviewer && params.interviewerId) {
    await createNotification({
      organizationId: params.organizationId,
      recipientId: params.interviewerId,
      type: NotificationType.MEETING_INVITE_TENTATIVE,
      title: 'Meeting Invite - Maybe',
      message: `${params.attendeeName} tentatively accepted the interview invitation with ${params.candidateName}`,
      relatedEntity: 'meeting',
      relatedId: params.candidateId,
      actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
      priority: 'medium',
      metadata: {
        candidateName: params.candidateName,
        jobTitle: params.jobTitle,
        jobId: params.jobId,
        attendeeEmail: params.attendeeEmail,
        attendeeName: params.attendeeName,
        interviewerName: params.interviewerName,
        meetingDate: params.meetingDate,
      },
    });
  }

  const adminHrEmails = await getUsersEmailByRole(params.organizationId, [
    'admin',
    'hr',
  ]);
  const filteredIds = adminHrEmails
    .filter((admin) => admin.email !== params.attendeeEmail)
    .map((admin) => admin.id);

  if (filteredIds.length === 0) return;
  const decisionContexts = filteredIds.map((userId) => ({
    organizationId: params.organizationId,
    recipientUserId: userId,
    notificationType: NotificationType.MEETING_INVITE_TENTATIVE,
    jobId: params.jobId,
    triggererUserId: params.interviewerId ?? userId,
    isMention: false,
    notificationCategory: 'inApp' as const,
  }));

  const decisions = await batchCheckNotifications(decisionContexts);
  const eligibleIds = filteredIds.filter(
    (_userId, idx) => decisions[idx]?.shouldSend,
  );

  if (eligibleIds.length === 0) return;

  const baseParams: Omit<CreateNotificationParams, 'recipientId'> = {
    organizationId: params.organizationId,
    type: NotificationType.MEETING_INVITE_TENTATIVE,
    title: 'Meeting Invite - Maybe',
    message: `${params.attendeeName} tentatively accepted the interview invitation with ${params.candidateName}`,
    relatedEntity: 'meeting',
    relatedId: params.candidateId,
    actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
    priority: 'medium',
    metadata: {
      candidateName: params.candidateName,
      jobTitle: params.jobTitle,
      jobId: params.jobId,
      attendeeEmail: params.attendeeEmail,
      attendeeName: params.attendeeName,
      interviewerName: params.interviewerName,
      interviewerId: params.interviewerId,
      meetingDate: params.meetingDate,
    },
  };
  await createBulkNotifications(baseParams, eligibleIds);
}
