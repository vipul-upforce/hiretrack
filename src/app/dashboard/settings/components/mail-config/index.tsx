'use client';

import { useEffect } from 'react';
import { Form, Formik } from 'formik';
import { Button } from '@/components/ui/button';
import {
  Mail,
  Send,
  Server,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useGetSMTPConfigsQuery,
  useUpdateSMTPConfigsMutation,
} from '@/lib/features/settings';
import { useTestConnection } from '@/hooks/use-test-connection';
import { SectionOption, SectionSwitcher } from '../communication/section-switcher';

import { SMTPFormValues } from './types';
import { DEFAULT_INITIAL_VALUES } from './constants';
import { smtpValidationSchema } from './schema';

import { LoadingState } from './components/loading-skeleton';
import { DynamicInputs } from './components/dynamic-inputs';
import { SmtpPasswordField } from './components/smtp-password-field';
import { ActionFooter } from './components/action-footer';
import { SetupInstructions } from './components/setup-instructions';

const emailSections: SectionOption[] = [
  {
    id: 'smtp',
    title: 'SMTP',
    description: 'Connect your custom SMTP server',
    icon: Server,
    badge: 'SMTP',
  },
  {
    id: 'resend',
    title: 'Resend',
    description: 'Email API with verified domain sending',
    icon: Send,
    badge: 'Resend',
  },
  {
    id: 'brevo',
    title: 'Brevo',
    description: 'Transactional email via Brevo API',
    icon: Mail,
    badge: 'Brevo',
  },
];

export interface SMTPConfigsProps {
  onClose: () => void;
}
export default function SMTPConfigs({ onClose }: SMTPConfigsProps) {
  const { toast } = useToast();
  const {
    testConnection,
    isConnectionSuccessful,
    isTesting,
    resetConnectionStatus,
  } =
    useTestConnection();

  const { data, isLoading, refetch } = useGetSMTPConfigsQuery(undefined);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const [updateSMTPConfigs, { isLoading: isUpdating }] =
    useUpdateSMTPConfigsMutation();

  const initialValues: SMTPFormValues = {
    ...DEFAULT_INITIAL_VALUES,
    ...(data ?? {}),
    mailProvider: data?.mailProvider || 'smtp',
  };

  const handleSubmit = async (values: SMTPFormValues) => {
    try {
      await updateSMTPConfigs(values).unwrap();
      toast({
        title: 'Success',
        description: 'SMTP settings updated successfully',
      });
      refetch();
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update SMTP settings',
        variant: 'destructive',
      });
    }
  };

  const handleTestConnection = async (values: SMTPFormValues) => {
    // Construct credentials based on provider
    let credentials;

    if (values.mailProvider === 'resend') {
      credentials = {
        resend_api_key: values.resend_api_key,
        resend_from: values.resend_from,
        reply_to: values.resend_reply_to,
      };
    } else if (values.mailProvider === 'brevo') {
      credentials = {
        brevo_api_key: values.brevo_api_key,
        brevo_from: values.brevo_from,
        reply_to: values.brevo_reply_to,
      };
    } else {
      credentials = {
        host: values.smtp_host,
        port: values.smtp_port,
        from: values.smtp_from,
        user: values.smtp_user,
        pass: values.smtp_password,
      };
    }

    await testConnection(
      values.mailProvider as 'smtp' | 'resend' | 'brevo',
      credentials,
    );
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={smtpValidationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ values, handleSubmit: handleSubmitFormik, setFieldValue }) => (
        <Form
          onSubmit={handleSubmitFormik}
          className="flex h-full min-h-0 flex-col overflow-hidden"
        >
          <div className="flex-1 min-h-0 space-y-4 overflow-y-auto px-6 py-4">
            <SectionSwitcher
              options={emailSections}
              activeId={values.mailProvider || 'smtp'}
              showBadge={false}
              onChange={(value) => {
                setFieldValue('mailProvider', value);
                resetConnectionStatus();
              }}
            />
            <SetupInstructions provider={values.mailProvider} />
            <DynamicInputs />
            <SmtpPasswordField />

            {values.mailProvider && (
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleTestConnection(values)}
                  disabled={isTesting}
                >
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>
            )}
          </div>

          <ActionFooter
            onClose={onClose}
            isUpdating={isUpdating}
            isConnectionSuccessful={isConnectionSuccessful}
          />
        </Form>
      )}
    </Formik>
  );
}
