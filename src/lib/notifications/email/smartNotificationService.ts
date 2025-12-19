import logger from '@/lib/logger';
import mongoose from 'mongoose';
import connectToDatabase, { User } from '@/lib/mongodb';
import { findMentionedUsers } from '@/lib/services/userMentionService';
import { getMappedEmailTemplate } from '@/app/actions/getMappedEmailTemplate';
import {
  batchCheckNotifications,
  NotificationType,
  NotificationDecisionContext,
} from '../decision';
import { resolveRecipientsToUserIds } from './helpers';
import { sendEventEmailWithHistory } from './eventEmailService';

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
          sentByEmail: context.triggererEmail || 'system@hiretrack.com',
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
  const { emailContent, emailSubject } = await getMappedEmailTemplate(
    'new-remark',
    {
      recipientName: context.recipientName,
      candidateName: context.candidateName || '',
      jobTitle: context.jobTitle || 'Unknown Position',
      reviewerName: context.reviewerName || 'Unknown',
      remarkDate: context.remarkDate || new Date().toISOString().split('T')[0],
      rating: context.rating !== undefined ? context.rating : 'Not Provided',
      remarkText: remarkContent,
      candidateProfileLink: context.candidateProfileLink || '#',
      organizationName: context.organizationName || 'Your Organization',
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
