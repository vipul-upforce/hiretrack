import mongoose from 'mongoose';
import { Settings } from '@/lib/mongodb';

/**
 * Mail settings result
 */
export interface MailSettings {
  mailConfig: {
    mailProvider?: string;
    resend_from?: string;
    brevo_from?: string;
    smtp_from?: string;
  };
}

/**
 * Extended mail settings with timezone
 */
export interface ExtendedMailSettings extends MailSettings {
  timeZone?: {
    offset?: string;
    name?: string;
  };
}

/**
 * Get mail settings for an organization
 */
export async function getMailSettings(
  organizationId: string,
): Promise<MailSettings | null> {
  const settings = await Settings?.findOne({
    organizationId: new mongoose.Types.ObjectId(organizationId),
  })
    .select('mailConfig')
    .lean()
    .exec();

  return settings as MailSettings | null;
}

/**
 * Get extended mail settings (including timezone) for an organization
 */
export async function getExtendedMailSettings(
  organizationId: string,
): Promise<ExtendedMailSettings | null> {
  const settings = await Settings?.findOne({
    organizationId: new mongoose.Types.ObjectId(organizationId),
  })
    .select('mailConfig timeZone.offset timeZone.name')
    .lean()
    .exec();

  return settings as ExtendedMailSettings | null;
}

/**
 * Get from email and provider from organization settings (optimized - single query)
 */
export async function getFromEmailAndProvider(
  organizationId: string,
): Promise<{ fromEmail: string; provider: string }> {
  const settings = await getMailSettings(organizationId);

  const fromEmail =
    settings?.mailConfig?.resend_from ||
    settings?.mailConfig?.brevo_from ||
    settings?.mailConfig?.smtp_from ||
    'system@hiretrack.com';

  const provider = settings?.mailConfig?.mailProvider || 'unknown';

  return { fromEmail, provider };
}

/**
 * Get from email address from organization settings
 */
export async function getFromEmail(
  organizationId: string,
): Promise<string> {
  const settings = await getMailSettings(organizationId);

  return (
    settings?.mailConfig?.resend_from ||
    settings?.mailConfig?.brevo_from ||
    settings?.mailConfig?.smtp_from ||
    'system@hiretrack.com'
  );
}

/**
 * Get mail provider from organization settings
 */
export async function getMailProvider(
  organizationId: string,
): Promise<string> {
  const settings = await getMailSettings(organizationId);

  return settings?.mailConfig?.mailProvider || 'unknown';
}
