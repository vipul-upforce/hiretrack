import { useState, useEffect } from 'react';
import {
  useGetMailTemplatesQuery,
  useUpdateMailTemplatesMutation,
} from '@/lib/features/settings/settingsApi';
import { useToast } from '@/hooks/use-toast';
import { EmailTemplate, MailTemplatePayload } from '../types';
import { defaultTemplates, templateVariables } from '../constants';

export const useEmailTemplates = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([
    ...defaultTemplates,
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('job-application-hr');
  const [previewMode, setPreviewMode] = useState(false);

  const {
    data: templateData,
    isLoading,
    error,
  } = useGetMailTemplatesQuery(undefined);
  const [updateMailTemplates] = useUpdateMailTemplatesMutation();
  const { toast } = useToast();

  // Custom template management
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [newTemplatePreviewMode, setNewTemplatePreviewMode] = useState(false);
  const [newTemplateEditor, setNewTemplateEditor] = useState<any>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Hello {{ReceiverName}},</h2>
    <p style="margin: 0 0 15px 0;">This is a custom email template.</p>
    <p style="margin: 15px 0 0 0;">Best regards,<br>{{SenderName}}<br>{{PortalName}}</p>
</div>`,
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
      const templatesPayload: MailTemplatePayload = {};
      templates.forEach((template) => {
        templatesPayload[template.id] = {
          templateId: template.id,
          templateName: template.name,
          subject: template.subject,
          html: template.content,
          variables: template.variables,
        };
      });

      try {
        await updateMailTemplates(templatesPayload).unwrap();
        toast({
          title: 'Email templates saved successfully',
          variant: 'default',
        });
      } catch (error) {
        toast({
          title: 'Failed to save email templates',
          variant: 'destructive',
        });
      }
    } catch (error) {
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
    setTemplates((prev) => prev.map((template) => (template.id === id ? { ...template, [field]: value } : template)));
  };

  const resetToDefault = (id: string) => {
    const defaultTemplate = defaultTemplates.find((t) => t.id === id);
    if (defaultTemplate) {
      // Create a deep copy of the default template
      const resetTemplate = JSON.parse(JSON.stringify(defaultTemplate));
      setTemplates((prev) => prev.map((template) => (template.id === id ? resetTemplate : template)));
      toast({ title: 'Template reset to default', variant: 'default' });
    } else {
      toast({ title: 'Default template not found', variant: 'destructive' });
    }
  };

  const insertVariableInNewTemplate = (variable: string) => {
    const variableText = `{{${variable}}}`;

    if (newTemplateEditor && !newTemplatePreviewMode) {
      // Get current cursor position
      const position = newTemplateEditor.getPosition();
      const model = newTemplateEditor.getModel();

      if (position && model) {
        // Insert the variable at cursor position
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

        // Update the template content state
        setNewTemplate((prev) => ({ ...prev, content: model.getValue() }));

        // Focus back to editor and position cursor after inserted text
        newTemplateEditor.focus();
        const newPosition = {
          lineNumber: position.lineNumber,
          column: position.column + variableText.length,
        };
        newTemplateEditor.setPosition(newPosition);
      }
    } else {
      // Fallback: append to end of content if editor not available or in preview mode
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
      variables: templateVariables,
      isCustom: true,
      isDefault: false, // Custom templates are not default
    };

    const updatedTemplates = [...templates, customTemplate];
    setTemplates(updatedTemplates);
    setSelectedTemplate(templateId);
    setNewTemplate({
      name: '',
      subject: '',
      content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Hello {{ReceiverName}},</h2>
    <p style="margin: 0 0 15px 0;">This is a custom email template.</p>
    <p style="margin: 15px 0 0 0;">Best regards,<br>{{SenderName}}<br>{{PortalName}}</p>
</div>`,
    });
    setNewTemplatePreviewMode(false);
    setNewTemplateEditor(null);
    setShowAddDialog(false);

    // Save the updated templates to the server
    const templatesPayload: MailTemplatePayload = {};
    updatedTemplates.forEach((template) => {
      templatesPayload[template.id] = {
        templateId: template.id,
        templateName: template.name,
        subject: template.subject,
        html: template.content,
        variables: template.variables,
      };
    });

    try {
      await updateMailTemplates(templatesPayload).unwrap();
      toast({
        variant: 'default',
        title: 'Custom template added and saved successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to save custom template',
      });
      // Optionally revert the template addition if saving fails
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

    // If we're deleting the currently selected template, switch to the first one
    if (selectedTemplate === templateToDelete) {
      setSelectedTemplate(updatedTemplates[0]?.id || 'job-application-hr');
    }

    // Save the updated templates to the server
    const templatesPayload: MailTemplatePayload = {};
    updatedTemplates.forEach((template) => {
      templatesPayload[template.id] = {
        templateId: template.id,
        templateName: template.name,
        subject: template.subject,
        html: template.content,
        variables: template.variables,
      };
    });

    try {
      await updateMailTemplates(templatesPayload).unwrap();
      toast({
        variant: 'default',
        title: 'Custom template deleted successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete custom template',
      });
      // Optionally revert the deletion if saving fails
      setTemplates(templates);
      setSelectedTemplate(templateToDelete);
    }

    setTemplateToDelete(null);
    setShowDeleteDialog(false);
  };

  const getCurrentTemplate = () => {
    const current = templates.find((t) => t.id === selectedTemplate);
    if (!current && templates.length > 0) {
      return templates[0];
    }
    return current || defaultTemplates[0];
  };

  useEffect(() => {
    if (
      templateData
      && templateData.templates
      && Object.keys(templateData.templates).length > 0
    ) {
      const loadedTemplates = Object.values(templateData.templates).map(
        (template: any) => ({
          id: template.templateId,
          name: template.templateName,
          subject: template.subject,
          content: template.html,
          variables:
            template.variables
            || defaultTemplates.find((t) => t.id === template.templateId)
              ?.variables
            || templateVariables,
          isCustom: !defaultTemplates.find((t) => t.id === template.templateId),
          isDefault: !!defaultTemplates.find(
            (t) => t.id === template.templateId,
          ),
        }),
      );

      const mergedTemplates = [...defaultTemplates];
      loadedTemplates.forEach((loaded: EmailTemplate) => {
        const existingIndex = mergedTemplates.findIndex(
          (t) => t.id === loaded.id,
        );
        if (existingIndex >= 0) {
          mergedTemplates[existingIndex] = loaded;
        } else {
          mergedTemplates.push(loaded);
        }
      });

      setTemplates(mergedTemplates);
    } else {
      setTemplates([...defaultTemplates]);
    }

    if (error) {
      console.error('Failed to load email templates:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load email templates',
      });
      setTemplates([...defaultTemplates]);
    }
  }, [templateData, error]);

  const renderPreview = (content: string, variables: string[]) => {
    // Replace variables with sample data for preview
    const sampleData: Record<string, string> = {
      // New simplified variables
      SenderName: 'Jane Smith (HR Manager)',
      ReceiverName: 'John Doe',
      PortalName: 'Acme Corporation',

      // Keep existing variables for backward compatibility with default templates
      organizationName: 'Acme Corporation',
      candidateName: 'John Doe',
      candidateEmail: 'john.doe@email.com',
      candidatePhone: '+1 (555) 123-4567',
      jobTitle: 'Senior Frontend Developer',
      applicationDate: 'January 15, 2024',
      dashboardLink: 'https://app.company.com/dashboard',
      userName: 'John Doe',
      resetLink: 'https://app.company.com/reset-password?token=abc123',
      interviewerName: 'Jane Smith',
      interviewDate: 'January 22, 2024',
      interviewTime: '2:00 PM',
      duration: '45 minutes',
      interviewType: 'Technical Interview',
      meetingLink: 'https://meet.company.com/interview-123',
      candidateProfileLink: 'https://app.company.com/candidates/123',
      newStatus: 'Interview Scheduled',
      statusMessage: 'Your interview has been scheduled for next week.',
      nextSteps:
        'Please prepare for the technical interview and review the job requirements.',
      hrContactInfo: 'hr@company.com | +1 (555) 987-6543',
      recipientName: 'Jane Smith',
      reviewerName: 'Mike Johnson',
      remarkDate: 'January 20, 2024',
      rating: '4',
      remarkText:
        'Strong technical skills demonstrated during the initial screening. Good communication abilities.',
      stepName: 'Technical Interview',
      completedBy: 'Jane Smith',
      completionDate: 'January 20, 2024',
      feedback:
        'Candidate showed excellent problem-solving skills and technical knowledge.',
      nextStep: 'Final Interview with Hiring Manager',
      otpCode: '123456',
      expirationTime: '15',
    };
    // Check for missing variables
    const missingVariables = variables.filter(
      (variable) => !(variable in sampleData),
    );
    if (missingVariables.length > 0) {
      toast({
        variant: 'destructive',
        title: `Missing sample data for variables: ${missingVariables.join(', ')}`,
      });
    }

    let previewContent = content;
    Object.entries(sampleData).forEach(([key, value]) => {
      previewContent = previewContent.replace(
        new RegExp(`{{${key}}}`, 'g'),
        value,
      );
    });

    return previewContent;
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
