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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Code, FileText, Mail, Plus, Edit2 } from 'lucide-react';
import { Editor } from '@monaco-editor/react';
import { useTheme } from '@/components/theme-provider';
import { TemplateVisualEditor } from '@/app/dashboard/jobs/[id]/components/Dialogs/email-candidate-components/TemplateVisualEditor';
import { sampleCustomTemplates, templateVariables } from '../constants';

interface AddTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newTemplate: { name: string; subject: string; content: string };
  setNewTemplate: React.Dispatch<
    React.SetStateAction<{ name: string; subject: string; content: string }>
  >;
  addCustomTemplate: () => void;
  loading: boolean;
  newTemplatePreviewMode: boolean;
  setNewTemplatePreviewMode: (mode: boolean) => void;
  setNewTemplateEditor: (editor: any) => void;
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
  setNewTemplatePreviewMode,
  setNewTemplateEditor,
  renderPreview,
  currentTemplateVariables,
  insertVariableInNewTemplate,
}: AddTemplateDialogProps) {
  const { theme } = useTheme();
  const [editorMode, setEditorMode] = useState<'code' | 'visual'>('visual');

  const renderEditorContent = () => {
    // 1. Show Preview Mode
    if (newTemplatePreviewMode) {
      return (
        <div className="min-h-[500px] overflow-auto rounded-lg border bg-white p-4">
          <div
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: renderPreview(
                newTemplate.content,
                currentTemplateVariables,
              ),
            }}
          />
        </div>
      );
    }

    // 2. Show Visual Editor
    if (editorMode === 'visual') {
      return (
        <TemplateVisualEditor
          htmlContent={newTemplate.content}
          onContentChange={(html) =>
            setNewTemplate((prev) => ({
              ...prev,
              content: html,
            }))
          }
          className="min-h-[500px]"
        />
      );
    }

    // 3. Show Code Editor (Default)
    return (
      <div className="overflow-hidden rounded-lg border">
        <Editor
          height="500px"
          language="html"
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          value={newTemplate.content}
          onChange={(value) =>
            setNewTemplate((prev) => ({
              ...prev,
              content: value || '',
            }))
          }
          onMount={(editor) => setNewTemplateEditor(editor)}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            folding: true,
            automaticLayout: true,
          }}
        />
      </div>
    );
  };

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
              <div className="space-y-2">
                <Label className="text-sm font-medium">Quick Start</Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    const sampleTemplate = sampleCustomTemplates.find(
                      (t) => t.name === value,
                    );
                    if (sampleTemplate) {
                      setNewTemplate({
                        name: sampleTemplate.name,
                        subject: sampleTemplate.subject,
                        content: sampleTemplate.content,
                      });
                    }
                  }}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Choose from sample templates or start from scratch" />
                  </SelectTrigger>
                  <SelectContent className="max-h-96">
                    {sampleCustomTemplates.map((sample) => (
                      <SelectItem
                        key={sample.name}
                        value={sample.name}
                        className="py-3"
                      >
                        <div className="flex w-full flex-col">
                          <span className="font-medium">{sample.name}</span>
                          <p className="mt-1 text-xs text-gray-500">
                            {sample.subject}
                          </p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a pre-made template to customize, or continue with a
                  blank template below.
                </p>
              </div>

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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Content</Label>
                  <div className="flex gap-2">
                    {!newTemplatePreviewMode && (
                      <>
                        <Button
                          type="button"
                          variant={
                            editorMode === 'visual' ? 'primary' : 'outline'
                          }
                          size="sm"
                          onClick={() => setEditorMode('visual')}
                          className="h-8"
                        >
                          <Edit2 className="mr-1 h-3 w-3" />
                          Preview
                        </Button>
                        <Button
                          type="button"
                          variant={
                            editorMode === 'code' ? 'primary' : 'outline'
                          }
                          size="sm"
                          onClick={() => setEditorMode('code')}
                          className="h-8"
                        >
                          <Code className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {renderEditorContent()}
              </div>
            </div>

            {/* Right Side - Variables Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Available Variables
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Click to insert at cursor position
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {templateVariables.map((variable) => (
                      <button
                        type="button"
                        key={variable}
                        className="flex w-full cursor-pointer items-center justify-between rounded-lg bg-muted p-3 text-left transition-colors hover:bg-muted/80"
                        onClick={() => insertVariableInNewTemplate(variable)}
                      >
                        <div className="flex flex-col">
                          <code className="font-mono text-sm font-medium">{`{{${variable}}}`}</code>
                          <span className="mt-1 text-xs text-muted-foreground">
                            {variable === 'SenderName' &&
                              'Person sending the email'}
                            {variable === 'ReceiverName' &&
                              'Candidate receiving the email'}
                            {variable === 'PortalName' &&
                              'Your organization name'}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            insertVariableInNewTemplate(variable);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Mail className="h-4 w-4" />
                    Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <div className="font-medium">Variable Usage</div>
                    <div className="mt-1 text-muted-foreground">
                      Variables will be automatically replaced when sending
                      emails.
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Styling Guidelines</div>
                    <div className="mt-1 text-muted-foreground">
                      Use inline CSS styles for maximum email client
                      compatibility.
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Preview</div>
                    <div className="mt-1 text-muted-foreground">
                      Use the Preview button to see how your template will look
                      to recipients.
                    </div>
                  </div>
                </CardContent>
              </Card>
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
