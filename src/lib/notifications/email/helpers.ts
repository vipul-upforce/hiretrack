import mongoose from 'mongoose';
import connectToDatabase, { Settings, User } from '@/lib/mongodb';
import type { Ismtp } from '@/lib/models/settings';
import { getOrganizationName } from '@/lib/utils/organization';
import {
  batchCheckNotifications,
  NotificationType,
  NotificationDecisionContext,
} from '../decision';

/** Base URL for links in emails (env or fallback). */
export function getBaseUrl(): string {
  return (
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'http://localhost:3000'
  );
}

/**
 * Common variables used across email templates (bulk and single flows).
 * Use when building template variables for getMappedEmailTemplate.
 */
export async function getCommonEmailVariables(organizationId: string): Promise<{
  baseUrl: string;
  organizationName: string;
  dashboardLink: string;
}> {
  const baseUrl = getBaseUrl();
  const organizationName = await getOrganizationName(organizationId);
  return {
    baseUrl,
    organizationName: organizationName || '',
    dashboardLink: `${baseUrl}/dashboard`,
  };
}

/**
 * Returns the correct CTA URL for email templates based on recipient role.
 * - Admin/HR: job page (optionally with candidateId).
 * - Interviewer: candidate page only (no access to /dashboard/jobs).
 *
 * @param baseUrl - App base URL (e.g. from getCommonEmailVariables)
 * @param role - User role: 'admin' | 'hr' | 'interviewer'
 * @param options - jobId and/or candidateId for building the path
 */

/**
 * Returns the path-only action URL for in-app notifications (no base URL).
 * Use when storing actionUrl in notification records.
 */
export function getActionPathForRole(
  role: string,
  options: { jobId?: string; candidateId?: string },
): string {
  const { jobId, candidateId } = options;
  const isAdminHr = role === 'admin' || role === 'hr';

  if (candidateId && !isAdminHr) {
    return `/candidate/${candidateId}`;
  }
  if (jobId) {
    return candidateId
      ? `/dashboard/jobs/${jobId}?candidateId=${candidateId}`
      : `/dashboard/jobs/${jobId}`;
  }
  return '/dashboard';
}
export function getEmailActionUrl(
  baseUrl: string,
  role: string,
  options: { jobId?: string; candidateId?: string },
): string {
  const path = getActionPathForRole(role, options);
  return path.startsWith('http') ? path : `${baseUrl}${path}`;
}
export interface EmailHistoryData {
  organizationId: string;
  sentBy: string;
  sentByEmail: string;
  sentByName: string;
  recipientType: string;
  recipientId?: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: Array<{
    fileName: string;
    fileSize: number;
    shareId: string;
    shareUrl: string;
  }>;
  provider: string;
  metadata?: Record<string, unknown>;
}

export const EVENT_TYPE_TO_NOTIFICATION_TYPE: Record<string, NotificationType> =
  {
    job_application: NotificationType.NEW_APPLICATIONS,
    status_change: NotificationType.STATUS_UPDATES,
    candidate_updated: NotificationType.CANDIDATE_DETAILS_UPDATED,
    interview_assignment: NotificationType.INTERVIEW_ASSIGNMENTS,
    step_completed: NotificationType.STEP_COMPLETED,
    candidate_rejected: NotificationType.CANDIDATE_REJECTED,
    new_remark: NotificationType.NEW_REMARKS,
    mention: NotificationType.MENTIONS,
    meeting_scheduled: NotificationType.MEETING_SCHEDULED,
    meeting_updated: NotificationType.MEETING_UPDATED,
    meeting_cancelled: NotificationType.MEETING_CANCELLED,
    meeting_invite_accepted: NotificationType.MEETING_INVITE_ACCEPTED,
    meeting_invite_declined: NotificationType.MEETING_INVITE_DECLINED,
    meeting_invite_tentative: NotificationType.MEETING_INVITE_TENTATIVE,
    interview_completed: NotificationType.INTERVIEW_COMPLETED,
    followup_added: NotificationType.FOLLOWUP_ADDED,
    followup_updated: NotificationType.FOLLOWUP_UPDATED,
    followup_removed: NotificationType.FOLLOWUP_REMOVED,
    job_created: NotificationType.JOB_CREATED,
    job_updated: NotificationType.JOB_UPDATED,
    candidate_moved: NotificationType.CANDIDATE_MOVED,
    user_added: NotificationType.USER_ADDED,
    bulk_import_completed: NotificationType.BULK_IMPORT_COMPLETED,
  };

export function validateObjectId(
  id?: string,
): mongoose.Types.ObjectId | undefined {
  return id && mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : undefined;
}

export async function getMailConfig(
  organizationId: string,
): Promise<Ismtp | null> {
  await connectToDatabase();
  if (!Settings) return null;
  const settings = await Settings.findOne({
    organizationId: new mongoose.Types.ObjectId(organizationId),
  })
    .select('mailConfig')
    .lean()
    .exec();
  return settings?.mailConfig || null;
}

export function getProvider(mailConfig: Ismtp): string {
  if (mailConfig.mailProvider) return mailConfig.mailProvider;
  if (mailConfig.resend_from) return 'resend';
  if (mailConfig.brevo_from) return 'brevo';
  if (mailConfig.smtp_from) return 'smtp';
  return 'unknown';
}

export async function createEmailHistory(
  data: EmailHistoryData,
): Promise<{ _id: mongoose.Types.ObjectId } | null> {
  await connectToDatabase();
  const { EmailHistory } = await import('@/lib/mongodb');
  return (
    (await EmailHistory?.create({
      organizationId: new mongoose.Types.ObjectId(data.organizationId),
      sentBy: data.sentBy,
      sentByEmail: data.sentByEmail,
      sentByName: data.sentByName,
      recipientType: data.recipientType,
      recipientId: data.recipientId,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      subject: data.subject,
      body: data.body,
      cc: data.cc || [],
      bcc: data.bcc || [],
      replyTo: data.replyTo,
      attachments: data.attachments || [],
      status: 'pending',
      provider: data.provider,
      metadata: data.metadata,
    })) || null
  );
}

export async function updateEmailHistoryStatus(
  historyId: mongoose.Types.ObjectId,
  success: boolean,
  messageId?: string,
  error?: string,
): Promise<void> {
  await connectToDatabase();
  const { EmailHistory } = await import('@/lib/mongodb');
  await EmailHistory?.findByIdAndUpdate(historyId, {
    status: success ? 'sent' : 'failed',
    messageId,
    error,
  });
}

export async function resolveRecipientsToUserIds(
  recipients: string[],
  organizationId: string,
): Promise<string[]> {
  try {
    await connectToDatabase();
    if (!User) return [];
    const userIds: string[] = [];
    const emails: string[] = [];

    recipients
      .filter((r) => r && typeof r === 'string')
      .forEach((r) => {
        if (mongoose.Types.ObjectId.isValid(r)) userIds.push(r);
        else if (r.includes('@')) emails.push(r);
      });

    if (emails.length > 0) {
      const users = await User.find({
        email: { $in: emails },
        organizationId: new mongoose.Types.ObjectId(organizationId),
      })
        .select('_id')
        .lean();
      userIds.push(...users.map((u) => u._id.toString()));
    }

    return [...new Set(userIds)];
  } catch {
    return [];
  }
}

export async function filterRecipientsByNotificationSettings(
  recipients: Array<{
    _id: string | { toString(): string };
    email?: string;
    name?: string;
  }>,
  organizationId: string,
  eventType?: string,
  jobId?: string,
  triggererUserId?: string,
): Promise<
  Array<{ _id: string | { toString(): string }; email?: string; name?: string }>
> {
  if (!recipients?.length) return [];

  const notificationType = eventType
    ? EVENT_TYPE_TO_NOTIFICATION_TYPE[eventType]
    : NotificationType.STATUS_UPDATES;
  const decisionContexts: NotificationDecisionContext[] = recipients.map(
    (r) => ({
      organizationId,
      recipientUserId: r._id.toString(),
      notificationType,
      jobId,
      triggererUserId,
      isMention: eventType === 'mention',
      notificationCategory: 'email',
    }),
  );

  const decisions = await batchCheckNotifications(decisionContexts);
  return recipients.filter((_, i) => decisions[i]?.shouldSend);
}
