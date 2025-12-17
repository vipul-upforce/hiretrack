'use client';

import { useCallback, useMemo, useState } from 'react';
import { Formik } from 'formik';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { useToast } from '@/hooks/use-toast';
import {
  useGetMailTemplatesQuery,
  useUpdateMailTemplatesMutation,
} from '@/lib/features/settings/settingsApi';
import type { IEmailTemplatesConfig } from '@/app/dashboard/settings/components/types';
import {
  Data as previewData,
  defaultTemplatesAsObject as defaultTemplates,
  editorOptions,
} from '@/app/dashboard/settings/templates/constants';
import { useTemplateVariableAnalysis } from './useTemplateVariableAnalysis';
import { useTemplateVariableInsertion } from './useTemplateVariableInsertion';
import { mergeTemplatesWithDefaults } from './utils';
import { EmailTemplateEditorForm } from './EmailTemplateEditorForm';

export interface EmailTemplateEditorProps {
  onClose: () => void;
}

export function EmailTemplateEditor({ onClose }: EmailTemplateEditorProps) {
  const { toast } = useToast();
  const { theme } = useTheme();

  const [selectedTemplate, setSelectedTemplate] =
    useState<string>('job-application-hr');
  const [isDemoEnabled, setIsDemoEnabled] = useState(false);

  const { data, isLoading, isFetching, error, refetch } =
    useGetMailTemplatesQuery(undefined);

  const [updateEmailTemplates, { isLoading: isUpdating }] =
    useUpdateMailTemplatesMutation();

  const templates = useMemo(
    () =>
      mergeTemplatesWithDefaults({
        defaults: defaultTemplates,
        existing:
          (data as Partial<IEmailTemplatesConfig> | undefined) ?? undefined,
      }),
    [data],
  );

  const initialValues: IEmailTemplatesConfig = useMemo(
    () => ({ templates }),
    [templates],
  );

  const selectedDefault = useMemo(() => {
    // Guard dynamic key access to avoid object-injection lint warnings.
    if (
      !Object.prototype.hasOwnProperty.call(defaultTemplates, selectedTemplate)
    ) {
      return undefined;
    }
    // eslint-disable-next-line security/detect-object-injection -- key is validated via hasOwnProperty and comes from a controlled Select list
    return defaultTemplates[selectedTemplate as keyof typeof defaultTemplates];
  }, [selectedTemplate]);
  const currentTemplate = useMemo(() => {
    if (!Object.prototype.hasOwnProperty.call(templates, selectedTemplate)) {
      return undefined;
    }
    // eslint-disable-next-line security/detect-object-injection -- key is validated via hasOwnProperty and comes from a controlled Select list
    return templates[selectedTemplate as keyof typeof templates];
  }, [selectedTemplate, templates]);

  const variableAnalysis = useTemplateVariableAnalysis({
    template: currentTemplate,
    availableVariables: selectedDefault?.variables ?? [],
  });

  const insertion = useTemplateVariableInsertion({
    selectedTemplate,
    onToastError: (message) =>
      toast({ title: 'Error', description: message, variant: 'destructive' }),
  });

  const handleSubmit = useCallback(
    async (values: IEmailTemplatesConfig) => {
      try {
        await updateEmailTemplates(values).unwrap();
        toast({
          title: 'Success',
          description: 'Email templates updated successfully',
        });
        refetch();
        onClose();
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to update email templates',
          variant: 'destructive',
        });
      }
    },
    [onClose, refetch, toast, updateEmailTemplates],
  );

  const handleTogglePreview = useCallback(() => {
    setIsDemoEnabled((prev) => !prev);
  }, []);

  const resetTemplateToDefault = useCallback(
    (args: {
      setFieldValue: (field: string, value: unknown) => void;
      values: IEmailTemplatesConfig;
    }) => {
      const defaultTemplate = selectedDefault;
      if (!defaultTemplate) return;

      const updatedTemplates: IEmailTemplatesConfig['templates'] = {
        ...args.values.templates,
        [selectedTemplate]: { ...defaultTemplate },
      };

      args.setFieldValue('templates', updatedTemplates);
    },
    [selectedDefault, selectedTemplate],
  );

  if (isLoading) {
    return <div className="px-6 py-4">Loading...</div>;
  }

  if (error) {
    return (
      <div className="px-6 py-4">
        <p className="text-sm text-red-600">Failed to load templates.</p>
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={refetch}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {(formik) => (
          <EmailTemplateEditorForm
            formik={formik}
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
            defaultTemplates={defaultTemplates}
            selectedDefaultName={selectedDefault?.templateName}
            isDemoEnabled={isDemoEnabled}
            onTogglePreview={handleTogglePreview}
            onResetToDefault={resetTemplateToDefault}
            onClose={onClose}
            isUpdating={isUpdating}
            isFetching={isFetching}
            variableAnalysis={variableAnalysis}
            insertion={insertion}
            theme={theme}
            editorOptions={editorOptions as unknown as Record<string, unknown>}
            previewData={previewData as unknown as Record<string, string>}
          />
        )}
      </Formik>
    </div>
  );
}
