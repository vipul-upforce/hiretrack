import type { Ismtp } from '@/lib/models/settings';
import logger from '@/lib/logger';
import { sendSMTPMail, sendResendMail, sendBrevoMail } from './providers';
import {
  isValidEmail,
  filterEmailArray,
  getTriggererEmail,
} from './validators';
import { updateEmailHistory } from './history';
import type { EmailOptions, EmailResult, EmailContext } from './types';

/**
 * Gets the from email address based on the mail provider configuration
 */
function getFromEmail(
  mailConfig: Ismtp,
  from?: string,
): { email: string; error?: string } {
  let fromEmail: string;

  switch (mailConfig.mailProvider) {
    case 'smtp':
      fromEmail = from || mailConfig.smtp_from;
      if (!fromEmail) {
        return { email: '', error: 'SMTP from email not configured' };
      }
      break;
    case 'resend':
      fromEmail = from || mailConfig.resend_from;
      if (!fromEmail) {
        return { email: '', error: 'Resend from email not configured' };
      }
      break;
    case 'brevo':
      fromEmail = from || mailConfig.brevo_from;
      if (!fromEmail) {
        return { email: '', error: 'Brevo from email not configured' };
      }
      break;
    default:
      return {
        email: '',
        error: `Unsupported mail provider: ${mailConfig.mailProvider}`,
      };
  }

  return { email: fromEmail };
}

/**
 * Validates email addresses
 */
function validateEmails(
  fromEmail: string,
  to: string,
): { valid: boolean; error?: string } {
  if (!isValidEmail(fromEmail)) {
    return {
      valid: false,
      error: `Invalid from email format: ${fromEmail}`,
    };
  }
  if (!isValidEmail(to)) {
    return { valid: false, error: `Invalid to email format: ${to}` };
  }
  return { valid: true };
}

/**
 * Sends email using the configured provider
 */
async function sendEmailWithProvider(
  mailConfig: Ismtp,
  emailOptions: EmailOptions,
): Promise<EmailResult> {
  switch (mailConfig.mailProvider) {
    case 'smtp':
      return sendSMTPMail(mailConfig, emailOptions);
    case 'resend':
      return sendResendMail(mailConfig, emailOptions);
    case 'brevo':
      return sendBrevoMail(mailConfig, emailOptions);
    default:
      return { success: false, error: 'Unsupported mail provider' };
  }
}

/**
 * Main email sending function
 * Supports multiple email providers (SMTP, Resend, Brevo)
 * and optional email history tracking
 */
export async function sendMail(
  mailConfig: Ismtp,
  to: string,
  subject: string,
  text?: string,
  html?: string,
  cc?: string[],
  bcc?: string[],
  replyTo?: string,
  from?: string,
  context?: EmailContext,
  triggererEmail?: string,
): Promise<EmailResult> {
  try {
    // Validate mail configuration
    if (!mailConfig.mailProvider) {
      return { success: false, error: 'Mail provider not configured' };
    }

    // Get from email based on provider
    const fromEmailResult = getFromEmail(mailConfig, from);
    if (fromEmailResult.error) {
      return { success: false, error: fromEmailResult.error };
    }

    // Validate email addresses
    const emailValidation = validateEmails(fromEmailResult.email, to);
    if (!emailValidation.valid) {
      return { success: false, error: emailValidation.error };
    }

    // Get triggerer email for filtering CC/BCC
    const triggerer = getTriggererEmail(context, triggererEmail);

    // Filter and validate CC/BCC arrays
    const validCc = filterEmailArray(cc, triggerer);
    const validBcc = filterEmailArray(bcc, triggerer);

    // Build email options
    const emailOptions: EmailOptions = {
      to,
      subject,
      text,
      html: html || text,
      ...(validCc.length > 0 && { cc: validCc }),
      ...(validBcc.length > 0 && { bcc: validBcc }),
      replyTo,
      from: fromEmailResult.email,
    };

    // Send email using configured provider
    const result = await sendEmailWithProvider(mailConfig, emailOptions);

    // Update email history if context with emailHistoryId is provided
    if (context && 'emailHistoryId' in context) {
      await updateEmailHistory(context.emailHistoryId, result);
    }

    return result;
  } catch (error: unknown) {
    logger.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}
