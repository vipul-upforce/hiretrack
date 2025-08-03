import { sendMail as sendMailWithContext } from "./emailUtils";
import { sendMail as sendEventMail } from "@/app/api/event-mail";
import dbConnect, { Settings, User, Candidate, EmailHistory } from "@/lib/mongodb";
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
export async function sendUnifiedMail(options: UnifiedEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    await dbConnect();
    
    // Get organization settings for mail configuration
    const settings = await Settings.findOne({ organizationId: options.organizationId }) as ISettings;
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
        const candidate = await Candidate.findById(options.metadata.candidateId).select('name').lean();
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
      for (const email of additionalRecipients) {
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
      }
    }

    return result;
  } catch (error) {
    console.error("Unified email send error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send email" 
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
  }
): Promise<{ status: number; message: string }> {
  try {
    // Use the existing event mail function
    const result = await sendEventMail(
      organizationId,
      emails,
      subject,
      html
    );

    // If successful, save to history
    if (result.status === 200) {
      try {
        await dbConnect();
        
        // Create email history entries for each recipient
        const historyPromises = emails.map(async (email) => {
          const emailHistoryData = {
            organizationId: new mongoose.Types.ObjectId(organizationId),
            sentBy: new mongoose.Types.ObjectId(context.sentBy),
            sentByEmail: context.sentByEmail,
            sentByName: context.sentByName,
            recipientType: "user",
            recipientId: null,
            recipientEmail: email,
            recipientName: email,
            subject,
            body: html,
            cc: [],
            bcc: emails.filter(e => e !== email), // Others are BCC
            replyTo: context.sentByEmail,
            attachments: [],
            status: "sent" as const,
            provider: "event_mail",
            metadata: context.metadata ? {
              jobId: context.metadata.jobId ? new mongoose.Types.ObjectId(context.metadata.jobId) : undefined,
              candidateId: context.metadata.candidateId ? new mongoose.Types.ObjectId(context.metadata.candidateId) : undefined,
              templateUsed: context.metadata.templateUsed,
              eventType: context.metadata.eventType,
            } : undefined,
            sentAt: new Date(),
          };

          return EmailHistory.create(emailHistoryData);
        });

        await Promise.all(historyPromises);
      } catch (historyError) {
        console.error("Failed to save event email history:", historyError);
        // Don't fail the email send if history fails
      }
    }

    return result;
  } catch (error) {
    console.error("Event email send error:", error);
    return {
      status: 500,
      message: error instanceof Error ? error.message : "Failed to send email"
    };
  }
}