import { useState, useEffect } from 'react';
import {
  useGetMailTemplatesQuery,
  useUpdateMailTemplatesMutation,
} from '@/lib/features/settings';
import { useToast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import { EmailTemplate } from '../types';
import { defaultTemplates, templateVariables } from '../constants';
import { useCustomTemplateManagement } from './useCustomTemplateManagement';
import {
  buildMailTemplatePayload,
  mergeTemplatesFromApi,
  renderTemplatePreview,
  type MailTemplatesResponse,
} from './useEmailTemplate.helpers';

export const useEmailTemplates = () => {
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([
    ...defaultTemplates,
  ]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<string>('job-application-hr');
  const [previewMode, setPreviewMode] = useState(false);

  const {
    data: templateData,
    isLoading,
    error,
  } = useGetMailTemplatesQuery(undefined);
  const [updateMailTemplates] = useUpdateMailTemplatesMutation();
  const { toast } = useToast();

  const {
    loading,
    showAddDialog,
    setShowAddDialog,
    showDeleteDialog,
    setShowDeleteDialog,
    templateToDelete,
    setTemplateToDelete,
    newTemplatePreviewMode,
    setNewTemplatePreviewMode,
    setNewTemplateEditor,
    newTemplate,
    setNewTemplate,
    insertVariableInNewTemplate,
    addCustomTemplate,
    deleteCustomTemplate,
  } = useCustomTemplateManagement({
    templates,
    setTemplates,
    selectedTemplate,
    setSelectedTemplate,
    updateMailTemplates,
    toast,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const template of templates) {
        if (!template.subject.trim() || !template.content.trim()) {
          toast({
            title: `Template "${template.name}" has empty subject or content`,
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }
      }
      const templatesPayload = buildMailTemplatePayload(templates);

      try {
        await updateMailTemplates(templatesPayload).unwrap();
        toast({
          title: 'Email templates saved successfully',
          variant: 'default',
        });
      } catch {
        toast({
          title: 'Failed to save email templates',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'An error occurred while saving',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = (
    id: string,
    field: keyof EmailTemplate,
    value: string,
  ) => {
    setTemplates((prev) =>
      prev.map((template) =>
        template.id === id ? { ...template, [field]: value } : template,
      ),
    );
  };

  const resetToDefault = (id: string) => {
    const defaultTemplate = defaultTemplates.find((t) => t.id === id);
    if (defaultTemplate) {
      // Create a deep copy of the default template
      const resetTemplate = JSON.parse(JSON.stringify(defaultTemplate));
      setTemplates((prev) =>
        prev.map((template) => (template.id === id ? resetTemplate : template)),
      );
      toast({ title: 'Template reset to default', variant: 'default' });
    } else {
      toast({ title: 'Default template not found', variant: 'destructive' });
    }
  };

  const getCurrentTemplate = () => {
    const current = templates.find((t) => t.id === selectedTemplate);
    if (!current && templates.length > 0) {
      return templates[0];
    }
    return current || defaultTemplates[0];
  };

  useEffect(() => {
    const mergedTemplates = mergeTemplatesFromApi({
      templateData: templateData as MailTemplatesResponse | undefined,
      defaultTemplates,
      fallbackVariables: [...templateVariables],
    });
    setTemplates(mergedTemplates);

    if (error) {
      logger.error('Failed to load email templates:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load email templates',
      });
      setTemplates([...defaultTemplates]);
    }
  }, [templateData, error]);

  const renderPreview = (content: string, variables: string[]) => {
    const { html, missingVariables } = renderTemplatePreview({
      content,
      variables,
    });

    if (missingVariables.length > 0) {
      toast({
        variant: 'destructive',
        title: `Missing sample data for variables: ${missingVariables.join(', ')}`,
      });
    }
    return html;
  };

  return {
    loading,
    saving,
    templates,
    setTemplates,
    selectedTemplate,
    setSelectedTemplate,
    previewMode,
    setPreviewMode,
    isLoading,
    showAddDialog,
    setShowAddDialog,
    showDeleteDialog,
    setShowDeleteDialog,
    templateToDelete,
    setTemplateToDelete,
    newTemplatePreviewMode,
    setNewTemplatePreviewMode,
    setNewTemplateEditor,
    newTemplate,
    setNewTemplate,
    handleSave,
    updateTemplate,
    resetToDefault,
    insertVariableInNewTemplate,
    addCustomTemplate,
    deleteCustomTemplate,
    getCurrentTemplate,
    renderPreview,
  };
};
