import * as Yup from 'yup';
import { MAIL_PROVIDERS } from './constants';

export const smtpValidationSchema = Yup.object({
  mailProvider: Yup.string()
    .oneOf(
      MAIL_PROVIDERS.map((option) => option.key),
      'Invalid email service provider',
    )
    .required('Email service provider is required'),

  smtp_host: Yup.string()
    .trim()
    .when('mailProvider', {
      is: (mailProvider: unknown) => mailProvider === 'smtp',
      then: (schema) => schema.required('SMTP Host is required'),
      otherwise: (schema) => schema.notRequired(),
    }),

  smtp_port: Yup.string()
    .trim()
    .when('mailProvider', {
      is: (mailProvider: unknown) => mailProvider === 'smtp',
      then: (schema) => schema.required('SMTP Port is required'),
      otherwise: (schema) => schema.notRequired(),
    }),

  smtp_user: Yup.string()
    .trim()
    .when('mailProvider', {
      is: (mailProvider: unknown) => mailProvider === 'smtp',
      then: (schema) => schema.email('Must be a valid email').required('SMTP User is required'),
      otherwise: (schema) => schema.notRequired(),
    }),

  smtp_password: Yup.string()
    .trim()
    .when('mailProvider', {
      is: (mailProvider: unknown) => mailProvider === 'smtp',
      then: (schema) => schema.required('SMTP Password is required'),
      otherwise: (schema) => schema.notRequired(),
    }),

  smtp_from: Yup.string()
    .trim()
    .when('mailProvider', {
      is: (mailProvider: unknown) => mailProvider === 'smtp',
      then: (schema) => schema.email('Must be a valid email').required('SMTP From is required'),
      otherwise: (schema) => schema.notRequired(),
    }),

  resend_api_key: Yup.string()
    .trim()
    .when('mailProvider', {
      is: (mailProvider: unknown) => mailProvider === 'resend',
      then: (schema) => schema.required('Resend API Key is required'),
      otherwise: (schema) => schema.notRequired(),
    }),

  resend_from: Yup.string()
    .trim()
    .when('mailProvider', {
      is: (mailProvider: unknown) => mailProvider === 'resend',
      then: (schema) => schema
        .email('Must be a valid email')
        .required('Resend From is required'),
      otherwise: (schema) => schema.notRequired(),
    }),

  resend_reply_to: Yup.string()
    .trim()
    .when('mailProvider', {
      is: (mailProvider: unknown) => mailProvider === 'resend',
      then: (schema) => schema
        .email('Must be a valid email')
        .required('Resend Reply To is required'),
      otherwise: (schema) => schema.notRequired(),
    }),
  brevo_api_key: Yup.string()
    .trim()
    .when('mailProvider', {
      is: (mailProvider: unknown) => mailProvider === 'brevo',
      then: (schema) => schema.required('Brevo API Key is required'),
      otherwise: (schema) => schema.notRequired(),
    }),

  brevo_from: Yup.string()
    .trim()
    .when('mailProvider', {
      is: (mailProvider: unknown) => mailProvider === 'brevo',
      then: (schema) => schema
        .email('Must be a valid email')
        .required('Brevo From is required'),
      otherwise: (schema) => schema.notRequired(),
    }),

  brevo_reply_to: Yup.string()
    .trim()
    .when('mailProvider', {
      is: (mailProvider: unknown) => mailProvider === 'brevo',
      then: (schema) => schema
        .email('Must be a valid email')
        .required('Brevo Reply To is required'),
      otherwise: (schema) => schema.notRequired(),
    }),
});
