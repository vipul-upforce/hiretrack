import React, { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Code, RotateCcw, Edit2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Editor } from '@monaco-editor/react';
import { TemplateVisualEditor } from '@/app/dashboard/jobs/[id]/components/Dialogs/email-candidate-components/TemplateVisualEditor';
import { EmailTemplate } from '../types';

interface TemplateEditorProps {
  currentTemplate: EmailTemplate;
  updateTemplate: (
    id: string,
    field: keyof EmailTemplate,
    value: string,
  ) => void;
  resetToDefault: (id: string) => void;
  previewMode: boolean;
  setPreviewMode: Dispatch<SetStateAction<boolean>>;
  renderPreview: (content: string, variables: string[]) => string;
  theme: string | undefined;
}

export function TemplateEditor(props: TemplateEditorProps) {
  const {
    currentTemplate,
    updateTemplate,
    resetToDefault,
    previewMode,
    setPreviewMode,
    renderPreview,
    theme,
  } = props;
  const [editorMode, setEditorMode] = useState<'code' | 'visual'>('visual');

  let editorContent;

  if (previewMode) {
    editorContent = (
      <div className="min-h-[400px] rounded-lg border bg-white p-4">
        <div
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: renderPreview(
              currentTemplate.content,
              currentTemplate.variables,
            ),
          }}
        />
      </div>
    );
  } else if (editorMode === 'visual') {
    editorContent = (
      <TemplateVisualEditor
        htmlContent={currentTemplate.content}
        onContentChange={(html) =>
          updateTemplate(currentTemplate.id, 'content', html)
        }
        className="min-h-[400px]"
      />
    );
  } else {
    editorContent = (
      <div className="overflow-hidden rounded-lg border">
        <Editor
          height="500px"
          language="html"
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          value={currentTemplate.content}
          onChange={(value) =>
            updateTemplate(currentTemplate.id, 'content', value || '')
          }
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
  }

  return (
    <div className="space-y-4 lg:col-span-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              {currentTemplate.name}
            </CardTitle>
            <div className="flex gap-2">
              {currentTemplate?.isDefault && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md"
                  onClick={() => resetToDefault(currentTemplate.id)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to Default
                </Button>
              )}
              <Button
                variant={previewMode ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
                className="h-8"
              >
                {previewMode ? (
                  <>
                    <EyeOff className="mr-1 h-4 w-4" />
                    Exit Preview
                  </>
                ) : (
                  <>
                    <Eye className="mr-1 h-4 w-4" />
                    Preview
                  </>
                )}
              </Button>
              {!previewMode && (
                <>
                  <Button
                    variant={editorMode === 'visual' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setEditorMode('visual')}
                    className="h-8"
                  >
                    <Edit2 className="mr-1 h-3 w-3" />
                    Template Editor
                  </Button>
                  <Button
                    variant={editorMode === 'code' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setEditorMode('code')}
                    className="h-8"
                  >
                    <Code className="mr-1 h-4 w-4" />
                    HTML Editor
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subject Line */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line</Label>
            {previewMode ? (
              <div className="rounded-md border bg-muted p-2 text-sm">
                {renderPreview(
                  currentTemplate.subject,
                  currentTemplate.variables,
                )}
              </div>
            ) : (
              <Input
                id="subject"
                value={currentTemplate.subject}
                onChange={(e) =>
                  updateTemplate(currentTemplate.id, 'subject', e.target.value)
                }
                placeholder="Email subject line"
              />
            )}
          </div>

          {/* Content Editor */}
          <div className="space-y-2">
            <Label>Email Content</Label>
            {editorContent}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
