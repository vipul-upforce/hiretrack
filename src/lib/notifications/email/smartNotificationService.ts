import logger from '@/lib/logger';
import mongoose from 'mongoose';
import connectToDatabase, { User } from '@/lib/mongodb';
import { findMentionedUsers } from '@/lib/services/userMentionService';
import { getMappedEmailTemplate } from './getMappedEmailTemplate';
import {
  batchCheckNotifications,
  NotificationType,
  NotificationDecisionContext,
} from '../decision';
import { resolveRecipientsToUserIds, getCommonEmailVariables } from './helpers';
import { sendEventEmailWithHistory } from './eventEmailService';

export type BulkEmailTemplateKey =
  | 'bulk-assign'
  | 'bulk-unassign'
  | 'bulk-status-update'
  | 'bulk-remark';

export interface BulkActionEmailParams {
  organizationId: string;
  notificationType: NotificationType;
  templateKey: BulkEmailTemplateKey;
  /** Template variables (candidateListHtml and viewAllCandidatesLink are built automatically) */
  variables: Record<string, string>;
  /** User IDs to send email to */
  recipients: string[];
  /** Candidates for building candidateListHtml (each needs candidateId, candidateName, jobId) */
  candidates: Array<{
    candidateId: string;
    candidateName: string;
    jobId: string;
  }>;
  triggererUserId?: string;
  triggererEmail?: string;
  triggererName?: string;
  /** Primary job ID for actionUrl and viewAllCandidatesLink */
  jobId?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Max candidate names shown in email before "View all X candidates" link. */
const BULK_CANDIDATE_LIST_MAX = 5;

function buildCandidateListHtml(
  candidates: BulkActionEmailParams['candidates'],
  baseUrl: string,
  viewAllCandidatesLink: string,
): string {
  if (candidates.length === 0) return '';
  const toItem = (c: (typeof candidates)[0]) =>
    `<li style="margin: 4px 0;"><a href="${baseUrl}/candidate/${c.candidateId}" style="color: #007bff; text-decoration: none;">${escapeHtml(c.candidateName)}</a></li>`;
  const shown = candidates.slice(0, BULK_CANDIDATE_LIST_MAX);
  const items = shown.map(toItem).join('');
  const listHtml = `<ul style="margin: 10px 0; padding-left: 20px; list-style-type: disc;">${items}</ul>`;
  if (candidates.length <= BULK_CANDIDATE_LIST_MAX) {
    return listHtml;
  }
  const moreLink = `<p style="margin: 10px 0 0 0;"><a href="${viewAllCandidatesLink}" style="color: #007bff; text-decoration: none; font-weight: 500;">View all ${candidates.length} candidates →</a></p>`;
  return `${listHtml}${moreLink}`;
}

async function processSmartNotificationRecipients(
  organizationId: string,
  notificationType: NotificationType,
  context: {
    triggererUserId?: string;
    jobId?: string;
    candidateId?: string;
    content?: string;
    validMentionUserIds?: string[];
  },
  potentialRecipients: string[],
): Promise<{
  allRecipients: string[];
  mentionedUsers: string[];
  eligibleUsers: string[]; // Only email-eligible user IDs
}> {
  let mentionedUsers: string[] = [];

  if (
    context.content &&
    [NotificationType.NEW_REMARKS, NotificationType.STATUS_UPDATES].includes(
      notificationType,
    )
  ) {
    try {
      const mentionResult = await findMentionedUsers(
        context.content,
        organizationId,
        context.validMentionUserIds,
      );
      mentionedUsers = mentionResult.mentionedUsers.map((u) =>
        u._id.toString(),
      );
    } catch (mentionError) {
      logger.error('Error in mention detection:', mentionError);
    }
  }

  const userIds = await resolveRecipientsToUserIds(
    potentialRecipients,
    organizationId,
  );
  const allRecipients = [...new Set([...userIds, ...mentionedUsers])];

  if (allRecipients.length === 0) {
    return { allRecipients: [], mentionedUsers, eligibleUsers: [] };
  }

  // Only check email preferences, not in-app
  const emailDecisionContexts: NotificationDecisionContext[] =
    allRecipients.map((userId) => ({
      organizationId,
      recipientUserId: userId,
      notificationType,
      jobId: context.jobId,
      triggererUserId: context.triggererUserId,
      isMention: mentionedUsers.includes(userId),
      notificationCategory: 'email',
    }));

  const emailDecisions = await batchCheckNotifications(emailDecisionContexts);

  const eligibleUsers = allRecipients.filter(
    (_userId, index) => emailDecisions[index]?.shouldSend,
  );

  return { allRecipients, mentionedUsers, eligibleUsers };
}

/**
 * Sends email notifications only (no in-app notifications)
 * This function checks user email preferences and sends emails accordingly
 */

export async function sendSmartNotification(
  organizationId: string,
  notificationType: NotificationType,
  context: {
    triggererUserId?: string;
    triggererEmail?: string;
    triggererName?: string;
    jobId?: string;
    candidateId?: string;
    eventType?: string;
    templateUsed?: string;
    content?: string;
    validMentionUserIds?: string[];
  },
  emailContent: { subject: string; html: string; text?: string },
  potentialRecipients: string[],
): Promise<{
  status: number;
  message: string;
  sentToUsers: string[]; // User IDs who received emails
  mentionedUsers?: string[];
}> {
  try {
    if (context.jobId && !mongoose.Types.ObjectId.isValid(context.jobId)) {
      context.jobId = undefined;
    }
    if (
      context.candidateId &&
      !mongoose.Types.ObjectId.isValid(context.candidateId)
    ) {
      context.candidateId = undefined;
    }
    const { allRecipients, mentionedUsers, eligibleUsers } =
      await processSmartNotificationRecipients(
        organizationId,
        notificationType,
        context,
        potentialRecipients,
      );

    if (allRecipients.length === 0) {
      return {
        status: 200,
        message: 'No eligible recipients for email notifications',
        sentToUsers: [],
        mentionedUsers,
      };
    }

    if (eligibleUsers.length === 0) {
      return {
        status: 200,
        message: 'No users have enabled email notifications for this type',
        sentToUsers: [],
        mentionedUsers,
      };
    }

    // Send emails only
    if (User) {
      await connectToDatabase();
      const users = await User.find({
        _id: { $in: eligibleUsers },
        organizationId: new mongoose.Types.ObjectId(organizationId),
      })
        .select('_id email name')
        .lean();

      const emailResult = await sendEventEmailWithHistory(
        organizationId,
        users.map((u) => u.email || '').filter(Boolean),
        emailContent.subject,
        emailContent.html,
        {
          sentBy: context.triggererUserId || 'system',
          sentByEmail: context.triggererEmail || '',
          sentByName: context.triggererName || 'System',
          metadata: {
            jobId: context.jobId,
            candidateId: context.candidateId,
            templateUsed: context.templateUsed,
            eventType: context.eventType,
          },
        },
        context.triggererEmail,
      );

      if (emailResult.status === 200) {
        return {
          status: 200,
          message: `Sent email notifications to ${eligibleUsers.length} users`,
          sentToUsers: eligibleUsers,
          mentionedUsers,
        };
      }

      return {
        status: emailResult.status,
        message: emailResult.message || 'Failed to send email notifications',
        sentToUsers: [],
        mentionedUsers,
      };
    }

    return {
      status: 500,
      message: 'User model not available',
      sentToUsers: [],
      mentionedUsers,
    };
  } catch (error) {
    return {
      status: 500,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to send email notifications',
      sentToUsers: [],
      mentionedUsers: [],
    };
  }
}

export async function sendRemarkNotificationWithMentions(
  organizationId: string,
  remarkContent: string,
  context: {
    triggererUserId?: string;
    triggererEmail?: string;
    triggererName?: string;
    jobId?: string;
    candidateId?: string;
    candidateName?: string;
    jobTitle?: string;
    reviewerName?: string;
    remarkDate?: string;
    rating?: number | string;
    candidateProfileLink?: string;
    organizationName?: string;
    recipientName?: string;
    validMentionUserIds?: string[];
  },
  potentialRecipients: string[],
): Promise<{
  status: number;
  message: string;
  sentToUsers: string[]; // User IDs who received emails
  mentionedUsers?: string[];
}> {
  const { organizationName } = await getCommonEmailVariables(organizationId);
  const { emailContent, emailSubject } = await getMappedEmailTemplate(
    'new-remark',
    {
      recipientName: context.recipientName || '',
      candidateName: context.candidateName || '',
      jobTitle: context.jobTitle || 'Unknown Position',
      reviewerName: context.reviewerName || 'Unknown',
      remarkDate: context.remarkDate || new Date().toISOString().split('T')[0],
      rating:
        context.rating !== undefined && context.rating !== null
          ? context.rating.toString()
          : 'Not Provided',
      remarkText: remarkContent,
      candidateProfileLink: context.candidateProfileLink || '#',
      organizationName:
        context.organizationName || organizationName || 'Your Organization',
    },
    organizationId,
  );

  return sendSmartNotification(
    organizationId,
    NotificationType.NEW_REMARKS,
    {
      ...context,
      content: remarkContent,
      eventType: 'new_remark',
      templateUsed: 'remark-notification',
      validMentionUserIds: context.validMentionUserIds,
    },
    { subject: emailSubject, html: emailContent },
    potentialRecipients,
  );
}

/**
 * Sends bulk action email notifications.
 * Builds candidateListHtml and viewAllCandidatesLink from candidates, fetches template, and sends via sendSmartNotification.
 *
 * Fire-and-forget: Callers typically invoke without await and use .catch() for error logging,
 * so the bulk request is not blocked by email delivery. Errors are logged but do not fail the bulk operation.
 */
export async function sendBulkActionEmail(
  params: BulkActionEmailParams,
): Promise<{ status: number; message: string; sentToUsers: string[] }> {
  try {
    const {
      organizationId,
      notificationType,
      templateKey,
      variables,
      recipients,
      candidates,
      triggererUserId,
      triggererEmail,
      triggererName,
      jobId,
    } = params;

    if (recipients.length === 0 || candidates.length === 0) {
      return {
        status: 200,
        message: 'No recipients or candidates for bulk email',
        sentToUsers: [],
      };
    }

    const { baseUrl, organizationName, dashboardLink } =
      await getCommonEmailVariables(organizationId);
    const primaryJobId = jobId ?? candidates[0]?.jobId ?? '';
    const viewAllCandidatesLink = primaryJobId
      ? `${baseUrl}/dashboard/jobs/${primaryJobId}`
      : `${baseUrl}/dashboard`;
    const actionUrl = viewAllCandidatesLink;

    const candidateListHtml = buildCandidateListHtml(
      candidates,
      baseUrl,
      viewAllCandidatesLink,
    );

    const mergedVariables = {
      ...variables,
      candidateListHtml,
      viewAllCandidatesLink,
      actionUrl,
      dashboardLink,
      organizationName: organizationName || variables.organizationName || '',
    };

    const { emailContent: finalContent, emailSubject: finalSubject } =
      await getMappedEmailTemplate(
        templateKey,
        mergedVariables,
        organizationId,
      );

    return sendSmartNotification(
      organizationId,
      notificationType,
      {
        triggererUserId,
        triggererEmail,
        triggererName,
        jobId: primaryJobId || undefined,
        eventType: `bulk_${templateKey.replace('bulk-', '')}`,
        templateUsed: templateKey,
      },
      { subject: finalSubject, html: finalContent },
      recipients,
    );
  } catch (error) {
    logger.error(
      { error, templateKey: params.templateKey },
      'Bulk action email failed',
    );
    return {
      status: 500,
      message:
        error instanceof Error ? error.message : 'Bulk action email failed',
      sentToUsers: [],
    };
  }
}
