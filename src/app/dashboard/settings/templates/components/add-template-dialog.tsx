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
} from "@/components/ui/card";
import { Code, Eye, FileText, Mail, Plus, Edit2 } from "lucide-react";
import { Editor } from "@monaco-editor/react";
import { useTheme } from "@/components/theme-provider";
import { TemplateVisualEditor } from "@/app/dashboard/jobs/[id]/components/Dialogs/email-candidate-components/TemplateVisualEditor";
import { sampleCustomTemplates, templateVariables } from "../constants";

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

export const AddTemplateDialog: React.FC<AddTemplateDialogProps> = ({
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
}) => {
  const { theme } = useTheme();
  const [editorMode, setEditorMode] = useState<"code" | "visual">("visual");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none !w-full !h-full !left-0 !top-0 !translate-x-0 !translate-y-0 min-w-0 lg:!max-w-[80vw] lg:!min-w-[900px] lg:!h-[90vh] lg:!left-[50%] lg:!top-[50%] lg:!translate-x-[-50%] lg:!translate-y-[-50%] xl:!max-w-[70vw] overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pr-12 border-b border-gray-200 dark:border-gray-700 pb-4">
          <DialogTitle className="text-xl font-semibold">
            Add Custom Email Template
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Create a new custom email template with SenderName, ReceiverName,
            and PortalName variables.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Side - Template Form */}
            <div className="lg:col-span-2 space-y-6">
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
                        <div className="flex flex-col w-full">
                          <span className="font-medium">{sample.name}</span>
                          <p className="text-xs text-gray-500 mt-1">
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
                  onChange={(e) => setNewTemplate((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))}
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
                  onChange={(e) => setNewTemplate((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))}
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
                          variant={editorMode === "visual" ? "primary" : "outline"}
                          size="sm"
                          onClick={() => setEditorMode("visual")}
                          className="h-8"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                        <Button
                          type="button"
                          variant={editorMode === "code" ? "primary" : "outline"}
                          size="sm"
                          onClick={() => setEditorMode("code")}
                          className="h-8"
                        >
                          <Code className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </>
                    )}
                    {/* <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setNewTemplatePreviewMode(!newTemplatePreviewMode)
                      }
                      className="h-8"
                    >
                      {newTemplatePreviewMode ? (
                        <>
                          <Code className="h-4 w-4 mr-2" />
                          Edit
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </>
                      )}
                    </Button> */}
                  </div>
                </div>

                {newTemplatePreviewMode ? (
                  <div className="border rounded-lg p-4 min-h-[500px] bg-white overflow-auto">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: renderPreview(
                          newTemplate.content,
                          currentTemplateVariables,
                        ),
                      }}
                    />
                  </div>
                ) : editorMode === "visual" ? (
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
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Editor
                      height="500px"
                      language="html"
                      theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                      value={newTemplate.content}
                      onChange={(value) => setNewTemplate((prev) => ({
                        ...prev,
                        content: value || '',
                      }))}
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
                )}
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
                      <div
                        key={variable}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => insertVariableInNewTemplate(variable)}
                      >
                        <div className="flex flex-col">
                          <code className="font-mono text-sm font-medium">{`{{${variable}}}`}</code>
                          <span className="text-xs text-muted-foreground mt-1">
                            {variable === 'SenderName'
                              && 'Person sending the email'}
                            {variable === 'ReceiverName'
                              && 'Candidate receiving the email'}
                            {variable === 'PortalName'
                              && 'Your organization name'}
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
                      </div>
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
                    <div className="text-muted-foreground mt-1">
                      Variables will be automatically replaced when sending
                      emails.
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Styling Guidelines</div>
                    <div className="text-muted-foreground mt-1">
                      Use inline CSS styles for maximum email client
                      compatibility.
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Preview</div>
                    <div className="text-muted-foreground mt-1">
                      Use the Preview button to see how your template will look
                      to recipients.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-3 bg-background px-6 py-4 border-t border-gray-200 dark:border-gray-700">
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
};
