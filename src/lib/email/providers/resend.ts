import { Resend } from 'resend';
import type { Ismtp } from '@/lib/models/settings';
import logger from '../../logger';
import type { EmailOptions, EmailResult } from '../types';

/**
 * Validates Resend configuration
 */
function validateResendConfig(config: Ismtp): string | null {
  if (!config.resend_api_key) {
    return 'Resend API key not configured';
  }
  return null;
}

/**
 * Sends email via Resend API
 */
export async function sendResendMail(
  config: Ismtp,
  options: EmailOptions,
): Promise<EmailResult> {
  try {
    const validationError = validateResendConfig(config);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const resend = new Resend(config.resend_api_key);

    // Ensure at least text or html is provided (Resend requirement)
    const hasContent = options.text || options.html;
    if (!hasContent) {
      return {
        success: false,
        error: 'Email must have either text or html content',
      };
    }

    const emailPayload = {
      from: options.from || '',
      to: options.to,
      subject: options.subject,
      ...(options.text && { text: options.text }),
      ...(options.html && { html: options.html }),
      ...(options.replyTo || config.resend_reply_to
        ? { replyTo: options.replyTo || config.resend_reply_to }
        : {}),
      ...(options.cc && options.cc.length > 0 && { cc: options.cc }),
      ...(options.bcc && options.bcc.length > 0 && { bcc: options.bcc }),
    };

    // Type assertion needed due to Resend's complex union types
    // Extract the parameter type from Resend's send method
    type ResendEmailParams = Parameters<typeof resend.emails.send>[0];
    const result = await resend.emails.send(
      emailPayload as unknown as ResendEmailParams,
    );

    if (result.error) {
      logger.error('Resend API error:', result.error);
      return {
        success: false,
        error: `Resend error: ${result.error.message}`,
      };
    }

    return { success: true, messageId: result.data?.id };
  } catch (error: unknown) {
    logger.error('Resend unexpected error:', error);
    return {
      success: false,
      error: `Resend error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
