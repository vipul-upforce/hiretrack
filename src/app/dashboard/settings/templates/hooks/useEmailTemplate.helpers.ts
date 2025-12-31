import type { EmailTemplate, MailTemplatePayload } from '../types';
import type { defaultTemplates as defaultTemplatesImport } from '../constants';
import { Data } from '../constants';

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

/**
 * Converts Data object from constants.ts to a flat Record<string, string>
 * for variable replacement in templates.
 */
function getPreviewData(): Record<string, string> {
  const previewData: Record<string, string> = {};

  // Convert Data object values to strings
  Object.entries(Data).forEach(([key, value]) => {
    previewData[key] = String(value);
  });

  // Map common variable names to Data values
  previewData.SenderName = Data.orgName;
  previewData.ReceiverName = Data.candidateName;
  previewData.PortalName = Data.orgName;
  previewData.jobTitle = Data.jobName;
  previewData.organizationName = Data.orgName;
  previewData.candidateName = Data.candidateName;
  previewData.candidateEmail = Data.email;
  previewData.candidatePhone = '+1 (555) 123-4567'; // Sample phone number
  previewData.userName = Data.candidateName;
  previewData.resetLink = Data.resetUrl;
  previewData.interviewerName = Data.interviewerName;
  previewData.interviewDate = Data.startDate;
  previewData.interviewType = 'Technical Interview';
  previewData.meetingLink = Data.googleCalendarLink;
  previewData.outlookCalendarLink = Data.outlookCalendarLink;
  previewData.candidateProfileLink = Data.candidateDetailsPage;
  previewData.dashboardLink = Data.candidateDetails;
  previewData.newStatus = Data.status;
  previewData.statusMessage = Data.eventSubTitle;
  previewData.nextSteps =
    'Please prepare for the technical interview and review the job requirements.';
  previewData.hrContactInfo = 'hr@company.com | +1 (555) 987-6543';
  previewData.recipientName = Data.candidateName;
  previewData.reviewerName = Data.remark_adder;
  previewData.remarkDate = Data.applicationDate;
  previewData.rating = Data.rating;
  previewData.remarkText = Data.remark;
  previewData.stepName = 'Technical Interview';
  previewData.completedBy = Data.interviewerName;
  previewData.completionDate = Data.applicationDate;
  previewData.feedback =
    'Candidate showed excellent problem-solving skills and technical knowledge.';
  previewData.nextStep = 'Final Interview with Hiring Manager';
  previewData.otpCode = Data.otp;
  previewData.otp = Data.otp;

  return previewData;
}

/**
 * Extracts all variables from content using regex pattern {{variableName}}
 */
function extractVariablesFromContent(content: string): string[] {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const matches: string[] = [];
  let match = variableRegex.exec(content);

  while (match) {
    const variableName = match[1]?.trim();
    if (variableName) {
      matches.push(variableName);
    }
    match = variableRegex.exec(content);
  }

  return [...new Set(matches)];
}

export function renderTemplatePreview(args: {
  content: string;
  variables: string[];
}): { html: string; missingVariables: string[] } {
  const { content, variables } = args;
  const PREVIEW_DATA = getPreviewData();

  // Extract all variables actually present in the content
  const contentVariables = extractVariablesFromContent(content);

  // Track missing variables (variables in content but not in PREVIEW_DATA)
  const missingVariables: string[] = [];
  const replacementMap = new Map<string, string>();

  // Build replacement map: for each variable found in content, find its replacement value
  for (const contentVar of contentVariables) {
    const trimmedVar = contentVar.trim();
    const variablePattern = `{{${contentVar}}}`; // Keep original pattern with any whitespace

    // Try exact match first
    if (trimmedVar in PREVIEW_DATA) {
      replacementMap.set(variablePattern, PREVIEW_DATA[trimmedVar]);
    } else {
      // Try case-insensitive match
      const matchedKey = Object.keys(PREVIEW_DATA).find(
        (key) => key.toLowerCase() === trimmedVar.toLowerCase(),
      );
      if (matchedKey) {
        replacementMap.set(variablePattern, PREVIEW_DATA[matchedKey]);
      } else if (!missingVariables.includes(trimmedVar)) {
        // Variable not found in preview data
        missingVariables.push(trimmedVar);
      }
    }
  }

  // Also check provided variables list for missing ones (for reporting)
  for (const variable of variables) {
    const trimmedVar = variable.trim();
    if (
      !contentVariables.some(
        (v) => v.trim().toLowerCase() === trimmedVar.toLowerCase(),
      ) &&
      !(trimmedVar in PREVIEW_DATA)
    ) {
      // Check case-insensitive
      const matchedKey = Object.keys(PREVIEW_DATA).find(
        (key) => key.toLowerCase() === trimmedVar.toLowerCase(),
      );
      if (!matchedKey && !missingVariables.includes(trimmedVar)) {
        missingVariables.push(trimmedVar);
      }
    }
  }

  let previewContent = content;

  // Replace variables in order of length (longest first) to avoid partial replacements
  // This ensures that longer variable names are replaced before shorter ones
  const sortedReplacements = Array.from(replacementMap.entries()).sort(
    (a, b) => b[0].length - a[0].length,
  );

  // Apply all replacements
  for (const [variablePattern, replacementValue] of sortedReplacements) {
    previewContent = previewContent
      .split(variablePattern)
      .join(replacementValue);
  }

  // Also replace any variables from PREVIEW_DATA that might be in content
  // but weren't extracted (handles edge cases)
  // Sort by key length (longest first) to avoid partial matches
  const sortedPreviewEntries = Object.entries(PREVIEW_DATA).sort(
    (a, b) => b[0].length - a[0].length,
  );

  for (const [key, value] of sortedPreviewEntries) {
    const variablePattern = `{{${key}}}`;
    // Only replace if the pattern still exists (wasn't already replaced)
    if (previewContent.includes(variablePattern)) {
      previewContent = previewContent.split(variablePattern).join(value);
    }
  }

  return {
    html: previewContent,
    missingVariables: [...new Set(missingVariables)],
  };
}
