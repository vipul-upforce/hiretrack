'use client';

import { Editor } from '@monaco-editor/react';

interface CustomHtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 13,
  lineNumbers: 'on' as const,
  roundedSelection: false,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: 'on' as const,
  formatOnPaste: true,
  formatOnType: true,
};

export function CustomHtmlEditor({ value, onChange }: CustomHtmlEditorProps) {
  return (
    <div className="flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="border-b border-border/60 px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Custom HTML</p>
        <p className="text-xs text-muted-foreground">
          Provide a full HTML document. Inline CSS and animations are supported.
        </p>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="html"
          value={value}
          options={editorOptions}
          onChange={(next) => onChange(next ?? '')}
        />
      </div>
    </div>
  );
}
