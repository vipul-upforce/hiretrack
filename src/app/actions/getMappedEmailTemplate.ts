import { defaultTemplates } from '@/lib/constants';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { loadTemplate, MapTemplate } from '@/lib/templateLoader';

export async function getMappedEmailTemplate(
  templateKey: string,
  variables: Record<string, any>,
  organizationId: string,
): Promise<{ emailContent: string; emailSubject: string }> {
  await connectToDatabase();

  const settings = await Settings?.findOne({ organizationId }).select('emailTemplates').lean().exec();

  if (!settings || !settings.emailTemplates) {
    return {
      emailContent: loadTemplate(templateKey, variables),
      emailSubject: defaultTemplates[templateKey]?.subject,
    }; // If null then return the static HTML
  }

  // Convert Map to Object
  const emailTemplates = settings.emailTemplates instanceof Map
    ? Object.fromEntries(settings.emailTemplates)
    : settings.emailTemplates;

  const template = emailTemplates[templateKey];

  // Fallback logic
  const useDefaultHtml = !template || !template.html?.trim();
  const useDefaultSubject = !template || !template.subject?.trim();
  const emailContent = useDefaultHtml
    ? loadTemplate(templateKey, variables)
    : MapTemplate(template.html, variables);

  const rawSubject = useDefaultSubject
    ? defaultTemplates.find((template) => template.id === templateKey)?.subject
    : template.subject;

  const emailSubject = MapTemplate(rawSubject, variables);

  return { emailContent, emailSubject };
}
