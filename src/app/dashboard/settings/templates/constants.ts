import type { IEmailTemplate } from '../components/types';
import { defaultTemplates } from './defaultVariables/defaultTemplates';
import { sampleCustomTemplates } from './defaultVariables/sampleCustomTemplates';

export const templateVariables = [
  'SenderName',
  'ReceiverName',
  'PortalName',
  'jobTitle',
] as const;

export { defaultTemplates, sampleCustomTemplates };

export const Data = {
  orgName: 'Acme Inc',
  candidateName: 'John Doe',
  jobName: 'Senior Developer',
  email: 'john.doe@example.com',
  status: 'Applied',
  applicationDate: '2024-01-15',
  hrNotificationTitle: 'New Job Application Received',
  candidateDetails: 'https://example.com/candidate/123',
  resetUrl: 'https://example.com/reset?token=abc123',
  eventTitle: 'Interview Scheduled',
  interviewerName: 'Jane Smith',
  startDate: '2024-01-20 10:00 AM',
  candidateDetailsPage: 'https://example.com/candidate/123',
  googleCalendarLink:
    'https://calendar.google.com/calendar/render?action=TEMPLATE',
  outlookCalendarLink: 'https://outlook.live.com/calendar/0/deeplink/compose',
  eventSubTitle: 'Status has been updated for this candidate',
  actionBy: 'HR Manager',
  remark: 'Great technical skills, good communication',
  rating: '4.5/5',
  remark_for: 'John Doe',
  remark_adder: 'Technical Lead',
  unassigner: 'HR Manager',
  candidate_name: 'John Doe',
  otp: '234533',
} as const;

export const editorOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: 'on' as const,
  roundedSelection: false,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: 'on' as const,
  formatOnPaste: true,
  formatOnType: true,
} as const;

/**
 * Convert array format to object format for `edit-mail-dialog.tsx`.
 * Maps `EmailTemplate[]` to `{ [templateId]: IEmailTemplate }`.
 */
export const defaultTemplatesAsObject: Record<string, IEmailTemplate> =
  defaultTemplates.reduce(
    (acc, template) => {
      acc[template.id] = {
        templateId: template.id,
        templateName: template.name,
        subject: template.subject,
        html: template.content,
        variables: template.variables,
      };

      return acc;
    },
    {} as Record<string, IEmailTemplate>,
  );
