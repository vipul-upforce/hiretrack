/**
 * @fileoverview Legacy email sending function for backward compatibility.
 * @deprecated This file maintains backward compatibility for the legacy sendMail API.
 * New code should use '@/lib/notifications/email/emailService' or '@/lib/services/unifiedEmailService' instead.
 *
 * This file has been refactored to use the modern email service implementation
 * while maintaining the original function signature for backward compatibility.
 */

import { logger } from '@/lib/logger/logger.server';
import { ISettings } from '@/lib/models/settings';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { sendMail as sendMailModern } from '@/lib/notifications/email/emailService';
import type { Ismtp } from '@/lib/models/settings';

/**
 * Legacy email sending function (backward compatibility wrapper)
 *
 * @deprecated Use '@/lib/notifications/email/emailService' or '@/lib/services/unifiedEmailService' instead
 *
 * This function wraps the modern email service to maintain backward compatibility
 * with the legacy API signature.
 *
 * @param orgID - Organization ID
 * @param email - Array of recipient email addresses (first is primary, rest become BCC)
 * @param eventTitle - Email subject
 * @param htmlContent - Email HTML content
 * @param bcc - Additional BCC recipients (optional)
 * @param triggererEmail - Email to filter out from recipients (optional)
 * @returns Promise with status and message
 */
export const sendMail = async (
  orgID: string,
  email: string[],
  eventTitle: string,
  htmlContent: string,
  bcc?: string[],
  triggererEmail?: string,
): Promise<{ status: number; message: string }> => {
  try {
    await connectToDatabase();
    if (!Settings) {
      return { status: 404, message: 'Database not connected' };
    }

    const settingInfo = (await Settings?.find({
      organizationId: orgID,
    })) as ISettings[];

    // Check if settingInfo is not empty
    if (!settingInfo || settingInfo.length === 0) {
      return { status: 404, message: 'Database not connected' };
    }

    // Access the first document in the array
    const settings: ISettings = settingInfo[0];
    const { mailConfig } = settings;

    // Check if mailConfig is defined and has the required properties
    if (!mailConfig || !mailConfig.mailProvider) {
      return {
        status: 400,
        message: 'SMTP configuration is missing or invalid',
      };
    }

    // Process email array: first email is primary recipient, rest become BCC
    let mailTo = email;
    let filteredBcc = bcc || [];

    if (email[0]) {
      mailTo = [email[0]];
      if (email.length > 1) {
        filteredBcc = [...filteredBcc, ...email.slice(1)];
      }
    }

    // Filter out the triggerer's email if provided
    if (triggererEmail) {
      mailTo = mailTo.filter((mailId) => mailId && mailId !== triggererEmail);
      filteredBcc = filteredBcc.filter(
        (mailId) => mailId && mailId !== triggererEmail,
      );
    } else {
      // Just filter out empty emails if no triggerer email provided
      mailTo = mailTo.filter((mailId) => !!mailId);
      filteredBcc = filteredBcc.filter((mailId) => !!mailId);
    }

    // Validate we have at least one recipient
    if (mailTo.length === 0) {
      return { status: 400, message: 'No valid recipients found' };
    }

    // Use modern email service
    const result = await sendMailModern(
      mailConfig as Ismtp,
      mailTo[0], // Primary recipient
      eventTitle, // Subject
      undefined, // text (not provided in legacy API)
      htmlContent, // html
      undefined, // cc (not provided in legacy API)
      filteredBcc.length > 0 ? filteredBcc : undefined, // bcc
      undefined, // replyTo (not provided in legacy API)
      undefined, // from (uses default from mailConfig)
      undefined, // context (no email history tracking in legacy API)
      triggererEmail, // triggererEmail
    );

    // Convert modern EmailResult to legacy format
    if (result.success) {
      return {
        status: 200,
        message: result.messageId
          ? `Email sent successfully (ID: ${result.messageId})`
          : 'Email sent successfully',
      };
    }

    // Handle error result
    return {
      status: 500,
      message: result.error || 'Failed to send email',
    };
  } catch (err: unknown) {
    logger.error({ error: err, orgID }, 'Legacy sendMail error');
    return {
      status: 500,
      message: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
};
