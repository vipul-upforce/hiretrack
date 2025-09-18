import { sendMail as sendMailWithContext } from "./emailUtils";
import { sendMail as sendEventMail } from "@/app/api/event-mail";
import dbConnect, {
  Settings,
  User,
  Candidate,
  EmailHistory,
} from "@/lib/mongodb";
import mongoose from "mongoose";
import { ISettings } from "@/lib/models/settings";

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

    // Filter out triggerer's email if provided
    let filteredEmails = emails;
    if (triggererEmail) {
      filteredEmails = emails.filter(
        (email) => email && email !== triggererEmail
      );
      console.log(
        "⌛ Filtered out triggerer's email:",
        triggererEmail,
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

    if (
      candidateRecipient
        ? [candidateRecipient, ...recipients].length === 0
        : [...recipients].length === 0
    ) {
      return { status: 404, message: "No valid recipients found." };
    }
    console.log("🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥 recipients: ", recipients);
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
      ? [candidateRecipient, ...recipients]
      : [...recipients];
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
