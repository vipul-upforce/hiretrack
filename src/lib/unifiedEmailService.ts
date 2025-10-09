import { sendMail as sendMailWithContext } from "./emailUtils";
import dbConnect, {
  Settings,
  User,
  Candidate,
  EmailHistory,
} from "@/lib/mongodb";
import mongoose from "mongoose";
import { ISettings } from "@/lib/models/settings";
import { findMentionedUsers } from "@/lib/services/userMentionService";
import {
  batchCheckNotifications,
  NotificationType,
  NotificationDecisionContext,
} from "@/lib/services/emailDecisionEngine";
import { getMappedEmailTemplate } from "@/app/actions/getMappedEmailTemplate";
import { NotificationService } from "./notifications/notificationService";

interface UnifiedEmailOptions {
  organizationId: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  from?: string;
  sentBy: string;
  sentByEmail: string;
  sentByName: string;
  recipientType?: string;
  recipientId?: string;
  recipientName?: string;
  metadata?: {
    jobId?: string;
    candidateId?: string;
    templateUsed?: string;
    eventType?: string;
  };
  attachments?: Array<{
    fileName: string;
    fileSize: number;
    shareId: string;
    shareUrl: string;
  }>;
}

/**
 * Unified email sending function that tracks all emails in history
 */
export async function sendUnifiedMail(
  options: UnifiedEmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    await dbConnect();
    console.log(options, "options for the bcc send");

    // Get organization settings for mail configuration
    const settings = (await Settings.findOne({
      organizationId: options.organizationId,
    })) as ISettings;
    if (!settings || !settings.mailConfig) {
      return { success: false, error: "Mail configuration not found" };
    }

    // Convert to array if single email
    const toEmails = Array.isArray(options.to) ? options.to : [options.to];
    const primaryRecipient = toEmails[0];
    const additionalRecipients = toEmails.length > 1 ? toEmails.slice(1) : [];

    // Validate jobId and candidateId
    const jobId =
      options.metadata?.jobId &&
      mongoose.Types.ObjectId.isValid(options.metadata.jobId)
        ? new mongoose.Types.ObjectId(options.metadata.jobId)
        : undefined;
    const candidateId =
      options.metadata?.candidateId &&
      mongoose.Types.ObjectId.isValid(options.metadata.candidateId)
        ? new mongoose.Types.ObjectId(options.metadata.candidateId)
        : undefined;

    // If we have a candidateId but no recipient name, try to fetch it
    let recipientName = options.recipientName;
    if (!recipientName && candidateId) {
      try {
        const candidate = await Candidate.findById(candidateId)
          .select("name")
          .lean();
        if (candidate) {
          recipientName = candidate.name;
        }
      } catch (error) {
        console.error("Failed to fetch candidate name:", error);
      }
    }

    // Create a single email history record for the primary recipient with BCC
    const emailHistory = await EmailHistory.create({
      organizationId: new mongoose.Types.ObjectId(options.organizationId),
      sentBy: options.sentBy,
      sentByEmail: options.sentByEmail,
      sentByName: options.sentByName,
      recipientType: options.recipientType || "user",
      recipientId: options.recipientId,
      recipientEmail: primaryRecipient,
      recipientName: recipientName || primaryRecipient,
      subject: options.subject,
      body: options.html || options.text || "",
      cc: options.cc || [],
      bcc: additionalRecipients, // Include additional recipients in BCC
      replyTo: options.replyTo,
      attachments: options.attachments || [],
      status: "pending",
      provider: settings.mailConfig.mailProvider || "unknown",
      metadata: options.metadata,
    });
    console.log("Email history created:", emailHistory);

    // Send a single email with primary recipient in 'to' and additional recipients in 'bcc'
    const result = await sendMailWithContext(
      settings.mailConfig,
      primaryRecipient,
      options.subject,
      options.text,
      options.html,
      options.cc || [], // Use provided CC or empty array
      additionalRecipients, // Additional recipients in BCC
      options.replyTo,
      options.from,
      {
        organizationId: options.organizationId,
        sentBy: options.sentBy,
        sentByEmail: options.sentByEmail,
        sentByName: options.sentByName,
        recipientType: options.recipientType || "user",
        recipientId: options.recipientId,
        recipientName: recipientName || primaryRecipient,
        metadata: options.metadata,
        attachments: options.attachments,
        emailHistoryId: emailHistory._id.toString(),
      }
    );

    // Update email history status based on send result
    if (!result.success) {
      await EmailHistory.findByIdAndUpdate(emailHistory._id, {
        status: "failed",
        error: result.error,
      });
      return result;
    }

    await EmailHistory.findByIdAndUpdate(emailHistory._id, {
      status: "sent",
      messageId: result.messageId,
    });
    return result;
  } catch (error) {
    console.error("Unified email send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

/**
 * Send event emails (status updates, remarks, etc.) with history tracking
 */
export async function sendEventEmailWithHistory(
  organizationId: string,
  emails: string[],
  subject: string,
  html: string,
  context: {
    sentBy: string;
    sentByEmail: string;
    sentByName: string;
    metadata?: {
      jobId?: string;
      candidateId?: string;
      templateUsed?: string;
      eventType?: string;
    };
  },
  triggererEmail?: string
): Promise<{ status: number; message: string }> {
  try {
    await dbConnect();

    // 1. Get organization's mail configuration
    const settings = await Settings.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    }).lean();

    if (!settings || !settings.mailConfig) {
      return {
        status: 500,
        message: "Mail configuration not found for the organization.",
      };
    }
    const mailConfig = settings.mailConfig;

    // Filter out triggerer's email if provided
    const triggerer = context.sentByEmail || triggererEmail;
    let filteredEmails = emails.filter((email) => email && email !== triggerer);
    if (triggerer) {
      console.log(
        "⌛ Filtered out triggerer's email:",
        triggerer,
        "from recipients:",
        emails,
        "-> result:",
        filteredEmails
      );
    }

    if (filteredEmails.length === 0) {
      return { status: 404, message: "No valid recipients found." };
    }

    // 2. Find recipient users to get their IDs and correct names
    const candidateRecipient =
      filteredEmails[0] && context.metadata?.eventType === "job_application"
        ? await Candidate.findOne({
            email: filteredEmails[0],
            organizationId: new mongoose.Types.ObjectId(organizationId),
          })
            .select("_id name email")
            .lean()
        : null;
    const recipients = await User.find({
      email: { $in: filteredEmails },
      organizationId: new mongoose.Types.ObjectId(organizationId),
    })
      .select("_id name email")
      .lean();

    // Filter recipients based on email notification settings
    const filteredRecipients = await filterRecipientsByNotificationSettings(
      recipients,
      organizationId,
      context
    );

    const allRecipients = candidateRecipient
      ? [candidateRecipient, ...filteredRecipients]
      : filteredRecipients;

    if (allRecipients.length === 0) {
      return {
        status: 404,
        message: "No valid recipients found after filtering.",
      };
    }
    console.log("🔥 Filtered recipients:", allRecipients);

    // 3. Determine email provider for history logging
    let provider = "unknown";
    if (mailConfig.mailProvider) {
      provider = mailConfig.mailProvider;
    } else if (mailConfig.resend_from) {
      provider = "resend";
    } else if (mailConfig.brevo_from) {
      provider = "brevo";
    } else if (mailConfig.smtp_from) {
      provider = "smtp";
    }

    // 4. Validate jobId and candidateId
    const jobId =
      context.metadata?.jobId &&
      mongoose.Types.ObjectId.isValid(context.metadata.jobId)
        ? new mongoose.Types.ObjectId(context.metadata.jobId)
        : undefined;
    const candidateId =
      context.metadata?.candidateId &&
      mongoose.Types.ObjectId.isValid(context.metadata.candidateId)
        ? new mongoose.Types.ObjectId(context.metadata.candidateId)
        : undefined;

    // 5. Send a single email with primary recipient in 'to' and others in 'bcc'
    const primaryRecipient = allRecipients[0];
    const bccRecipients = allRecipients.slice(1).map((r) => r.email);

    // Create a single email history record
    const emailHistory = await EmailHistory.create({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      sentBy: context.sentBy,
      sentByEmail: context.sentByEmail,
      sentByName: context.sentByName,
      recipientType:
        candidateRecipient &&
        primaryRecipient.email === candidateRecipient.email
          ? "candidate"
          : "user",
      recipientId: primaryRecipient._id,
      recipientEmail: primaryRecipient.email,
      recipientName: primaryRecipient.name || primaryRecipient.email,
      subject,
      body: html,
      cc: [], // Explicitly no CC
      bcc: bccRecipients, // Additional recipients in BCC
      replyTo: context.sentByEmail,
      attachments: [],
      status: "pending",
      provider,
      metadata: context.metadata
        ? {
            jobId,
            candidateId,
            templateUsed: context.metadata.templateUsed,
            eventType: context.metadata.eventType,
          }
        : undefined,
    });
    console.log("Email history created:", emailHistory);

    // Send the email
    const result = await sendMailWithContext(
      mailConfig,
      primaryRecipient.email,
      subject,
      undefined,
      html,
      [], // Explicitly no CC
      bccRecipients, // Additional recipients in BCC
      context.sentByEmail,
      undefined,
      {
        emailHistoryId: emailHistory._id.toString(),
      }
    );

    // Update email history status
    await EmailHistory.findByIdAndUpdate(emailHistory._id, {
      status: result.success ? "sent" : "failed",
      messageId: result.messageId,
      error: result.error,
    });

    if (!result.success) {
      return {
        status: 500,
        message: `Failed to send email. Error: ${result.error}`,
      };
    }

    return { status: 200, message: "All event emails sent successfully." };
  } catch (error) {
    console.error("Event email send error:", error);
    return {
      status: 500,
      message:
        error instanceof Error ? error.message : "Failed to send event emails",
    };
  }
}

/**
 * Send smart notifications (email and in-app) with mention detection
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
  },
  emailContent: {
    subject: string;
    html: string;
    text?: string;
  },
  potentialRecipients: string[]
): Promise<{
  status: number;
  message: string;
  sentToUsers: { userId: string; email: boolean; inApp: boolean }[];
  mentionedUsers?: string[];
}> {
  try {
    await dbConnect();

    // Validate jobId and candidateId
    if (context.jobId && !mongoose.Types.ObjectId.isValid(context.jobId)) {
      console.warn(`Invalid jobId provided: ${context.jobId}`);
      context.jobId = undefined;
    }
    if (
      context.candidateId &&
      !mongoose.Types.ObjectId.isValid(context.candidateId)
    ) {
      console.warn(`Invalid candidateId provided: ${context.candidateId}`);
      context.candidateId = undefined;
    }

    const sentToUsers: { userId: string; email: boolean; inApp: boolean }[] =
      [];
    let mentionedUsers: string[] = [];

    // 1. Handle mention detection if content is provided
    if (
      context.content &&
      [NotificationType.NEW_REMARKS, NotificationType.STATUS_UPDATES].includes(
        notificationType
      )
    ) {
      try {
        const mentionResult = await findMentionedUsers(
          context.content,
          organizationId
        );
        mentionedUsers = mentionResult.mentionedUsers.map((u) =>
          u._id.toString()
        );
        console.log("Mentioned users:", mentionedUsers);
      } catch (mentionError) {
        console.error("Error in mention detection:", mentionError);
      }
    }

    // 2. Convert potential recipients to user IDs
    const userIds = await resolveRecipientsToUserIds(
      potentialRecipients,
      organizationId
    );
    const allRecipients = [...new Set([...userIds, ...mentionedUsers])];

    if (allRecipients.length === 0) {
      return {
        status: 200,
        message: "No eligible recipients for notifications",
        sentToUsers,
        mentionedUsers,
      };
    }

    // 3. Check notification preferences for both email and in-app
    const emailDecisionContexts: NotificationDecisionContext[] =
      allRecipients.map((userId) => ({
        organizationId,
        recipientUserId: userId,
        notificationType,
        jobId: context.jobId,
        triggererUserId: context.triggererUserId,
        isMention: mentionedUsers.includes(userId),
        notificationCategory: "email",
      }));

    const inAppDecisionContexts: NotificationDecisionContext[] =
      allRecipients.map((userId) => ({
        organizationId,
        recipientUserId: userId,
        notificationType,
        jobId: context.jobId,
        triggererUserId: context.triggererUserId,
        isMention: mentionedUsers.includes(userId),
        notificationCategory: "inApp",
      }));

    const [emailDecisions, inAppDecisions] = await Promise.all([
      batchCheckNotifications(emailDecisionContexts),
      batchCheckNotifications(inAppDecisionContexts),
    ]);

    const eligibleUsers = allRecipients.reduce(
      (acc, userId, index) => {
        const canSendEmail = emailDecisions[index].shouldSend;
        const canSendInApp = inAppDecisions[index].shouldSend;
        if (canSendEmail || canSendInApp) {
          acc.push({ userId, email: canSendEmail, inApp: canSendInApp });
        }
        return acc;
      },
      [] as { userId: string; email: boolean; inApp: boolean }[]
    );

    if (eligibleUsers.length === 0) {
      return {
        status: 200,
        message: "No users have enabled notifications for this type",
        sentToUsers,
        mentionedUsers,
      };
    }

    // 4. Send notifications
    const emailEligibleUserIds = eligibleUsers
      .filter((u) => u.email)
      .map((u) => u.userId);
    const inAppEligibleUserIds = eligibleUsers
      .filter((u) => u.inApp)
      .map((u) => u.userId);

    // Send emails
    if (emailEligibleUserIds.length > 0) {
      const emailResult = await sendNotificationToUsers(
        organizationId,
        emailEligibleUserIds,
        emailContent,
        context
      );
      if (emailResult.success) {
        eligibleUsers.forEach((u) => {
          if (emailEligibleUserIds.includes(u.userId)) {
            sentToUsers.push({ userId: u.userId, email: true, inApp: u.inApp });
          }
        });
      } else {
        console.error("Email sending failed:", emailResult.error);
      }
    }

    return {
      status: 200,
      message: `Sent notifications to ${sentToUsers.length} users (email: ${sentToUsers.filter((u) => u.email).length}, in-app: ${sentToUsers.filter((u) => u.inApp).length})`,
      sentToUsers,
      mentionedUsers,
    };
  } catch (error) {
    console.error("Smart notification error:", error);
    return {
      status: 500,
      message:
        error instanceof Error
          ? error.message
          : "Failed to send smart notifications",
      sentToUsers: [],
      mentionedUsers: [],
    };
  }
}

/**
 * Send remark notification with mention detection
 */
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
  },
  potentialRecipients: string[]
): Promise<{
  status: number;
  message: string;
  sentToUsers: { userId: string; email: boolean; inApp: boolean }[];
  mentionedUsers?: string[];
}> {
  // Define variables for the email template
  const variables = {
    recipientName: context.recipientName,
    candidateName: context.candidateName || "",
    jobTitle: context.jobTitle || "Unknown Position",
    reviewerName: context.reviewerName || "Unknown",
    remarkDate: context.remarkDate || new Date().toISOString().split("T")[0],
    rating: context.rating !== undefined ? context.rating : "Not Provided",
    remarkText: remarkContent,
    candidateProfileLink: context.candidateProfileLink || "#",
    organizationName: context.organizationName || "Your Organization",
  };

  // Get the mapped email template
  const { emailContent, emailSubject } = await getMappedEmailTemplate(
    "new-remark",
    variables,
    organizationId
  );

  // Construct the email content object
  const emailContentObj = {
    subject: emailSubject,
    html: emailContent,
  };

  return await sendSmartNotification(
    organizationId,
    NotificationType.NEW_REMARKS,
    {
      ...context,
      content: remarkContent,
      eventType: "new_remark",
      templateUsed: "remark-notification",
    },
    emailContentObj,
    potentialRecipients
  );
}

/**
 * Send notifications to a list of user IDs
 */
async function sendNotificationToUsers(
  organizationId: string,
  userIds: string[],
  emailContent: { subject: string; html: string; text?: string },
  context: {
    triggererUserId?: string;
    triggererEmail?: string;
    triggererName?: string;
    jobId?: string;
    candidateId?: string;
    eventType?: string;
    templateUsed?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user emails
    const users = await User.find({
      _id: { $in: userIds },
      organizationId: new mongoose.Types.ObjectId(organizationId),
    })
      .select("_id email name")
      .lean();

    if (users.length === 0) {
      return { success: true };
    }

    // Validate jobId and candidateId
    const jobId =
      context.jobId && mongoose.Types.ObjectId.isValid(context.jobId)
        ? context.jobId
        : undefined;
    const candidateId =
      context.candidateId &&
      mongoose.Types.ObjectId.isValid(context.candidateId)
        ? context.candidateId
        : undefined;

    // Use existing sendEventEmailWithHistory function
    const emails = users.map((u) => u.email);
    const result = await sendEventEmailWithHistory(
      organizationId,
      emails,
      emailContent.subject,
      emailContent.html,
      {
        sentBy: context.triggererUserId || "system",
        sentByEmail: context.triggererEmail || "system@hiretrack.com",
        sentByName: context.triggererName || "System",
        metadata: {
          jobId,
          candidateId,
          templateUsed: context.templateUsed,
          eventType: context.eventType,
        },
      },
      context.triggererEmail
    );

    return {
      success: result.status === 200,
      error: result.status !== 200 ? result.message : undefined,
    };
  } catch (error) {
    console.error("Send notification to users error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Convert mixed recipient list (emails/user IDs) to user IDs
 */
async function resolveRecipientsToUserIds(
  recipients: string[],
  organizationId: string
): Promise<string[]> {
  try {
    const userIds: string[] = [];
    const emails: string[] = [];

    // Filter out null/undefined recipients and separate user IDs from emails
    recipients
      .filter((recipient) => recipient && typeof recipient === "string")
      .forEach((recipient) => {
        if (mongoose.Types.ObjectId.isValid(recipient)) {
          userIds.push(recipient);
        } else if (recipient.includes("@")) {
          emails.push(recipient);
        }
      });

    // Get user IDs for email addresses
    if (emails.length > 0) {
      const users = await User.find({
        email: { $in: emails },
        organizationId: new mongoose.Types.ObjectId(organizationId),
      })
        .select("_id")
        .lean();

      userIds.push(...users.map((u) => u._id.toString()));
    }

    return [...new Set(userIds)];
  } catch (error) {
    console.error("Error resolving recipients to user IDs:", error);
    return [];
  }
}

/**
 * Filter recipients based on their email notification settings
 */
async function filterRecipientsByNotificationSettings(
  recipients: Array<{
    _id: string | { toString(): string };
    email?: string;
    name?: string;
  }>,
  organizationId: string,
  context: {
    sentBy: string;
    sentByEmail: string;
    sentByName: string;
    metadata?: {
      jobId?: string;
      candidateId?: string;
      templateUsed?: string;
      eventType?: string;
    };
  }
): Promise<
  Array<{ _id: string | { toString(): string }; email?: string; name?: string }>
> {
  if (!recipients || recipients.length === 0) {
    return [];
  }

  // Updated event type → notification type map (covers all supported events)
  const eventTypeToNotificationType: Record<string, NotificationType> = {
    // candidate/job related
    job_application: NotificationType.NEW_APPLICATIONS,
    status_change: NotificationType.STATUS_UPDATES,
    candidate_updated: NotificationType.CANDIDATE_DETAILS_UPDATED,
    interview_assignment: NotificationType.INTERVIEW_ASSIGNMENTS,
    step_completed: NotificationType.STEP_COMPLETED,
    candidate_rejected: NotificationType.CANDIDATE_REJECTED,

    // remarks, mentions
    new_remark: NotificationType.NEW_REMARKS,
    mention: NotificationType.MENTIONS,

    // meetings
    meeting_scheduled: NotificationType.MEETING_SCHEDULED,
    meeting_updated: NotificationType.MEETING_UPDATED,
    meeting_cancelled: NotificationType.MEETING_CANCELLED,
    meeting_invite_accepted: NotificationType.MEETING_INVITE_ACCEPTED,
    meeting_invite_declined: NotificationType.MEETING_INVITE_DECLINED,
    meeting_invite_tentative: NotificationType.MEETING_INVITE_TENTATIVE,
    interview_completed: NotificationType.INTERVIEW_COMPLETED,

    // follow-ups
    followup_added: NotificationType.FOLLOWUP_ADDED,
    followup_updated: NotificationType.FOLLOWUP_UPDATED,
    followup_removed: NotificationType.FOLLOWUP_REMOVED,

    // checklist
    checklist_completed: NotificationType.CHECKLIST_COMPLETED,

    // jobs
    job_created: NotificationType.JOB_CREATED,
    job_updated: NotificationType.JOB_UPDATED,

    // user/org/system
    user_added: NotificationType.USER_ADDED,
    bulk_import_completed: NotificationType.BULK_IMPORT_COMPLETED,
  };

  const rawEventType = context.metadata?.eventType || "";
  const notificationType =
    eventTypeToNotificationType[rawEventType] ||
    NotificationType.STATUS_UPDATES;

  console.log(notificationType, "→ chosen NotificationType for", rawEventType);

  // Build decision contexts for all recipients
  const decisionContexts: NotificationDecisionContext[] = recipients.map(
    (recipient) => ({
      organizationId,
      recipientUserId: recipient._id.toString(),
      notificationType,
      jobId: context.metadata?.jobId,
      triggererUserId: context.sentBy,
      isMention: rawEventType === "mention",
      notificationCategory: "email",
    })
  );

  // Batch check preferences
  const decisions = await batchCheckNotifications(decisionContexts);
  console.log(decisions, "→ notification send decisions");

  // Filter recipients
  const filteredRecipients = recipients.filter(
    (recipient, index) => decisions[index]?.shouldSend
  );

  console.log(
    `📧 Email filtering: ${recipients.length} → ${filteredRecipients.length} recipients for ${notificationType}`
  );

  return filteredRecipients;
}
