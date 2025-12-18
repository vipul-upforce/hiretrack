import { createTransport, TransportOptions } from 'nodemailer';
import type { Ismtp } from '@/lib/models/settings';
import logger from '../../logger';
import type { EmailOptions, EmailResult } from '../types';

/**
 * Validates SMTP configuration
 */
function validateSMTPConfig(config: Ismtp): string | null {
  if (
    !config.smtp_host ||
    !config.smtp_port ||
    !config.smtp_user ||
    !config.smtp_password
  ) {
    return 'SMTP configuration incomplete';
  }
  return null;
}

/**
 * Sends email via SMTP
 */
export async function sendSMTPMail(
  config: Ismtp,
  options: EmailOptions,
): Promise<EmailResult> {
  try {
    const validationError = validateSMTPConfig(config);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const transporter = createTransport({
      host: config.smtp_host,
      port: parseInt(config.smtp_port, 10),
      secure: parseInt(config.smtp_port, 10) === 465,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_password,
      },
    } as TransportOptions);

    const mailOptions = {
      from: options.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      ...(options.cc &&
        options.cc.length > 0 && {
          cc: options.cc.join(', '),
        }),
      ...(options.bcc &&
        options.bcc.length > 0 && {
          bcc: options.bcc.join(', '),
        }),
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error: unknown) {
    logger.error('SMTP error:', error);
    return {
      success: false,
      error: `SMTP error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
