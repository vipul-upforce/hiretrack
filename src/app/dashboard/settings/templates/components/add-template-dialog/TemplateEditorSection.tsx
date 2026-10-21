import React from 'react';
import { Code, Edit2 } from 'lucide-react';
import { Editor } from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TemplateVisualEditor } from '@/app/dashboard/jobs/[id]/components/Dialogs/email-candidate-components/TemplateVisualEditor';
import type { MonacoEditor, TemplateDraft } from './types';

type EditorMode = 'code' | 'visual';

type TemplateEditorSectionProps = {
  theme: string | undefined;
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;
  newTemplatePreviewMode: boolean;
  newTemplate: TemplateDraft;
  setNewTemplate: React.Dispatch<React.SetStateAction<TemplateDraft>>;
  setNewTemplateEditor: (editor: MonacoEditor) => void;
  renderPreview: (content: string, variables: string[]) => string;
  currentTemplateVariables: string[];
};

export function TemplateEditorSection({
  theme,
  editorMode,
  setEditorMode,
  newTemplatePreviewMode,
  newTemplate,
  setNewTemplate,
  setNewTemplateEditor,
  renderPreview,
  currentTemplateVariables,
}: TemplateEditorSectionProps) {
  const editorTheme = theme === 'dark' ? 'vs-dark' : 'vs';

  const renderEditorContent = () => {
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

    return (
      <div className="overflow-hidden rounded-lg border">
        <Editor
          height="500px"
          language="html"
          theme={editorTheme}
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Content</Label>
        <div className="flex gap-2">
          {!newTemplatePreviewMode ? (
            <>
              <Button
                type="button"
                variant={editorMode === 'visual' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setEditorMode('visual')}
                className="h-8"
              >
                <Edit2 className="mr-1 h-3 w-3" />
                Preview
              </Button>
              <Button
                type="button"
                variant={editorMode === 'code' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setEditorMode('code')}
                className="h-8"
              >
                <Code className="mr-1 h-3 w-3" />
                Edit
              </Button>
            </>
          ) : null}
        </div>
      </div>
      {renderEditorContent()}
    </div>
  );
}
