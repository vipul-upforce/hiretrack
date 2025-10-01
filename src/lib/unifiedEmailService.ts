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
  batchCheckEmailNotifications,
  EmailNotificationType,
  EmailDecisionContext,
} from "@/lib/services/emailDecisionEngine";

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

    // If we have a candidateId but no recipient name, try to fetch it
    let recipientName = options.recipientName;
    if (!recipientName && options.metadata?.candidateId) {
      try {
        const candidate = await Candidate.findById(options.metadata.candidateId)
          .select("name")
          .lean();
        if (candidate) {
          recipientName = candidate.name;
        }
      } catch (error) {
        console.error("Failed to fetch candidate name:", error);
      }
    }

    // Use the context-aware sendMail for single recipient
    const result = await sendMailWithContext(
      settings.mailConfig,
      primaryRecipient,
      options.subject,
      options.text,
      options.html,
      options.cc,
      options.bcc,
      options.replyTo,
      options.from,
      {
        organizationId: options.organizationId,
        sentBy: options.sentBy,
        sentByEmail: options.sentByEmail,
        sentByName: options.sentByName,
        recipientType: options.recipientType,
        recipientId: options.recipientId,
        recipientName: recipientName || primaryRecipient,
        metadata: options.metadata,
        attachments: options.attachments,
      }
    );

    // For additional recipients beyond the first, send separately
    if (toEmails.length > 1) {
      const additionalRecipients = toEmails.slice(1);
      const additionalResults = await Promise.all(
        additionalRecipients.map(async (email) => {
          try {
            await sendMailWithContext(
              settings.mailConfig,
              email,
              options.subject,
              options.text,
              options.html,
              options.cc,
              options.bcc,
              options.replyTo,
              options.from,
              {
                organizationId: options.organizationId,
                sentBy: options.sentBy,
                sentByEmail: options.sentByEmail,
                sentByName: options.sentByName,
                recipientType: "user",
                recipientId: undefined,
                recipientName: email,
                metadata: options.metadata,
                attachments: options.attachments,
              }
            );
            return { success: true };
          } catch (error) {
            return {
              success: false,
              error:
                error instanceof Error ? error.message : "Failed to send email",
            };
          }
        })
      );
      const failedAdditional = additionalResults.filter((r) => !r.success);
      if (failedAdditional.length > 0) {
        result.success = false;
        result.error = `Failed to send ${failedAdditional.length} out of ${additionalRecipients.length} additional emails. Errors: ${failedAdditional.map((f) => f.error).join(", ")}`;
      }
    }

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
    const triggerer =
      ("sentByEmail" in context ? context.sentByEmail : triggererEmail) ||
      triggererEmail;
    // Filter out triggerer's email if provided
    let filteredEmails = emails;
    if (triggerer) {
      filteredEmails = emails.filter((email) => email && email !== triggerer);
      console.log(
        "⌛ Filtered out triggerer's email:",
        triggerer,
        "from recipients:",
        emails,
        "-> result:",
        filteredEmails
      );
    } else {
      // Just filter out empty emails if no triggerer email provided
      filteredEmails = emails.filter((email) => !!email);
    }

    // 2. Find recipient users to get their IDs and correct names
    const candidateRecipient =
      filteredEmails[0] && context.metadata.eventType === "job_application"
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

    if (
      candidateRecipient
        ? [candidateRecipient, ...filteredRecipients].length === 0
        : [...filteredRecipients].length === 0
    ) {
      return { status: 404, message: "No valid recipients found." };
    }
    console.log(
      "🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥 filtered recipients: ",
      filteredRecipients
    );
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

    // 4. Process each recipient
    const recips = candidateRecipient
      ? [candidateRecipient, ...filteredRecipients]
      : [...filteredRecipients];
    const emailPromises = recips.map(async (recipient) => {
      try {
        // Create a pending email history record
        const emailHistory = await EmailHistory.create({
          organizationId: new mongoose.Types.ObjectId(organizationId),
          sentBy: context.sentBy,
          sentByEmail: context.sentByEmail,
          sentByName: context.sentByName,
          recipientType: "user",
          recipientId: recipient._id, // Correctly link to User document
          recipientEmail: recipient.email,
          recipientName: recipient.name || recipient.email,
          subject,
          body: html,
          cc: [],
          bcc: [],
          replyTo: context.sentByEmail,
          attachments: [],
          status: "pending",
          provider,
          metadata: context.metadata
            ? {
                jobId: context.metadata.jobId
                  ? new mongoose.Types.ObjectId(context.metadata.jobId)
                  : undefined,
                candidateId: context.metadata.candidateId
                  ? new mongoose.Types.ObjectId(context.metadata.candidateId)
                  : undefined,
                templateUsed: context.metadata.templateUsed,
                eventType: context.metadata.eventType,
              }
            : undefined,
        });

        // 5. Send the email using the utility that updates the history
        return await sendMailWithContext(
          mailConfig,
          recipient.email,
          subject,
          undefined, // text body
          html,
          [], // cc
          [], // bcc
          context.sentByEmail,
          undefined, // from email (will be determined by sendMailWithContext)
          {
            emailHistoryId: emailHistory._id.toString(),
          }
        );
      } catch (error) {
        console.error(`Failed to process email for ${recipient.email}:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const results = await Promise.all(emailPromises);
    const failedSends = results.filter((r) => !r.success);

    if (failedSends.length > 0) {
      const errors = failedSends.map((f) => f.error).join(", ");
      return {
        status: 500,
        message: `Failed to send ${failedSends.length} out of ${recipients.length} emails. Errors: ${errors}`,
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
 * Enhanced email sending with smart notification filtering and mention detection
 */
export async function sendSmartNotificationEmail(
  organizationId: string,
  notificationType: EmailNotificationType,
  context: {
    triggererUserId?: string;
    triggererEmail?: string;
    triggererName?: string;
    jobId?: string;
    candidateId?: string;
    eventType?: string;
    templateUsed?: string;
    content?: string; // For mention detection in remarks/comments
  },
  emailContent: {
    subject: string;
    html: string;
    text?: string;
  },
  potentialRecipients: string[] // User IDs or emails
): Promise<{
  status: number;
  message: string;
  sentToUsers: string[];
  mentionedUsers?: string[];
}> {
  try {
    await dbConnect();

    const sentToUsers: string[] = [];
    let mentionedUsers: string[] = [];

    // 1. Handle mention detection if content is provided
    if (
      context.content &&
      ["newRemarks", "statusUpdates"].includes(notificationType)
    ) {
      try {
        console.log("🔍 MENTION DETECTION DEBUG:");
        console.log("  - Content:", context.content);
        console.log("  - Organization ID:", organizationId);
        console.log("  - Notification Type:", notificationType);

        const mentionResult = await findMentionedUsers(
          context.content,
          organizationId
        );

        console.log(
          "  - Mention Result:",
          JSON.stringify(mentionResult, null, 2)
        );

        mentionedUsers = mentionResult.mentionedUsers.map((u) => u._id);
        console.log("  - Mentioned User IDs:", mentionedUsers);

        // Add mentioned users to the regular recipients list
        if (mentionedUsers.length > 0) {
          console.log("📧 Found mentioned users:", mentionedUsers);
          console.log("  - Will include them in regular email recipients");
        } else {
          console.log("  - No mentions found in content");
        }
      } catch (mentionError) {
        console.error("❌ Error in mention detection:", mentionError);
        // Continue with regular email sending even if mention detection fails
        mentionedUsers = [];
      }
    } else {
      console.log("🔍 MENTION DETECTION SKIPPED:");
      console.log("  - Content provided:", !!context.content);
      console.log("  - Notification type:", notificationType);
      console.log("  - Eligible types:", ["newRemarks", "statusUpdates"]);
    }

    // 2. Convert potential recipients to user IDs
    const userIds = await resolveRecipientsToUserIds(
      potentialRecipients,
      organizationId
    );

    // 3. Combine regular recipients with mentioned users (avoid duplicates)
    const allRecipients = [...new Set([...userIds, ...mentionedUsers])];
    console.log("📧 Combined recipients:", allRecipients);

    if (allRecipients.length === 0) {
      return {
        status: 200,
        message: "No eligible recipients for notifications",
        sentToUsers,
        mentionedUsers,
      };
    }

    // 4. Check notification preferences for all recipients
    const decisionContexts: EmailDecisionContext[] = allRecipients.map(
      (userId) => ({
        organizationId,
        recipientUserId: userId,
        notificationType,
        jobId: context.jobId,
        triggererUserId: context.triggererUserId,
        isMention: mentionedUsers.includes(userId), // Mark if this user was mentioned
      })
    );

    const decisions = await batchCheckEmailNotifications(decisionContexts);
    const eligibleUserIds = allRecipients.filter((userId, index) => {
      const decision = decisions[index];
      return decision.shouldSend;
    });

    // 5. Send notifications to all eligible users (including mentioned users)
    if (eligibleUserIds.length > 0) {
      const emailResult = await sendNotificationToUsers(
        organizationId,
        eligibleUserIds,
        emailContent,
        context
      );

      if (emailResult.success) {
        sentToUsers.push(...eligibleUserIds);
      }
    }

    return {
      status: 200,
      message: `Sent notifications to ${sentToUsers.length} users`,
      sentToUsers,
      mentionedUsers,
    };
  } catch (error) {
    console.error("Smart notification email error:", error);
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
      return { success: true }; // No users to send to
    }

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
          jobId: context.jobId,
          candidateId: context.candidateId,
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

    return [...new Set(userIds)]; // Remove duplicates
  } catch (error) {
    console.error("Error resolving recipients to user IDs:", error);
    return [];
  }
}

/**
 * Send remark notification with mention detection
 * Replaces the need for separate remark and mention emails
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
  },
  potentialRecipients: string[] // HR/Admin user IDs who should be notified of remarks
): Promise<{
  status: number;
  message: string;
  sentToUsers: string[];
  mentionedUsers?: string[];
}> {
  const emailContent = {
    subject: `New Remark Added${context.candidateName ? ` - ${context.candidateName}` : ""}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Remark Added</h2>
        ${context.candidateName ? `<p><strong>Candidate:</strong> ${context.candidateName}</p>` : ""}
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Remark:</strong></p>
          <div>${remarkContent}</div>
        </div>
        <p><small>Added by: ${context.triggererName || "Unknown"}</small></p>
      </div>
    `,
  };

  return await sendSmartNotificationEmail(
    organizationId,
    "newRemarks",
    {
      ...context,
      content: remarkContent,
      eventType: "new_remark",
      templateUsed: "remark-notification",
    },
    emailContent,
    potentialRecipients
  );
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

  // Map event types to notification types
  const eventTypeToNotificationType: Record<string, EmailNotificationType> = {
    status_change: "statusUpdates",
    job_application: "newApplications",
    interview_assignment: "interviewAssignments",
    new_remark: "newRemarks",
    step_completed: "stepCompleted",
    mention: "mentions",
  };

  const notificationType =
    eventTypeToNotificationType[context.metadata?.eventType || ""] ||
    "statusUpdates";

  // Create decision contexts for batch checking
  const decisionContexts: EmailDecisionContext[] = recipients.map(
    (recipient) => ({
      organizationId,
      recipientUserId: recipient._id.toString(),
      notificationType,
      jobId: context.metadata?.jobId,
      triggererUserId: context.sentBy,
      isMention: context.metadata?.eventType === "mention",
    })
  );

  // Batch check notification preferences
  const decisions = await batchCheckEmailNotifications(decisionContexts);

  // Filter recipients based on decisions
  const filteredRecipients = recipients.filter((recipient, index) => {
    const decision = decisions[index];
    return decision.shouldSend;
  });

  console.log(
    `📧 Email notification filtering: ${recipients.length} -> ${filteredRecipients.length} recipients for ${notificationType}`
  );

  return filteredRecipients;
}
