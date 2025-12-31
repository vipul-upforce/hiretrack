import mongoose from 'mongoose';
import { Settings, User } from '@/lib/mongodb';
import { getMappedEmailTemplate } from '@/lib/notifications/email/getMappedEmailTemplate';
import { Organization } from '@/lib/models/user';
import { NotificationType } from '@/lib/services/emailDecisionEngine';
import { NotificationService } from '@/lib/notifications/notificationService';
import { sendSmartNotification } from '@/lib/services/unifiedEmailService';
import { logger } from '@/lib/logger/logger.server';
import type { StatusUpdateQueueData } from './types';
import { updateEmailHistoryStatus } from './statusEmailHistory';

/**
 * Type guard to check if object is Organization
 */
function isOrganization(obj: unknown): obj is Organization {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'defaultLanes' in obj &&
    Array.isArray((obj as Organization).defaultLanes)
  );
}

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

  // Optimize: Fetch settings and organization in parallel
  const [settings, organization] = await Promise.all([
    Settings?.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    })
      .select('mailConfig')
      .lean()
      .exec(),
    User?.findOne({
      organizationId,
    })
      .populate({
        path: 'organizationId',
        select: 'name defaultLanes',
      })
      .lean(),
  ]);

  if (!settings || !settings.mailConfig) {
    throw new Error('Mail configuration not found');
  }

  const fromEmail =
    settings.mailConfig.resend_from ||
    settings.mailConfig.brevo_from ||
    settings.mailConfig.smtp_from ||
    '';

  const orgData =
    organization &&
    organization.organizationId &&
    isOrganization(organization.organizationId)
      ? organization.organizationId
      : null;

  const nextSteps =
    orgData?.defaultLanes && orgData.defaultLanes.length > 0
      ? (orgData.defaultLanes[orgData.defaultLanes.indexOf(status) + 1] ??
        'N/A')
      : 'N/A';

  const organizationName =
    typeof organization?.organizationId === 'object'
      ? organization.organizationId.name
      : '';

  // Optimize: Fetch template and system user in parallel
  const [{ emailContent, emailSubject }, systemUser] = await Promise.all([
    getMappedEmailTemplate(
      'status-update',
      {
        eventTitle,
        jobTitle: jobName || '',
        candidateName,
        newStatus: status,
        statusMessage: remark || '',
        rating: rating?.toString() || '',
        actionBy: actionBy || '' || 'N/A',
        nextSteps,
        prev_status: prevStatus || 'N/A',
        eventSubTitle: eventSubTitle || '',
        candidateDetails,
        organizationName: organizationName || '',
        hrContactInfo: hrContactInfo || '',
      },
      organizationId,
    ),
    User?.findOneAndUpdate(
      { email: fromEmail, organizationId },
      {
        $setOnInsert: {
          name: 'HireTrack System',
          email: fromEmail,
          role: 'system',
          organizationId,
        },
      },
      { upsert: true, new: true },
    ),
  ]);

  const emailStatus = await sendSmartNotification(
    organizationId,
    NotificationType.STATUS_UPDATES,
    {
      triggererUserId: sentBy || systemUser?._id.toString(),
      triggererEmail: sentByEmail || systemUser?.email,
      triggererName: sentByName || systemUser?.name,
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
        triggerUserName: sentByName || '',
      });
    }
  } catch (notifyErr) {
    logger.error({ notifyErr }, 'Failed to send in-app notification');
  }

  return emailStatus;
}
