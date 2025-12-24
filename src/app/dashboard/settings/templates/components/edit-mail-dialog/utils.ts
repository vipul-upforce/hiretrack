import { useState, useRef, useCallback } from 'react';
import type React from 'react';
import type { editor } from 'monaco-editor';
import type { IEmailTemplatesConfig } from '@/app/dashboard/settings/components/types';

type ToastFn = (props: {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}) => void;

type ActiveEditor = 'subject' | 'html' | null;

export function useTemplateEditorState() {
  const [activeEditor, setActiveEditor] = useState<ActiveEditor>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const subjectCursorPosition = useRef<number>(0);

  const handleSubjectFocus = useCallback(() => {
    setActiveEditor('subject');
  }, []);

  const handleSubjectClick = useCallback(
    (e: React.MouseEvent<HTMLInputElement>) => {
      const target = e.target as HTMLInputElement;
      subjectCursorPosition.current = target.selectionStart || 0;
      setActiveEditor('subject');
    },
    [],
  );

  const handleSubjectKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const target = e.target as HTMLInputElement;
      subjectCursorPosition.current = target.selectionStart || 0;
    },
    [],
  );

  const handleEditorMount = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor) => {
      editorRef.current = editorInstance;
      editorInstance.onDidFocusEditorText(() => setActiveEditor('html'));
      editorInstance.onDidChangeCursorPosition(() => setActiveEditor('html'));
    },
    [],
  );

  return {
    activeEditor,
    subjectInputRef,
    editorRef,
    subjectCursorPosition,
    handleSubjectFocus,
    handleSubjectClick,
    handleSubjectKeyUp,
    handleEditorMount,
  };
}

export function createTemplateEditorHandlers(
  state: ReturnType<typeof useTemplateEditorState>,
  selectedTemplate: string,
  setFieldValue: (field: string, value: unknown) => void,
  values: IEmailTemplatesConfig,
  toast: ToastFn,
) {
  const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = e;
    const cursorRef = state.subjectCursorPosition;
    cursorRef.current = target.selectionStart || 0;

    const updatedTemplates = {
      ...values.templates,
      [selectedTemplate]: {
        ...values.templates[selectedTemplate],
        subject: e.target.value,
      },
    };
    setFieldValue('templates', updatedTemplates);
  };

  const insertVariable = (variable: string) => {
    const variableText = `{{${variable}}}`;

    if (state.activeEditor === 'subject') {
      const input = state.subjectInputRef.current;
      if (!input) {
        toast({
          title: 'Error',
          description: 'Subject input not found',
          variant: 'destructive',
        });
        return;
      }

      const currentValue = values.templates[selectedTemplate]?.subject || '';
      const startPos = state.subjectCursorPosition.current;
      const newValue =
        currentValue.slice(0, startPos) +
        variableText +
        currentValue.slice(startPos);

      const updatedTemplates = {
        ...values.templates,
        [selectedTemplate]: {
          ...values.templates[selectedTemplate],
          subject: newValue,
        },
      };
      setFieldValue('templates', updatedTemplates);

      setTimeout(() => {
        const newCursorPos = startPos + variableText.length;
        input.focus();
        input.setSelectionRange(newCursorPos, newCursorPos);
        const cursorRef = state.subjectCursorPosition;
        cursorRef.current = newCursorPos;
      }, 0);
    } else if (state.activeEditor === 'html') {
      const monacoEditor = state.editorRef.current;
      if (!monacoEditor) {
        toast({
          title: 'Error',
          description: 'HTML editor not found',
          variant: 'destructive',
        });
        return;
      }

      const position = monacoEditor.getPosition();
      if (!position) {
        toast({
          title: 'Error',
          description: 'Could not get cursor position',
          variant: 'destructive',
        });
        return;
      }

      const range = {
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      };

      monacoEditor.executeEdits('insert-variable', [
        {
          range,
          text: variableText,
        },
      ]);

      const newPosition = {
        lineNumber: position.lineNumber,
        column: position.column + variableText.length,
      };
      monacoEditor.setPosition(newPosition);
      monacoEditor.focus();
    } else {
      toast({
        title: 'No editor selected',
        description:
          'Please click in the subject field or HTML editor first, then try again',
        variant: 'destructive',
      });
    }
  };

  return { handleSubjectChange, insertVariable };
}
