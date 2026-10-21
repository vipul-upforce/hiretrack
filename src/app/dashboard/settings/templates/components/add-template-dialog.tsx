import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/components/theme-provider';
import { sampleCustomTemplates, templateVariables } from '../constants';
import type { MonacoEditor, TemplateDraft } from './add-template-dialog/types';
import { QuickStartSelect } from './add-template-dialog/QuickStartSelect';
import { TemplateEditorSection } from './add-template-dialog/TemplateEditorSection';
import {
  TemplateTipsCard,
  TemplateVariablesCard,
} from './add-template-dialog/RightSidePanels';

interface AddTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newTemplate: TemplateDraft;
  setNewTemplate: React.Dispatch<React.SetStateAction<TemplateDraft>>;
  addCustomTemplate: () => void;
  loading: boolean;
  newTemplatePreviewMode: boolean;
  setNewTemplatePreviewMode: (mode: boolean) => void;
  setNewTemplateEditor: (editor: MonacoEditor) => void;
  renderPreview: (content: string, variables: string[]) => string;
  currentTemplateVariables: string[];
  insertVariableInNewTemplate: (variable: string) => void;
}

export function AddTemplateDialog({
  open,
  onOpenChange,
  newTemplate,
  setNewTemplate,
  addCustomTemplate,
  loading,
  newTemplatePreviewMode,
  setNewTemplatePreviewMode: _setNewTemplatePreviewMode,
  setNewTemplateEditor,
  renderPreview,
  currentTemplateVariables,
  insertVariableInNewTemplate,
}: AddTemplateDialogProps) {
  const { theme } = useTheme();
  const [editorMode, setEditorMode] = useState<'code' | 'visual'>('visual');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!left-0 !top-0 flex !h-full !w-full min-w-0 !max-w-none !translate-x-0 !translate-y-0 flex-col overflow-hidden lg:!left-[50%] lg:!top-[50%] lg:!h-[90vh] lg:!min-w-[900px] lg:!max-w-[80vw] lg:!translate-x-[-50%] lg:!translate-y-[-50%] xl:!max-w-[70vw]">
        <DialogHeader className="border-b border-gray-200 px-6 pb-4 pr-12 pt-6 dark:border-gray-700">
          <DialogTitle className="text-xl font-semibold">
            Add Custom Email Template
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Create a new custom email template with SenderName, ReceiverName,
            and PortalName variables.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left Side - Template Form */}
            <div className="space-y-6 lg:col-span-2">
              {/* Quick Start with Sample Templates */}
              <QuickStartSelect
                sampleTemplates={sampleCustomTemplates}
                setNewTemplate={setNewTemplate}
              />

              <div className="space-y-2">
                <Label htmlFor="template-name" className="text-sm font-medium">
                  Template Name
                </Label>
                <Input
                  id="template-name"
                  value={newTemplate.name}
                  onChange={(e) =>
                    setNewTemplate((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Enter template name"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="template-subject"
                  className="text-sm font-medium"
                >
                  Subject
                </Label>
                <Input
                  id="template-subject"
                  value={newTemplate.subject}
                  onChange={(e) =>
                    setNewTemplate((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
                  }
                  placeholder="Enter email subject"
                  className="h-10"
                />
              </div>

              <TemplateEditorSection
                theme={theme}
                editorMode={editorMode}
                setEditorMode={setEditorMode}
                newTemplatePreviewMode={newTemplatePreviewMode}
                newTemplate={newTemplate}
                setNewTemplate={setNewTemplate}
                setNewTemplateEditor={setNewTemplateEditor}
                renderPreview={renderPreview}
                currentTemplateVariables={currentTemplateVariables}
              />
            </div>

            {/* Right Side - Variables Panel */}
            <div className="space-y-4">
              <TemplateVariablesCard
                templateVariables={templateVariables}
                insertVariableInNewTemplate={insertVariableInNewTemplate}
              />
              <TemplateTipsCard />
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-3 border-t border-gray-200 bg-background px-6 py-4 dark:border-gray-700">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={addCustomTemplate}
            disabled={loading}
            variant="primary"
          >
            {loading ? 'Adding...' : 'Add Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
