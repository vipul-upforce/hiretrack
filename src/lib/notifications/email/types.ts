import type { Ismtp } from '@/lib/models/settings';

/**
 * Email sending options
 */
export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  from?: string;
}

/**
 * Email sending result
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email history context
 */
export interface EmailHistoryContext {
  emailHistoryId: string;
}

/**
 * Email metadata context
 */
export interface EmailMetadataContext {
  organizationId: string;
  sentBy: string;
  sentByEmail: string;
  sentByName: string;
  recipientType: string;
  recipientId: string;
  recipientName: string;
  metadata: {
    jobId?: string;
    candidateId?: string;
    templateUsed?: string;
    eventType?: string;
  };
  attachments: {
    fileName: string;
    fileSize: number;
    shareId: string;
    shareUrl: string;
  }[];
}

/**
 * Union type for email context
 */
export type EmailContext = EmailHistoryContext | EmailMetadataContext;

/**
 * Email provider interface
 */
export interface EmailProvider {
  send(config: Ismtp, options: EmailOptions): Promise<EmailResult>;
}
