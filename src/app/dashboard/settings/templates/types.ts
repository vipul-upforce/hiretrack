export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
  isDefault?: boolean;
  isCustom?: boolean;
}

export interface MailTemplatePayload {
  [key: string]: {
    templateId: string;
    templateName: string;
    subject: string;
    html: string;
    variables: string[];
  };
}

export interface SampleCustomTemplate {
  name: string;
  subject: string;
  content: string;
}
