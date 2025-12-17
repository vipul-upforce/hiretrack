import type { EmailTemplate, MailTemplatePayload } from '../types';
import type { defaultTemplates as defaultTemplatesImport } from '../constants';

export type MailTemplateApiItem = {
  templateId: string;
  templateName: string;
  subject: string;
  html: string;
  variables?: string[];
};

export type MailTemplatesResponse = {
  templates?: Record<string, MailTemplateApiItem>;
};

type DefaultTemplate = (typeof defaultTemplatesImport)[number];

export function buildMailTemplatePayload(
  templates: EmailTemplate[],
): MailTemplatePayload {
  return templates.reduce<MailTemplatePayload>((acc, template) => {
    acc[template.id] = {
      templateId: template.id,
      templateName: template.name,
      subject: template.subject,
      html: template.content,
      variables: template.variables,
    };
    return acc;
  }, {});
}

export function mergeTemplatesFromApi(args: {
  templateData: MailTemplatesResponse | undefined;
  defaultTemplates: readonly DefaultTemplate[];
  fallbackVariables: readonly string[];
}): EmailTemplate[] {
  const { templateData, defaultTemplates, fallbackVariables } = args;

  const apiTemplates = templateData?.templates;
  if (!apiTemplates || Object.keys(apiTemplates).length === 0) {
    return [...defaultTemplates];
  }

  const defaultTemplateIds = new Set(defaultTemplates.map((t) => t.id));

  const loadedTemplates: EmailTemplate[] = Object.values(apiTemplates).map(
    (template) => {
      const isDefault = defaultTemplateIds.has(template.templateId);
      const defaultVars = defaultTemplates.find(
        (t) => t.id === template.templateId,
      )?.variables;

      return {
        id: template.templateId,
        name: template.templateName,
        subject: template.subject,
        content: template.html,
        variables: template.variables ?? defaultVars ?? [...fallbackVariables],
        isCustom: !isDefault,
        isDefault,
      };
    },
  );

  const templateMap = new Map<string, EmailTemplate>();
  for (const template of defaultTemplates)
    templateMap.set(template.id, template);
  for (const template of loadedTemplates)
    templateMap.set(template.id, template);

  return Array.from(templateMap.values());
}

const PREVIEW_SAMPLE_DATA: Record<string, string> = {
  // New simplified variables
  SenderName: 'Jane Smith (HR Manager)',
  ReceiverName: 'John Doe',
  PortalName: 'Acme Corporation',

  // Keep existing variables for backward compatibility with default templates
  organizationName: 'Acme Corporation',
  candidateName: 'John Doe',
  candidateEmail: 'john.doe@email.com',
  candidatePhone: '+1 (555) 123-4567',
  jobTitle: 'Senior Frontend Developer',
  applicationDate: 'January 15, 2024',
  dashboardLink: 'https://app.company.com/dashboard',
  userName: 'John Doe',
  resetLink: 'https://app.company.com/reset-password?token=abc123',
  interviewerName: 'Jane Smith',
  interviewDate: 'January 22, 2024',
  interviewTime: '2:00 PM',
  duration: '45 minutes',
  interviewType: 'Technical Interview',
  meetingLink: 'https://meet.company.com/interview-123',
  candidateProfileLink: 'https://app.company.com/candidates/123',
  newStatus: 'Interview Scheduled',
  statusMessage: 'Your interview has been scheduled for next week.',
  nextSteps:
    'Please prepare for the technical interview and review the job requirements.',
  hrContactInfo: 'hr@company.com | +1 (555) 987-6543',
  recipientName: 'Jane Smith',
  reviewerName: 'Mike Johnson',
  remarkDate: 'January 20, 2024',
  rating: '4',
  remarkText:
    'Strong technical skills demonstrated during the initial screening. Good communication abilities.',
  stepName: 'Technical Interview',
  completedBy: 'Jane Smith',
  completionDate: 'January 20, 2024',
  feedback:
    'Candidate showed excellent problem-solving skills and technical knowledge.',
  nextStep: 'Final Interview with Hiring Manager',
  otpCode: '123456',
  expirationTime: '15',
};

export function renderTemplatePreview(args: {
  content: string;
  variables: string[];
}): { html: string; missingVariables: string[] } {
  const { content, variables } = args;

  const missingVariables = variables.filter(
    (variable) => !(variable in PREVIEW_SAMPLE_DATA),
  );

  let previewContent = content;
  for (const [key, value] of Object.entries(PREVIEW_SAMPLE_DATA)) {
    previewContent = previewContent.split(`{{${key}}}`).join(value);
  }

  return { html: previewContent, missingVariables };
}
