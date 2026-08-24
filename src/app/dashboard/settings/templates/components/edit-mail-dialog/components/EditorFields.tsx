import { Editor } from '@monaco-editor/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/components/theme-provider';
import type { IEmailTemplatesConfig } from '@/app/dashboard/settings/components/types';
import type { editor } from 'monaco-editor';
import type { RefObject, ChangeEvent, MouseEvent, KeyboardEvent } from 'react';
import { editorOptions } from '@/app/dashboard/settings/templates/constants';

interface EditorFieldsProps {
  selectedTemplate: string;
  values: IEmailTemplatesConfig;
  activeEditor: 'subject' | 'html' | null;
  subjectInputRef: RefObject<HTMLInputElement | null>;
  onSubjectChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubjectClick: (e: MouseEvent<HTMLInputElement>) => void;
  onSubjectKeyUp: (e: KeyboardEvent<HTMLInputElement>) => void;
  onSubjectFocus: () => void;
  onHtmlChange: (value: string | undefined) => void;
  onEditorMount: (monacoEditor: editor.IStandaloneCodeEditor) => void;
}

export function EditorFields({
  selectedTemplate,
  values,
  activeEditor,
  subjectInputRef,
  onSubjectChange,
  onSubjectClick,
  onSubjectKeyUp,
  onSubjectFocus,
  onHtmlChange,
  onEditorMount,
}: EditorFieldsProps) {
  const { theme } = useTheme();
  const subject = values.templates[selectedTemplate]?.subject || '';
  const html = values.templates[selectedTemplate]?.html || '';

  return (
    <div className="space-y-4 overflow-y-auto p-2">
      <div className="space-y-2">
        <Label htmlFor="subject">
          Email Subject
          {activeEditor === 'subject' && (
            <span className="ml-2 text-xs font-medium text-green-600">
              ● Active
            </span>
          )}
        </Label>
        <Input
          ref={subjectInputRef}
          id="subject"
          value={subject}
          onChange={onSubjectChange}
          onClick={onSubjectClick}
          onKeyUp={onSubjectKeyUp}
          onFocus={onSubjectFocus}
          placeholder="Enter email subject"
        />
      </div>

      <div className="space-y-2">
        <Label>
          HTML Content
          {activeEditor === 'html' && (
            <span className="ml-2 text-xs font-medium text-green-600">
              ● Active
            </span>
          )}
        </Label>
        <div className="rounded-md border">
          <Editor
            height="400px"
            defaultLanguage="html"
            value={html}
            onChange={onHtmlChange}
            onMount={onEditorMount}
            options={{
              ...editorOptions,
              selectOnLineNumbers: true,
              roundedSelection: false,
              readOnly: false,
              cursorStyle: 'line',
              automaticLayout: true,
              theme: theme === 'dark' ? 'vs-dark' : 'vs-light',
            }}
            theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
          />
        </div>
      </div>
    </div>
  );
}
