export interface SMTPFormValues {
  mailProvider: string;
  smtp_host?: string;
  smtp_port?: string;
  smtp_user?: string;
  smtp_password?: string;
  smtp_from?: string;
  resend_api_key?: string;
  resend_from?: string;
  resend_reply_to?: string;
  brevo_api_key?: string;
  brevo_from?: string;
  brevo_reply_to?: string;
  [key: string]: string | undefined; // Index signature
}

export interface MailProviderOption {
  key: string;
  label: string;
}

export interface FormFieldConfig {
  label: string;
  name: Extract<keyof SMTPFormValues, string>;
  placeholder: string;
  condition: string;
}

export interface MailProvider {
  smtp: string;
  resend: string;
  brevo: string;
}
export type MailProviderType = keyof MailProvider;
