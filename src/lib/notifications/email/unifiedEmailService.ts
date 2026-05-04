import logger from '@/lib/logger';
import connectToDatabase, { Candidate } from '@/lib/mongodb';
import { sendMail as sendMailWithContext } from './emailService';
import {
  validateObjectId,
  getMailConfig,
  getProvider,
  createEmailHistory,
  updateEmailHistoryStatus,
} from './helpers';

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
  options: UnifiedEmailOptions,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const mailConfig = await getMailConfig(options.organizationId);
    if (!mailConfig) {
      return { success: false, error: 'Mail configuration not found' };
    }

    const toEmails = Array.isArray(options.to) ? options.to : [options.to];
    const [primaryRecipient, ...additionalRecipients] = toEmails;
    const candidateId = validateObjectId(options.metadata?.candidateId);

    let { recipientName } = options;
    if (!recipientName && candidateId) {
      try {
        await connectToDatabase();
        const candidate = await Candidate?.findById(candidateId)
          .select('name')
          .lean();
        if (candidate) recipientName = candidate.name;
      } catch (error) {
        logger.error('Failed to fetch candidate name:', error);
      }
    }

    const emailHistory = await createEmailHistory({
      organizationId: options.organizationId,
      sentBy: options.sentBy,
      sentByEmail: options.sentByEmail,
      sentByName: options.sentByName,
      recipientType: options.recipientType || 'user',
      recipientId: options.recipientId,
      recipientEmail: primaryRecipient,
      recipientName: recipientName || primaryRecipient,
      subject: options.subject,
      body: options.html || options.text || '',
      cc: options.cc || [],
      bcc: additionalRecipients,
      replyTo: options.replyTo,
      attachments: options.attachments || [],
      provider: getProvider(mailConfig),
      metadata: options.metadata,
    });

    if (!emailHistory) {
      return { success: false, error: 'Failed to create email history' };
    }

    const result = await sendMailWithContext(
      mailConfig,
      primaryRecipient,
      options.subject,
      options.text,
      options.html,
      options.cc || [],
      additionalRecipients,
      options.replyTo,
      options.from,
      {
        organizationId: options.organizationId,
        sentBy: options.sentBy,
        sentByEmail: options.sentByEmail,
        sentByName: options.sentByName,
        recipientType: options.recipientType || 'user',
        recipientId: options.recipientId,
        recipientName: recipientName || primaryRecipient,
        metadata: options.metadata,
        attachments: options.attachments,
        emailHistoryId: emailHistory._id.toString(),
      },
    );

    await updateEmailHistoryStatus(
      emailHistory._id,
      result.success,
      result.messageId,
      result.error,
    );
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

// Re-export from modularized services
export { sendEventEmailWithHistory } from './eventEmailService';
export {
  sendSmartNotification,
  sendRemarkNotificationWithMentions,
  sendBulkActionEmail,
} from './smartNotificationService';
export type {
  BulkActionEmailParams,
  BulkEmailTemplateKey,
} from './smartNotificationService';
