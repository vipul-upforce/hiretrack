import { User } from '@/lib/mongodb';
import { getMappedEmailTemplate } from '@/app/actions/getMappedEmailTemplate';
import { NotificationType } from '@/lib/services/emailDecisionEngine';
import { NotificationService } from '@/lib/notifications/notificationService';
import { sendSmartNotification } from '@/lib/unifiedEmailService';
import { logger } from '@/lib/logger/logger.server';
import { getFromEmail, getMailSettings } from '@/lib/utils/mailSettings';
import { getNextStep } from '@/lib/utils/organization';
import { resolveSentByToObjectId } from '@/lib/utils/userResolution';
import { updateEmailHistoryStatus } from './statusEmailHistory';
import type { StatusUpdateQueueData } from './types';

/**
 * Sends the actual email based on queue data
 */
export async function sendQueuedEmail(
  data: StatusUpdateQueueData,
  historyIds?: string[],
): Promise<{ status: number; message: string }> {
  const {
    organizationId,
    eventTitle,
    candidateName,
    status,
    remark,
    rating,
    emailList,
    actionBy,
    jobName,
    prevStatus,
    eventSubTitle,
    candidateDetails,
    candidateId,
    jobId,
    sentBy,
    sentByEmail,
    sentByName,
    hrContactInfo,
  } = data;

  const settings = await getMailSettings(organizationId);
  if (!settings || !settings.mailConfig) {
    throw new Error('Mail configuration not found');
  }

  const fromEmail = await getFromEmail(organizationId);

  const organization = await User?.findOne({
    organizationId,
  })
    .populate({
      path: 'organizationId',
      select: 'name defaultLanes',
    })
    .lean();

  const nextSteps = getNextStep(organization, status);

  const organizationName =
    typeof organization?.organizationId === 'object'
      ? organization.organizationId.name
      : '';

  const { emailContent, emailSubject } = await getMappedEmailTemplate(
    'status-update',
    {
      eventTitle,
      jobTitle: jobName,
      candidateName,
      newStatus: status,
      statusMessage: remark,
      rating,
      actionBy,
      nextSteps,
      prev_status: prevStatus,
      eventSubTitle,
      candidateDetails,
      organizationName,
      hrContactInfo,
    },
    organizationId,
  );

  const resolvedSentById = await resolveSentByToObjectId({
    sentBy,
    organizationId,
    fromEmail,
  });

  const emailStatus = await sendSmartNotification(
    organizationId,
    NotificationType.STATUS_UPDATES,
    {
      triggererUserId: resolvedSentById,
      triggererEmail: sentByEmail,
      triggererName: sentByName,
      jobId,
      candidateId,
      eventType: 'status_change',
      templateUsed: 'status-update',
    },
    {
      subject: emailSubject,
      html: emailContent,
    },
    emailList,
  );

  // If we have existing history IDs (from pending), update them
  if (historyIds && historyIds.length > 0) {
    await updateEmailHistoryStatus({
      historyIds,
      status: emailStatus.status === 200 ? 'sent' : 'failed',
      error: emailStatus.status !== 200 ? emailStatus.message : undefined,
      updatedContent: { subject: emailSubject, body: emailContent },
    });
  }

  try {
    if (status === 'rejected') {
      await NotificationService.notifyCandidateRejected({
        organizationId,
        candidateId,
        candidateName,
        jobId: jobId || '',
        jobTitle: jobName || '',
        triggerUserId: sentBy || '',
        triggerUserName: sentByName || '',
      });
    } else {
      await NotificationService.notifyCandidateStatusUpdated({
        organizationId,
        candidateId,
        candidateName,
        jobId: jobId || '',
        jobTitle: jobName || '',
        oldStatus: prevStatus || '',
        newStatus: status,
        triggerUserId: sentBy || '',
        triggerUserName: sentByName || '' ,
      });
    }
  } catch (notifyErr) {
    logger.error({ notifyErr }, 'Failed to send in-app notification');
  }

  return emailStatus;
}
