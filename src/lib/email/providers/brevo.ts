import type { Ismtp } from '@/lib/models/settings';
import logger from '@/lib/logger';
import type { EmailOptions, EmailResult } from '../types';

/**
 * Brevo email recipient type
 */
interface BrevoRecipient {
  email: string;
}

/**
 * Brevo email payload type
 */
interface BrevoEmailPayload {
  sender: {
    email: string;
  };
  to: BrevoRecipient[];
  subject: string;
  textContent?: string;
  htmlContent?: string;
  replyTo: {
    email: string;
  };
  cc?: BrevoRecipient[];
  bcc?: BrevoRecipient[];
}

/**
 * Brevo API error response type
 */
interface BrevoErrorResponse {
  message?: string;
  error?: string;
}

/**
 * Validates Brevo configuration
 */
function validateBrevoConfig(config: Ismtp): string | null {
  if (!config.brevo_api_key) {
    return 'Brevo API key not configured';
  }
  return null;
}

/**
 * Extracts error message from Brevo error response
 */
function extractBrevoErrorMessage(errorData: unknown): string {
  if (typeof errorData === 'object' && errorData !== null) {
    const brevoError = errorData as BrevoErrorResponse;
    return brevoError.message || brevoError.error || 'Unknown error';
  }
  if (errorData instanceof Error) {
    return errorData.message;
  }
  return 'Unknown error';
}

/**
 * Sends email via Brevo API
 */
export async function sendBrevoMail(
  config: Ismtp,
  options: EmailOptions,
): Promise<EmailResult> {
  try {
    const validationError = validateBrevoConfig(config);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const emailPayload: BrevoEmailPayload = {
      sender: {
        email: options.from || '',
      },
      to: [{ email: options.to }],
      subject: options.subject,
      textContent: options.text,
      htmlContent: options.html,
      replyTo: {
        email: options.replyTo || config.brevo_reply_to || '',
      },
    };

    // Only include CC/BCC if they have values
    if (options.cc && options.cc.length > 0) {
      emailPayload.cc = options.cc.map((email) => ({ email }));
    }
    if (options.bcc && options.bcc.length > 0) {
      emailPayload.bcc = options.bcc.map((email) => ({ email }));
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': config.brevo_api_key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error('Brevo API error:', errorData);
      return {
        success: false,
        error: `Brevo error: ${extractBrevoErrorMessage(errorData)}`,
      };
    }

    const result = await response.json();
    return { success: true, messageId: result.messageId };
  } catch (error: unknown) {
    logger.error('Brevo unexpected error:', error);
    return {
      success: false,
      error: `Brevo error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
