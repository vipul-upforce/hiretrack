import { useState, type Dispatch, type SetStateAction } from 'react';
import type {
  MonacoEditor,
  TemplateDraft,
} from '../components/add-template-dialog/types';
import type { EmailTemplate } from '../types';
import { templateVariables } from '../constants';
import { buildMailTemplatePayload } from './useEmailTemplate.helpers';

type ToastFn = (args: {
  title: string;
  variant: 'default' | 'destructive';
}) => void;

type UpdateMailTemplatesFn = (
  payload: ReturnType<typeof buildMailTemplatePayload>,
) => { unwrap: () => Promise<unknown> };

const EMPTY_TEMPLATE: TemplateDraft = {
  name: '',
  subject: '',
  content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Hello {{ReceiverName}},</h2>
    <p style="margin: 0 0 15px 0;">This is a custom email template.</p>
    <p style="margin: 15px 0 0 0;">Best regards,<br>{{SenderName}}<br>{{PortalName}}</p>
</div>`,
};

export function useCustomTemplateManagement(args: {
  templates: EmailTemplate[];
  setTemplates: Dispatch<SetStateAction<EmailTemplate[]>>;
  selectedTemplate: string;
  setSelectedTemplate: Dispatch<SetStateAction<string>>;
  updateMailTemplates: UpdateMailTemplatesFn;
  toast: ToastFn;
}) {
  const {
    templates,
    setTemplates,
    selectedTemplate,
    setSelectedTemplate,
    updateMailTemplates,
    toast,
  } = args;

  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [newTemplatePreviewMode, setNewTemplatePreviewMode] = useState(false);
  const [newTemplateEditor, setNewTemplateEditor] =
    useState<MonacoEditor | null>(null);
  const [newTemplate, setNewTemplate] = useState<TemplateDraft>(EMPTY_TEMPLATE);

  const insertVariableInNewTemplate = (variable: string) => {
    const variableText = `{{${variable}}}`;

    if (newTemplateEditor && !newTemplatePreviewMode) {
      const position = newTemplateEditor.getPosition();
      const model = newTemplateEditor.getModel();

      if (position && model) {
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        };

        newTemplateEditor.executeEdits('insert-variable', [
          {
            range,
            text: variableText,
          },
        ]);

        setNewTemplate((prev) => ({ ...prev, content: model.getValue() }));

        newTemplateEditor.focus();
        newTemplateEditor.setPosition({
          lineNumber: position.lineNumber,
          column: position.column + variableText.length,
        });
      }
    } else {
      setNewTemplate((prev) => ({
        ...prev,
        content: prev.content + variableText,
      }));
    }

    toast({ variant: 'default', title: `Variable {{${variable}}} inserted` });
  };

  const addCustomTemplate = async () => {
    setLoading(true);

    if (!newTemplate.name.trim() || !newTemplate.subject.trim()) {
      toast({
        variant: 'destructive',
        title: 'Please fill in template name and subject',
      });
      setLoading(false);
      return;
    }

    const templateId = `custom-${Date.now()}`;
    const customTemplate: EmailTemplate = {
      id: templateId,
      name: newTemplate.name.trim(),
      subject: newTemplate.subject.trim(),
      content: newTemplate.content,
      variables: [...templateVariables],
      isCustom: true,
      isDefault: false,
    };

    const updatedTemplates = [...templates, customTemplate];
    setTemplates(updatedTemplates);
    setSelectedTemplate(templateId);

    setNewTemplate(EMPTY_TEMPLATE);
    setNewTemplatePreviewMode(false);
    setNewTemplateEditor(null);
    setShowAddDialog(false);

    const templatesPayload = buildMailTemplatePayload(updatedTemplates);

    try {
      await updateMailTemplates(templatesPayload).unwrap();
      toast({
        variant: 'default',
        title: 'Custom template added and saved successfully',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Failed to save custom template',
      });
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      setSelectedTemplate(templates[0]?.id || 'job-application-hr');
    }

    setLoading(false);
  };

  const deleteCustomTemplate = async () => {
    if (!templateToDelete) return;

    const template = templates.find((t) => t.id === templateToDelete);
    if (template?.isDefault) {
      toast({
        variant: 'destructive',
        title: 'Cannot delete default templates',
      });
      return;
    }

    const updatedTemplates = templates.filter((t) => t.id !== templateToDelete);
    setTemplates(updatedTemplates);

    if (selectedTemplate === templateToDelete) {
      setSelectedTemplate(updatedTemplates[0]?.id || 'job-application-hr');
    }

    const templatesPayload = buildMailTemplatePayload(updatedTemplates);

    try {
      await updateMailTemplates(templatesPayload).unwrap();
      toast({
        variant: 'default',
        title: 'Custom template deleted successfully',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Failed to delete custom template',
      });
      setTemplates(templates);
      setSelectedTemplate(templateToDelete);
    }

    setTemplateToDelete(null);
    setShowDeleteDialog(false);
  };

  return {
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
  };
}
