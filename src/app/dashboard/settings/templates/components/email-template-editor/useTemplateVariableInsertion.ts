import { useCallback, useRef, useState } from 'react';
import type React from 'react';
import type { FormikHelpers } from 'formik';
import type { editor as MonacoEditor } from 'monaco-editor';

import type { IEmailTemplatesConfig } from '@/app/dashboard/settings/components/types';

export type ActiveEditor = 'subject' | 'html' | null;

export function useTemplateVariableInsertion(args: {
  selectedTemplate: string;
  onToastError: (message: string) => void;
}) {
  const [activeEditor, setActiveEditor] = useState<ActiveEditor>(null);

  const subjectInputRef = useRef<HTMLInputElement>(null);
  const subjectCursorPosition = useRef<number>(0);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);

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

  const handleSubjectChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement>,
      setFieldValue: FormikHelpers<IEmailTemplatesConfig>['setFieldValue'],
      values: IEmailTemplatesConfig,
    ) => {
      const { target } = e;
      subjectCursorPosition.current = target.selectionStart || 0;

      const updatedTemplates: IEmailTemplatesConfig['templates'] = {
        ...values.templates,
        [args.selectedTemplate]: {
          ...values.templates[args.selectedTemplate],
          subject: target.value,
        },
      };

      setFieldValue('templates', updatedTemplates);
    },
    [args.selectedTemplate],
  );

  const handleEditorMount = useCallback(
    (editor: MonacoEditor.IStandaloneCodeEditor) => {
      editorRef.current = editor;

      editor.onDidFocusEditorText(() => {
        setActiveEditor('html');
      });

      editor.onDidChangeCursorPosition(() => {
        setActiveEditor('html');
      });
    },
    [],
  );

  const insertVariable = useCallback(
    (
      variable: string,
      setFieldValue: FormikHelpers<IEmailTemplatesConfig>['setFieldValue'],
      values: IEmailTemplatesConfig,
    ) => {
      const variableText = `{{${variable}}}`;

      if (activeEditor === 'subject') {
        const input = subjectInputRef.current;
        if (!input) {
          args.onToastError('Subject input not found');
          return;
        }

        const currentValue =
          values.templates[args.selectedTemplate]?.subject || '';
        const startPos = subjectCursorPosition.current;
        const newValue =
          currentValue.slice(0, startPos) +
          variableText +
          currentValue.slice(startPos);

        const updatedTemplates: IEmailTemplatesConfig['templates'] = {
          ...values.templates,
          [args.selectedTemplate]: {
            ...values.templates[args.selectedTemplate],
            subject: newValue,
          },
        };

        setFieldValue('templates', updatedTemplates);

        setTimeout(() => {
          const newCursorPos = startPos + variableText.length;
          input.focus();
          input.setSelectionRange(newCursorPos, newCursorPos);
          subjectCursorPosition.current = newCursorPos;
        }, 0);

        return;
      }

      if (activeEditor === 'html') {
        const editor = editorRef.current;
        if (!editor) {
          args.onToastError('HTML editor not found');
          return;
        }

        const position = editor.getPosition();
        if (!position) {
          args.onToastError('Could not get cursor position');
          return;
        }

        editor.executeEdits('insert-variable', [
          {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
            text: variableText,
          },
        ]);

        editor.setPosition({
          lineNumber: position.lineNumber,
          column: position.column + variableText.length,
        });
        editor.focus();
        return;
      }

      args.onToastError(
        'Please click in the subject field or HTML editor first, then try again',
      );
    },
    [activeEditor, args],
  );

  return {
    activeEditor,
    setActiveEditor,
    subjectInputRef,
    handleSubjectFocus,
    handleSubjectClick,
    handleSubjectKeyUp,
    handleSubjectChange,
    handleEditorMount,
    insertVariable,
  };
}
