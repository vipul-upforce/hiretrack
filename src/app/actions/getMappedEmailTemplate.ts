import { defaultTemplates } from "@/lib/constants";
import dbConnect, { Settings } from "@/lib/mongodb";
import { loadTemplate, MapTemplate } from "@/lib/templateLoader";

export async function getMappedEmailTemplate(
  templateKey: string,
  variables: Record<string, any>,
  organizationId: string
): Promise<{ emailContent: string; emailSubject: string }> {
  await dbConnect();

  const settings = await Settings?.findOne({ organizationId });

  if (!settings || !settings.emailTemplates) {
    return {
      emailContent: loadTemplate(templateKey, variables),
      emailSubject: defaultTemplates[templateKey]?.subject,
    }; //If null then return the static HTML
  }

  // Convert Map to Object
  const emailTemplates =
    settings.emailTemplates instanceof Map
      ? Object.fromEntries(settings.emailTemplates)
      : settings.emailTemplates;

  const template = emailTemplates[templateKey];

  // Fallback logic
  const useDefaultHtml = !template || !template.html?.trim();
  const useDefaultSubject = !template || !template.subject?.trim();

  const emailContent = useDefaultHtml
    ? loadTemplate(templateKey, variables)
    : MapTemplate(template.html, variables);

  const emailSubject = useDefaultSubject
    ? defaultTemplates[templateKey]?.subject
    : MapTemplate(template.subject, variables);

  if (templateKey === "2fa-otp") {
    const emailContent = loadTemplate(templateKey, variables);
    const emailSubject = "Your One-Time Password";
    return { emailContent, emailSubject };
  }

  return { emailContent, emailSubject };
}
