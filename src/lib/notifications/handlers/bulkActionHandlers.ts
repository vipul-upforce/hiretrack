/* eslint-disable max-lines -- single module for all bulk notification handlers */
import { formatDateForOrganization } from '@/components/timezoneFormat/getFormattedTZ';
import { NotificationType } from '@/lib/models/notification';
import logger from '@/lib/logger';
import { findMentionedUsers } from '@/lib/services/userMentionService';
import {
  getUsersByRole,
  getRecipientDisplayNameForBulkEmail,
  getHrContactInfo,
} from '../core/userHelpers';
import {
  createBulkNotificationsWithDecision,
  createNotificationWithDecision,
} from '../core/notificationHelpers';
import { sendBulkActionEmail } from '../email/unifiedEmailService';

/** When bulk assign/unassign exceeds this count, interviewer gets one bulk notification instead of per-candidate. */
const BULK_SINGLE_NOTIFICATION_THRESHOLD = 10;

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
 * Bulk assign: interviewer receives one notification per candidate when ≤10 candidates;
 * when >10 candidates, interviewer receives a single bulk notification.
 * Admin/hr always receive a single bulk notification.
 */
export async function notifyBulkCandidateAssigned(params: {
  organizationId: string;
  interviewerId: string;
  interviewerName: string;
  jobId: string;
  jobTitle: string;
  candidates: Array<{
    candidateId: string;
    candidateName: string;
    jobId?: string;
  }>;
  triggerUserId: string;
  triggerUserName: string;
  triggerUserEmail?: string;
  /** When meeting scheduled: ISO string */
  scheduledTime?: string | null;
  /** Meeting duration in minutes */
  duration?: number;
  /** First candidate's meeting link when scheduled */
  meetingLink?: string | null;
  /** Outlook calendar add link when scheduled */
  outlookCalendarLink?: string | null;
  /** Interview type when meeting scheduled */
  interviewType?: string;
}): Promise<void> {
  try {
    const count = params.candidates.length;

    // Get admin/hr list first to check if interviewer is also admin/hr
    const adminHrIds = await getUsersByRole(params.organizationId, [
      'admin',
      'hr',
    ]);
    const isInterviewerAlsoAdminHr = adminHrIds.includes(params.interviewerId);

    // Send notifications to interviewer (if they're not the trigger user AND not admin/hr)
    // If interviewer is also admin/hr, they'll get a special notification below
    if (
      params.interviewerId !== params.triggerUserId &&
      !isInterviewerAlsoAdminHr
    ) {
      if (count > BULK_SINGLE_NOTIFICATION_THRESHOLD) {
        // Interviewer gets bulk notification when >10
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
            title: 'Candidates Assigned',
            message: `${count} candidates were assigned to you for ${params.jobTitle}`,
            relatedEntity: 'job',
            relatedId: params.jobId,
            actionUrl: `/dashboard/jobs/${params.jobId}`,
            triggerUserId: params.triggerUserId,
            triggerUserName: params.triggerUserName,
            priority: 'high',
            metadata: {
              candidateCount: count,
              jobTitle: params.jobTitle,
              jobId: params.jobId,
              interviewerName: params.interviewerName,
              isBulkAssign: true,
            },
          },
        );
      } else {
        // Interviewer gets one notification per candidate when ≤10
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
    }

    // Handle admin/hr notifications
    // Filter out: triggerUserId and interviewerId (if interviewer is also admin/hr)
    const adminHrRecipients = adminHrIds.filter(
      (id) => id !== params.triggerUserId && id !== params.interviewerId,
    );

    // If interviewer is also admin/hr and not the trigger user, send them ONE notification:
    // "N candidates were assigned to you for <jobTitle>"
    if (
      isInterviewerAlsoAdminHr &&
      params.interviewerId !== params.triggerUserId
    ) {
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
          title: 'Candidates Assigned',
          message: `${count} candidates were assigned to you for ${params.jobTitle}`,
          relatedEntity: 'job',
          relatedId: params.jobId,
          actionUrl: `/dashboard/jobs/${params.jobId}`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: 'high',
          metadata: {
            candidateCount: count,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
            interviewerName: params.interviewerName,
            isBulkAssign: true,
          },
        },
      );
    }

    // Other admin/hr get the standard bulk notification
    if (adminHrRecipients.length > 0) {
      await createBulkNotificationsWithDecision({
        organizationId: params.organizationId,
        recipientIds: adminHrRecipients,
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
    }

    // Bulk assign email: interviewer (when bulk) + admin/hr
    const candidatesWithJobId = params.candidates.map((c) => ({
      candidateId: c.candidateId,
      candidateName: c.candidateName,
      jobId: c.jobId ?? params.jobId,
    }));

    const interviewDate =
      params.scheduledTime != null && params.scheduledTime
        ? ((await formatDateForOrganization(
            params.scheduledTime,
            params.organizationId,
          )) as string)
        : 'N/A';
    const interviewTime =
      params.scheduledTime != null && params.scheduledTime ? '' : 'TBD';
    const durationStr =
      params.duration != null ? `${params.duration} minutes` : 'TBD';
    const interviewTypeVal =
      params.interviewType ??
      (params.scheduledTime ? 'Interview' : 'Interview');

    const baseVariables = {
      candidateCount: count.toString(),
      triggererName: params.triggerUserName,
      jobTitle: params.jobTitle,
      jobId: params.jobId,
      candidateName: params.candidates[0]?.candidateName ?? '',
      interviewDate,
      interviewTime,
      duration: durationStr,
      interviewType: interviewTypeVal,
      meetingLink: params.meetingLink ?? '',
      outlookCalendarLink: params.outlookCalendarLink ?? '',
    };

    const interviewerEmailRecipients: string[] = [];
    if (
      params.interviewerId !== params.triggerUserId &&
      (count > BULK_SINGLE_NOTIFICATION_THRESHOLD || isInterviewerAlsoAdminHr)
    ) {
      interviewerEmailRecipients.push(params.interviewerId);
    }
    if (interviewerEmailRecipients.length > 0) {
      sendBulkActionEmail({
        organizationId: params.organizationId,
        notificationType: NotificationType.INTERVIEW_ASSIGNMENTS,
        templateKey: 'bulk-assign',
        variables: {
          ...baseVariables,
          interviewerName: 'you',
          recipientName: params.interviewerName,
        },
        recipients: interviewerEmailRecipients,
        candidates: candidatesWithJobId,
        triggererUserId: params.triggerUserId,
        triggererEmail: params.triggerUserEmail,
        triggererName: params.triggerUserName,
        jobId: params.jobId,
      }).catch((err) =>
        logger.error({ err }, 'Bulk assign email to interviewer failed'),
      );
    }
    if (adminHrRecipients.length > 0) {
      const adminRecipientName = await getRecipientDisplayNameForBulkEmail(
        params.organizationId,
        adminHrRecipients,
      );
      sendBulkActionEmail({
        organizationId: params.organizationId,
        notificationType: NotificationType.INTERVIEW_ASSIGNMENTS,
        templateKey: 'bulk-assign',
        variables: {
          ...baseVariables,
          interviewerName: params.interviewerName,
          recipientName: adminRecipientName,
        },
        recipients: adminHrRecipients,
        candidates: candidatesWithJobId,
        triggererUserId: params.triggerUserId,
        triggererEmail: params.triggerUserEmail,
        triggererName: params.triggerUserName,
        jobId: params.jobId,
      }).catch((err) =>
        logger.error({ err }, 'Bulk assign email to admin/hr failed'),
      );
    }
  } catch (error) {
    logger.error('Failed to send bulk candidate assigned notification:', error);
  }
}

/**
 * Bulk unassign: each previous interviewer receives one notification per candidate when ≤10;
 * when >10 unassignments for that interviewer, they receive a single bulk notification.
 * If previous interviewer is also admin/hr, they get only one: "N candidates were unassigned from you".
 * Other admin/hr get one bulk: "N candidate(s) were/was unassigned".
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
  triggerUserEmail?: string;
  /** Feedback message for bulk-unassign email template */
  feedback?: string;
  /** Next step message for bulk-unassign email template */
  nextStep?: string;
}): Promise<void> {
  try {
    const adminHrIds = await getUsersByRole(params.organizationId, [
      'admin',
      'hr',
    ]);

    // Group unassignments by previous interviewer
    const byInterviewer = new Map<
      string,
      Array<(typeof params.unassignments)[0]>
    >();
    for (const u of params.unassignments) {
      if (u.previousInterviewerId !== params.triggerUserId) {
        const list = byInterviewer.get(u.previousInterviewerId) ?? [];
        list.push(u);
        byInterviewer.set(u.previousInterviewerId, list);
      }
    }

    // Send notifications to previous interviewers who are NOT admin/hr
    for (const [, list] of byInterviewer) {
      const interviewerId = list[0].previousInterviewerId;
      const isInterviewerAlsoAdminHr = adminHrIds.includes(interviewerId);
      if (!isInterviewerAlsoAdminHr) {
        const count = list.length;

        if (count > BULK_SINGLE_NOTIFICATION_THRESHOLD) {
          await createNotificationWithDecision(
            params.organizationId,
            interviewerId,
            NotificationType.STEP_COMPLETED,
            list[0].jobId,
            params.triggerUserId,
            false,
            {
              organizationId: params.organizationId,
              recipientId: interviewerId,
              type: NotificationType.STEP_COMPLETED,
              title: 'Candidates Unassigned',
              message: `${count} candidates were unassigned from you`,
              relatedEntity: 'job',
              relatedId: list[0].jobId,
              actionUrl: list[0].jobId
                ? `/dashboard/jobs/${list[0].jobId}`
                : '/dashboard/jobs',
              triggerUserId: params.triggerUserId,
              triggerUserName: params.triggerUserName,
              priority: 'medium',
              metadata: {
                unassignCount: count,
                jobId: list[0].jobId,
                jobTitle: list[0].jobTitle,
                isBulkUnassign: true,
              },
            },
          );
        } else {
          for (const u of list) {
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
                priority: 'high',
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
      }
    }

    // Admin/hr: exclude trigger user and all previous interviewers (they get their own notification)
    const previousInterviewerIds = new Set(byInterviewer.keys());
    const adminHrRecipients = adminHrIds.filter(
      (id) => id !== params.triggerUserId && !previousInterviewerIds.has(id),
    );

    // Each previous interviewer who is also admin/hr gets ONE notification: "N candidates were unassigned from you"
    for (const [interviewerId, list] of byInterviewer) {
      if (adminHrIds.includes(interviewerId)) {
        const count = list.length;
        await createNotificationWithDecision(
          params.organizationId,
          interviewerId,
          NotificationType.STEP_COMPLETED,
          list[0].jobId,
          params.triggerUserId,
          false,
          {
            organizationId: params.organizationId,
            recipientId: interviewerId,
            type: NotificationType.STEP_COMPLETED,
            title: 'Candidates Unassigned',
            message: `${count} candidates were unassigned from you`,
            relatedEntity: 'job',
            relatedId: list[0].jobId,
            actionUrl: list[0].jobId
              ? `/dashboard/jobs/${list[0].jobId}`
              : '/dashboard/jobs',
            triggerUserId: params.triggerUserId,
            triggerUserName: params.triggerUserName,
            priority: 'high',
            metadata: {
              unassignCount: count,
              jobId: list[0].jobId,
              jobTitle: list[0].jobTitle,
              isBulkUnassign: true,
            },
          },
        );
      }
    }

    // Other admin/hr get the standard bulk notification
    const totalCount = params.unassignments.length;
    if (adminHrRecipients.length > 0) {
      await createBulkNotificationsWithDecision({
        organizationId: params.organizationId,
        recipientIds: adminHrRecipients,
        notificationType: NotificationType.STEP_COMPLETED,
        jobId: params.unassignments[0]?.jobId,
        triggerUserId: params.triggerUserId,
        baseParams: {
          organizationId: params.organizationId,
          type: NotificationType.STEP_COMPLETED,
          title: 'Candidates Unassigned',
          message: `${totalCount} candidate${totalCount > 1 ? 's' : ''} ${totalCount > 1 ? 'were' : 'was'} unassigned`,
          relatedEntity: 'job',
          relatedId: params.unassignments[0]?.jobId ?? '',
          actionUrl: params.unassignments[0]?.jobId
            ? `/dashboard/jobs/${params.unassignments[0].jobId}`
            : '/dashboard/jobs',
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: 'medium',
          metadata: {
            unassignCount: totalCount,
            isBulkUnassign: true,
          },
        },
      });
    }

    // Bulk unassign email: each previous interviewer (when bulk) + admin/hr
    const candidatesForEmail = params.unassignments.map((u) => ({
      candidateId: u.candidateId,
      candidateName: u.candidateName,
      jobId: u.jobId,
    }));
    const primaryJobId = params.unassignments[0]?.jobId ?? '';
    const primaryJobTitle = params.unassignments[0]?.jobTitle ?? '';

    const completionDate = (await formatDateForOrganization(
      new Date(),
      params.organizationId,
    )) as string;

    for (const [interviewerId, list] of byInterviewer) {
      if (list.length > BULK_SINGLE_NOTIFICATION_THRESHOLD) {
        const interviewerCandidates = list.map((u) => ({
          candidateId: u.candidateId,
          candidateName: u.candidateName,
          jobId: u.jobId,
        }));
        sendBulkActionEmail({
          organizationId: params.organizationId,
          notificationType: NotificationType.STEP_COMPLETED,
          templateKey: 'bulk-unassign',
          variables: {
            candidateCount: list.length.toString(),
            triggererName: params.triggerUserName,
            jobTitle: list[0].jobTitle,
            jobId: list[0].jobId,
            recipientName: list[0].previousInterviewerName,
            stepName: 'Interview Unassigned',
            completedBy: params.triggerUserName,
            completionDate,
            feedback: params.feedback ?? 'N/A',
            nextStep: params.nextStep ?? 'N/A',
            candidateName: list[0].candidateName,
          },
          recipients: [interviewerId],
          candidates: interviewerCandidates,
          triggererUserId: params.triggerUserId,
          triggererEmail: params.triggerUserEmail,
          triggererName: params.triggerUserName,
          jobId: list[0].jobId,
        }).catch((err) =>
          logger.error({ err }, 'Bulk unassign email to interviewer failed'),
        );
      }
    }
    if (adminHrRecipients.length > 0) {
      const adminRecipientName = await getRecipientDisplayNameForBulkEmail(
        params.organizationId,
        adminHrRecipients,
      );
      sendBulkActionEmail({
        organizationId: params.organizationId,
        notificationType: NotificationType.STEP_COMPLETED,
        templateKey: 'bulk-unassign',
        variables: {
          candidateCount: totalCount.toString(),
          triggererName: params.triggerUserName,
          jobTitle: primaryJobTitle,
          jobId: primaryJobId,
          recipientName: adminRecipientName,
          stepName: 'Interview Unassigned',
          completedBy: params.triggerUserName,
          completionDate,
          feedback: params.feedback ?? 'N/A',
          nextStep: params.nextStep ?? 'N/A',
          candidateName: params.unassignments[0]?.candidateName ?? '',
        },
        recipients: adminHrRecipients,
        candidates: candidatesForEmail,
        triggererUserId: params.triggerUserId,
        triggererEmail: params.triggerUserEmail,
        triggererName: params.triggerUserName,
        jobId: primaryJobId,
      }).catch((err) =>
        logger.error({ err }, 'Bulk unassign email to admin/hr failed'),
      );
    }
  } catch (error) {
    logger.error(
      'Failed to send bulk candidate unassigned notification:',
      error,
    );
  }
}

/**
 * Bulk status update: admin/hr get one bulk notification.
 */
export async function notifyBulkCandidateStatusUpdated(params: {
  organizationId: string;
  newStatus: string;
  nextStep?: string;
  /** Remark when status update + remark done together (statusMessage in email) */
  statusMessage?: string;
  candidates: Array<{
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    oldStatus: string;
  }>;
  triggerUserId: string;
  triggerUserName: string;
  triggerUserEmail?: string;
}): Promise<void> {
  try {
    const adminHrIds = await getUsersByRole(params.organizationId, [
      'admin',
      'hr',
    ]);
    const filteredIds = adminHrIds.filter((id) => id !== params.triggerUserId);

    const hrContactInfo = await getHrContactInfo(
      params.organizationId,
      params.triggerUserId,
    );

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

    if (filteredIds.length > 0) {
      const candidatesForEmail = params.candidates.map((c) => ({
        candidateId: c.candidateId,
        candidateName: c.candidateName,
        jobId: c.jobId,
      }));
      const statusUpdateRecipientName =
        await getRecipientDisplayNameForBulkEmail(
          params.organizationId,
          filteredIds,
        );
      sendBulkActionEmail({
        organizationId: params.organizationId,
        notificationType: NotificationType.STATUS_UPDATES,
        templateKey: 'bulk-status-update',
        variables: {
          candidateCount: count.toString(),
          newStatus: params.newStatus,
          triggererName: params.triggerUserName,
          jobTitle: params.candidates[0]?.jobTitle ?? '',
          jobId: params.candidates[0]?.jobId ?? '',
          recipientName: statusUpdateRecipientName,
          statusMessage: params.statusMessage?.trim() || 'N/A',
          nextSteps:
            params.nextStep && params.nextStep !== 'N/A'
              ? params.nextStep
              : 'N/A',
          hrContactInfo: hrContactInfo ?? 'N/A',
          candidateName: params.candidates[0]?.candidateName ?? '',
        },
        recipients: filteredIds,
        candidates: candidatesForEmail,
        triggererUserId: params.triggerUserId,
        triggererEmail: params.triggerUserEmail,
        triggererName: params.triggerUserName,
        jobId: params.candidates[0]?.jobId,
      }).catch((err) =>
        logger.error({ err }, 'Bulk status update email failed'),
      );
    }
  } catch (error) {
    logger.error(
      'Failed to send bulk candidate status updated notification:',
      error,
    );
  }
}

/**
 * Bulk add remark: mentioned users get one notification per candidate (as MENTIONS);
 * admin/hr get one bulk notification (as NEW_REMARKS).
 */
export async function notifyBulkRemarkAdded(params: {
  organizationId: string;
  remarkText: string;
  roles: string[];
  validMentionUserIds?: string[];
  /** Rating (0-5) for bulk remark email template */
  rating?: number;
  candidates: Array<{
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
  }>;
  triggerUserId: string;
  triggerUserName: string;
  triggerUserEmail?: string;
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

    for (const c of params.candidates) {
      for (const mentionedUserId of mentionedUserIds) {
        if (mentionedUserId !== params.triggerUserId) {
          await createNotificationWithDecision(
            params.organizationId,
            mentionedUserId,
            NotificationType.MENTIONS,
            c.jobId,
            params.triggerUserId,
            true,
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

    const allEmailRecipients = [
      ...new Set([...filteredIds, ...mentionedUserIds]),
    ].filter((id) => id !== params.triggerUserId);
    if (allEmailRecipients.length > 0) {
      const candidatesForEmail = params.candidates.map((c) => ({
        candidateId: c.candidateId,
        candidateName: c.candidateName,
        jobId: c.jobId,
      }));
      const remarkTextTruncated =
        params.remarkText.substring(0, 100) +
        (params.remarkText.length > 100 ? '...' : '');
      const remarkRecipientName = await getRecipientDisplayNameForBulkEmail(
        params.organizationId,
        allEmailRecipients,
      );
      const remarkDate = (await formatDateForOrganization(
        new Date(),
        params.organizationId,
      )) as string;
      sendBulkActionEmail({
        organizationId: params.organizationId,
        notificationType: NotificationType.NEW_REMARKS,
        templateKey: 'bulk-remark',
        variables: {
          candidateCount: params.candidates.length.toString(),
          triggererName: params.triggerUserName,
          reviewerName: params.triggerUserName,
          remarkText: remarkTextTruncated,
          remarkDate,
          rating:
            params.rating !== undefined && params.rating !== null
              ? `${params.rating}/5`
              : 'N/A',
          jobTitle: params.candidates[0]?.jobTitle ?? '',
          jobId: params.candidates[0]?.jobId ?? '',
          recipientName: remarkRecipientName,
          candidateName: params.candidates[0]?.candidateName ?? '',
        },
        recipients: allEmailRecipients,
        candidates: candidatesForEmail,
        triggererUserId: params.triggerUserId,
        triggererEmail: params.triggerUserEmail,
        triggererName: params.triggerUserName,
        jobId: params.candidates[0]?.jobId,
      }).catch((err) => logger.error({ err }, 'Bulk remark email failed'));
    }
  } catch (error) {
    logger.error('Failed to send bulk remark notification:', error);
  }
}

/**
 * Bulk add follow-up: admin/hr get one bulk notification.
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

/**
 * Bulk import completed: admin/hr get one bulk notification.
 */
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
