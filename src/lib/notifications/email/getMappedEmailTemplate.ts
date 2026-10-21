import { defaultTemplates } from '@/lib/email-templates/constants';
import type { IEmailTemplate } from '@/app/dashboard/settings/components/types';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { loadTemplate, MapTemplate } from '@/lib/templateLoader';

/**
 * Retrieves and maps an email template with variables replaced.
 * Falls back to default templates if custom templates are not available.
 *
 * @param templateKey - The unique identifier for the email template
 * @param variables - Key-value pairs for template variable substitution (all values must be strings)
 * @param organizationId - The organization ID to fetch custom templates for
 * @returns Promise resolving to email content and subject with variables mapped
 */
export async function getMappedEmailTemplate(
  templateKey: string,
  variables: Record<string, string>,
  organizationId: string,
): Promise<{ emailContent: string; emailSubject: string }> {
  await connectToDatabase();

  const settings = await Settings?.findOne({ organizationId })
    .select('emailTemplates')
    .lean()
    .exec();

  if (!settings || !settings.emailTemplates) {
    const defaultTemplate = defaultTemplates.find(
      (template) => template.id === templateKey,
    );

    return {
      emailContent: await loadTemplate(templateKey, variables),
      emailSubject: defaultTemplate?.subject ?? '',
    };
  }

  // Convert Map to Object for consistent access
  const emailTemplates: Record<string, IEmailTemplate> =
    settings.emailTemplates instanceof Map
      ? Object.fromEntries(settings.emailTemplates)
      : (settings.emailTemplates as Record<string, IEmailTemplate>);

  const customTemplate = emailTemplates[templateKey];

  // Fallback logic: use default if custom template is missing or empty
  const useDefaultHtml = !customTemplate || !customTemplate.html?.trim();
  const useDefaultSubject = !customTemplate || !customTemplate.subject?.trim();

  const emailContent = useDefaultHtml
    ? await loadTemplate(templateKey, variables)
    : MapTemplate(customTemplate.html, variables);

  const defaultTemplate = defaultTemplates.find(
    (defaultTpl) => defaultTpl.id === templateKey,
  );

  const rawSubject = useDefaultSubject
    ? (defaultTemplate?.subject ?? '')
    : customTemplate.subject;

  const emailSubject = MapTemplate(rawSubject, variables);

  return { emailContent, emailSubject };
}
