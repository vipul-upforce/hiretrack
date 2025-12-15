'use client';

import { useEffect } from 'react';
import { Form, Formik } from 'formik';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  useGetSMTPConfigsQuery,
  useUpdateSMTPConfigsMutation,
} from '@/lib/features/settings/settingsApi';
import { useTestConnection } from '@/hooks/use-test-connection';

import { SMTPFormValues } from './types';
import { DEFAULT_INITIAL_VALUES } from './constants';
import { smtpValidationSchema } from './schema';

import { LoadingState } from './components/loading-skeleton';
import { ProviderSelect } from './components/provider-select';
import { DynamicInputs } from './components/dynamic-inputs';
import { SmtpPasswordField } from './components/smtp-password-field';
import { ActionFooter } from './components/action-footer';

export default function SMTPConfigs({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const { testConnection, isConnectionSuccessful, isTesting } = useTestConnection();

  const { data, isLoading, refetch } = useGetSMTPConfigsQuery(undefined);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const [updateSMTPConfigs, { isLoading: isUpdating }] = useUpdateSMTPConfigsMutation();

  const initialValues: SMTPFormValues = data ?? DEFAULT_INITIAL_VALUES;

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

    await testConnection(values.mailProvider as any, credentials);
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
      {({ values, handleSubmit }) => (
        <Form onSubmit={handleSubmit} className="flex flex-col h-auto ">
          <div className="px-6 py-4 space-y-4">
            <ProviderSelect />
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
