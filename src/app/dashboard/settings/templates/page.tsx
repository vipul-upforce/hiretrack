'use client';

import { useTheme } from '@/components/theme-provider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import EmailTemplateSkeleton from './components/email-template-skeleton';
import { useEmailTemplates } from './hooks/useEmailTemplate';
import { AddTemplateDialog } from './components/add-template-dialog';
import { TemplateHeader } from './components/template-header';
import { TemplateSelector } from './components/template-selector';
import { TemplateEditor } from './components/template-editor';
import { TemplateSidebar } from './components/template-sidebar';

export default function EmailTemplatesPage() {
  const { theme } = useTheme();

  const {
    loading,
    saving,
    templates,
    selectedTemplate,
    setSelectedTemplate,
    previewMode,
    setPreviewMode,
    isLoading,
    showAddDialog,
    setShowAddDialog,
    showDeleteDialog,
    setShowDeleteDialog,
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
  } = useEmailTemplates();

  if (isLoading) {
    return <EmailTemplateSkeleton />;
  }

  const currentTemplate = getCurrentTemplate();

  const handleDeleteRequest = (templateId: string) => {
    setTemplateToDelete(templateId);
    setShowDeleteDialog(true);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden w-full">
      <TemplateHeader onSave={handleSave} saving={saving} />

      <div className="flex-1 min-h-0 px-4 pb-4 mt-4 overflow-y-auto">
        <div className="space-y-6">
          <TemplateSelector
            templates={templates}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
            onAddClick={() => setShowAddDialog(true)}
            onDeleteClick={handleDeleteRequest}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TemplateEditor
              currentTemplate={currentTemplate}
              updateTemplate={updateTemplate}
              resetToDefault={resetToDefault}
              previewMode={previewMode}
              setPreviewMode={setPreviewMode}
              renderPreview={renderPreview}
              theme={theme}
            />

            <TemplateSidebar currentTemplate={currentTemplate} />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AddTemplateDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        newTemplate={newTemplate}
        setNewTemplate={setNewTemplate}
        addCustomTemplate={addCustomTemplate}
        loading={loading}
        newTemplatePreviewMode={newTemplatePreviewMode}
        setNewTemplatePreviewMode={setNewTemplatePreviewMode}
        setNewTemplateEditor={setNewTemplateEditor}
        renderPreview={renderPreview}
        currentTemplateVariables={currentTemplate.variables}
        insertVariableInNewTemplate={insertVariableInNewTemplate}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this custom template? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteCustomTemplate}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
