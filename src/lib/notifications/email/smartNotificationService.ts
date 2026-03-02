import { formatDateForOrganization } from '@/components/timezoneFormat/getFormattedTZ';
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

/** Max candidate names shown in email before tiered summary (Option 2: fixed cap). */
const BULK_CANDIDATE_LIST_MAX = 5;

/** Role-based link style: dashboard (admin/hr) vs candidate page (interviewer). */
export type CandidateLinkKind = 'dashboard' | 'candidate';

/**
 * Returns the candidate details page URL based on link kind (role-based).
 * - 'candidate' (interviewer): /candidate/{candidateId}
 * - 'dashboard' (admin/hr): /dashboard/jobs/{jobId}?candidateId={candidateId}
 */
export function getCandidateDetailsPageUrl(
  baseUrl: string,
  candidateId: string,
  jobId: string | null,
  linkKind: CandidateLinkKind,
): string {
  if (linkKind === 'candidate') {
    return `${baseUrl}/candidate/${candidateId}`;
  }
  if (jobId) {
    return `${baseUrl}/dashboard/jobs/${jobId}?candidateId=${candidateId}`;
  }
  return `${baseUrl}/candidate/${candidateId}`;
}

/**
 * Builds HTML for bulk candidate list using tiered preview:
 * - Shows first N names with links
 * - For 50+ candidates: "...and X more. View all N candidates →"
 * - linkKind: 'dashboard' → /dashboard/jobs/{jobId}?candidateId= (admin/hr only);
 *   'candidate' → /candidate/{candidateId} (interviewer)
 */
function buildCandidateListHtml(
  candidates: BulkActionEmailParams['candidates'],
  baseUrl: string,
  viewAllCandidatesLink: string,
  linkKind: CandidateLinkKind = 'dashboard',
): string {
  if (candidates.length === 0) return '';
  const toItem = (c: (typeof candidates)[0]) => {
    let href: string;
    if (linkKind === 'candidate') {
      href = `${baseUrl}/candidate/${c.candidateId}`;
    } else if (c.jobId) {
      href = `${baseUrl}/dashboard/jobs/${c.jobId}?candidateId=${c.candidateId}`;
    } else {
      href = `${baseUrl}/candidate/${c.candidateId}`;
    }
    return `<li style="margin: 4px 0;"><a href="${href}" style="color: #007bff; text-decoration: none;">${escapeHtml(c.candidateName)}</a></li>`;
  };
  const shown = candidates.slice(0, BULK_CANDIDATE_LIST_MAX);
  const items = shown.map(toItem).join('');
  const listHtml = `<ul style="margin: 10px 0; padding-left: 20px; list-style-type: disc;">${items}</ul>`;
  if (candidates.length <= BULK_CANDIDATE_LIST_MAX) {
    return listHtml;
  }
  const remainingCount = candidates.length - BULK_CANDIDATE_LIST_MAX;
  const moreSection = `<p style="margin: 10px 0 0 0; color: #6c757d;">...and ${remainingCount} more. <a href="${viewAllCandidatesLink}" style="color: #007bff; text-decoration: none; font-weight: 500;">View all ${candidates.length} candidates →</a></p>`;
  return `${listHtml}${moreSection}`;
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

    console.log('allRecipients >>>>>>>>', allRecipients);

    if (allRecipients.length === 0) {
      return {
        status: 200,
        message: 'No eligible recipients for email notifications',
        sentToUsers: [],
        mentionedUsers,
      };
    }
    console.log('eligibleUsers >>>>>>>>', eligibleUsers);
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
      console.log('users >>>>>>>>', users);

      const emailResult = await sendEventEmailWithHistory(
        organizationId,
        users.map((u) => u.email || '').filter(Boolean),
        emailContent.subject,
        emailContent.html,
        {
          sentBy: context.triggererUserId || 'system',
          sentByEmail: context.triggererEmail || '',
          sentByName: context.triggererName || '',
          metadata: {
            jobId: context.jobId,
            candidateId: context.candidateId,
            templateUsed: context.templateUsed,
            eventType: context.eventType,
          },
        },
        context.triggererEmail,
      );
      console.log('emailResult >>>>>>>>', emailResult);
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
  const [{ organizationName }, formattedRemarkDate] = await Promise.all([
    getCommonEmailVariables(organizationId),
    context.remarkDate
      ? Promise.resolve(context.remarkDate)
      : formatDateForOrganization(new Date(), organizationId),
  ]);
  const { emailContent, emailSubject } = await getMappedEmailTemplate(
    'new-remark',
    {
      recipientName: context.recipientName || '',
      candidateName: context.candidateName || '',
      jobTitle: context.jobTitle || 'Unknown Position',
      reviewerName: context.reviewerName || 'Unknown',
      remarkDate: formattedRemarkDate as string,
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
    /** For interviewers, "View all" and primary CTA go to dashboard (no job page access). */
    const viewAllLinkInterviewer = dashboardLink;

    const notificationContext = {
      triggererUserId,
      jobId: primaryJobId || undefined,
      eventType: `bulk_${templateKey.replace('bulk-', '')}`,
      templateUsed: templateKey,
    };
    const { eligibleUsers } = await processSmartNotificationRecipients(
      organizationId,
      notificationType,
      notificationContext,
      recipients,
    );

    if (eligibleUsers.length === 0) {
      return {
        status: 200,
        message: 'No eligible recipients for bulk email',
        sentToUsers: [],
      };
    }

    await connectToDatabase();
    const usersWithRole = await User!
      .find({
        _id: { $in: eligibleUsers },
        organizationId: new mongoose.Types.ObjectId(organizationId),
      })
      .select('_id email name role')
      .lean();

    const candidateListHtmlDashboard = buildCandidateListHtml(
      candidates,
      baseUrl,
      viewAllCandidatesLink,
      'dashboard',
    );
    const candidateListHtmlCandidate = buildCandidateListHtml(
      candidates,
      baseUrl,
      viewAllLinkInterviewer,
      'candidate',
    );

    const baseMergedVariables = {
      ...variables,
      viewAllCandidatesLink,
      actionUrl,
      dashboardLink,
      organizationName: organizationName || variables.organizationName || '',
      candidateProfileLink:
        variables.candidateProfileLink ||
        (primaryJobId
          ? `${baseUrl}/dashboard/jobs/${primaryJobId}`
          : dashboardLink),
    };

    const interviewerUsers = usersWithRole.filter(
      (u) => u.role === 'interviewer' && u.email,
    );
    const adminHrUsers = usersWithRole.filter(
      (u) => (u.role === 'admin' || u.role === 'hr') && u.email,
    );

    const emailContext = {
      sentBy: triggererUserId || '',
      sentByEmail: triggererEmail || '',
      sentByName: triggererName || '',
      metadata: {
        jobId: notificationContext.jobId,
        templateUsed: templateKey,
        eventType: notificationContext.eventType,
      },
    };
    const sentToUsers: string[] = [];

    if (interviewerUsers.length > 0) {
      const interviewerMergedVariables = {
        ...baseMergedVariables,
        candidateListHtml: candidateListHtmlCandidate,
        viewAllCandidatesLink: viewAllLinkInterviewer,
        actionUrl: viewAllLinkInterviewer,
      };
      const { emailContent: htmlI, emailSubject: subjI } =
        await getMappedEmailTemplate(
          templateKey,
          interviewerMergedVariables,
          organizationId,
        );
      const resI = await sendEventEmailWithHistory(
        organizationId,
        interviewerUsers.map((u) => u.email!),
        subjI,
        htmlI,
        emailContext,
        triggererEmail,
      );
      if (resI.status === 200) {
        interviewerUsers.forEach((u) => sentToUsers.push(String(u._id)));
      }
    }

    if (adminHrUsers.length > 0) {
      const { emailContent: htmlAH, emailSubject: subjAH } =
        await getMappedEmailTemplate(
          templateKey,
          {
            ...baseMergedVariables,
            candidateListHtml: candidateListHtmlDashboard,
          },
          organizationId,
        );
      const resAH = await sendEventEmailWithHistory(
        organizationId,
        adminHrUsers.map((u) => u.email!),
        subjAH,
        htmlAH,
        emailContext,
        triggererEmail,
      );
      if (resAH.status === 200) {
        adminHrUsers.forEach((u) => sentToUsers.push(String(u._id)));
      }
    }

    return {
      status: 200,
      message: `Sent bulk action emails to ${sentToUsers.length} users`,
      sentToUsers,
    };
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
