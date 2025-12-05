import { FormFieldConfig, MailProviderOption, SMTPFormValues } from './types';

export const MAIL_PROVIDERS: MailProviderOption[] = [
  { key: '', label: 'Select Mail Providers' },
  { key: 'smtp', label: 'SMTP' },
  { key: 'resend', label: 'Resend' },
  { key: 'brevo', label: 'Brevo' },
];

export const DEFAULT_INITIAL_VALUES: SMTPFormValues = {
  mailProvider: '',
  smtp_user: '',
  smtp_password: '',
  smtp_host: '',
  smtp_port: '',
  smtp_from: '',
  resend_api_key: '',
  resend_from: '',
  resend_reply_to: '',
  brevo_api_key: '',
  brevo_from: '',
  brevo_reply_to: '',
};

export const FORM_FIELDS: FormFieldConfig[] = [
  {
    label: 'SMTP Host',
    name: 'smtp_host',
    placeholder: 'e.g., smtp.gmail.com',
    condition: 'smtp',
  },
  {
    label: 'SMTP Port',
    name: 'smtp_port',
    placeholder: 'e.g., 587',
    condition: 'smtp',
  },
  {
    label: 'SMTP User',
    name: 'smtp_user',
    placeholder: 'Email address',
    condition: 'smtp',
  },
  {
    label: 'Displayed Sender Email',
    name: 'smtp_from',
    placeholder: 'Sender email for recipients',
    condition: 'smtp',
  },
  {
    label: 'API Key',
    name: 'resend_api_key',
    placeholder: 'Resend API Key',
    condition: 'resend',
  },
  {
    label: 'From',
    name: 'resend_from',
    placeholder: 'Resend From Email',
    condition: 'resend',
  },
  {
    label: 'Reply To',
    name: 'resend_reply_to',
    placeholder: 'Resend Reply To Email',
    condition: 'resend',
  },
  {
    label: 'API Key',
    name: 'brevo_api_key',
    placeholder: 'Brevo API Key',
    condition: 'brevo',
  },
  {
    label: 'From',
    name: 'brevo_from',
    placeholder: 'Brevo From Email',
    condition: 'brevo',
  },
  {
    label: 'Reply To',
    name: 'brevo_reply_to',
    placeholder: 'Brevo Reply To Email',
    condition: 'brevo',
  },
];
