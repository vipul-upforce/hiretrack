import mongoose from 'mongoose';
import { Settings } from '@/lib/mongodb';
import { sendSmartNotification } from '@/lib/services/unifiedEmailService';
import { NotificationType } from '@/lib/services/emailDecisionEngine';
import { getMappedEmailTemplate } from '@/lib/notifications/email/getMappedEmailTemplate';
import { getOrganizationName } from '@/lib/utils/organization';
import { resolveSentByToObjectId } from '@/lib/utils/userResolution';
import { generateCalendarLinks } from '@/app/api/event-mail/calendarUtils';
import { updateEmailHistoryStatus } from '@/app/api/event-mail/emailHistory';
import {
  SendQueuedEmailParams,
  EmailSendResult,
} from '@/app/api/event-mail/types';

/**
 * Sends the actual email based on queue data
 */
export async function sendQueuedEmail(
  params: SendQueuedEmailParams,
): Promise<EmailSendResult> {
  const { data, req, historyIds } = params;
  const {
    organizationId,
    email,
    eventTitle,
    startTime,
    endTime,
    jobName,
    interviewerName,
    candidateName,
    status,
    emailList,
    candidateDetailsPage,
    sentBy,
    sentByEmail,
    sentByName,
    candidateId,
    jobId,
    dashboardLink,
  } = data;

  // Optimize: Fetch settings (with timezone) and organization name in parallel
  const [settings, organizationName] = await Promise.all([
    Settings?.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    })
      .select('mailConfig timeZone.offset timeZone.name')
      .lean()
      .exec(),
    getOrganizationName(organizationId),
  ]);

  if (!settings || !settings.mailConfig) {
    throw new Error('Mail configuration not found');
  }

  const fromEmail =
    settings.mailConfig.resend_from ||
    settings.mailConfig.brevo_from ||
    settings.mailConfig.smtp_from ||
    'system@hiretrack.com';

  const timeZoneOffset = `${settings.timeZone?.offset || ''} ${settings.timeZone?.name || ''}`;

  // Optimize: Resolve sentBy and generate calendar links in parallel
  const [resolvedSentById, calendarLinks] = await Promise.all([
    resolveSentByToObjectId({
      sentBy,
      sentByEmail,
      sentByName,
      organizationId,
      fromEmail,
    }),
    generateCalendarLinks(
      req,
      eventTitle,
      startTime,
      endTime,
      jobName,
      interviewerName,
      candidateName,
      status,
      timeZoneOffset,
    ),
  ]);

  const {
    googleCalendarLink,
    outlookCalendarLink,
    startDateString,
    endDateString,
  } = calendarLinks;

  // Fetch email template with organization name
  const { emailContent, emailSubject } = await getMappedEmailTemplate(
    'interview-assignment',
    {
      eventTitle,
      interviewDate: startDateString,
      endDate: endDateString,
      jobTitle: jobName || '',
      interviewerName: interviewerName || '',
      candidateName: candidateName || '',
      interviewType: status || '',
      meetingLink: googleCalendarLink,
      outlookCalendarLink,
      candidateProfileLink: candidateDetailsPage,
      organizationName,
      dashboardLink: dashboardLink || '',
    },
    organizationId,
  );

  // Use sendSmartNotificationEmail for interview assignments
  const emailStatus = await sendSmartNotification(
    organizationId,
    NotificationType.INTERVIEW_ASSIGNMENTS,
    {
      triggererUserId: resolvedSentById, // Use resolved ObjectId
      triggererEmail: sentByEmail,
      triggererName: sentByName,
      jobId,
      candidateId,
      eventType: 'interview_assignment',
      templateUsed: 'interview-assignment',
    },
    {
      subject: emailSubject,
      html: emailContent,
    },
    [email, ...emailList], // Combine primary recipient (interviewer) and BCC recipients (HR/Admins)
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

  return {
    status: emailStatus.status,
    message: emailStatus.message,
  };
}
