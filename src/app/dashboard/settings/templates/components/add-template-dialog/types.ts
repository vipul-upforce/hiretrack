import type * as Monaco from 'monaco-editor';

export type TemplateDraft = {
  name: string;
  subject: string;
  content: string;
};

export type SampleTemplate = TemplateDraft & {
  name: string;
};

export type MonacoEditor = Monaco.editor.IStandaloneCodeEditor;
