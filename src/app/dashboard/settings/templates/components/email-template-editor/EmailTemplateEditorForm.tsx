'use client';

import type { FormikProps } from 'formik';
import { Form } from 'formik';
import { Editor } from '@monaco-editor/react';
import type React from 'react';

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

import type {
  IEmailTemplate,
  IEmailTemplatesConfig,
} from '@/app/dashboard/settings/components/types';

import type { TemplateVariableAnalysis } from './useTemplateVariableAnalysis';
import type { ActiveEditor } from './useTemplateVariableInsertion';
import { PreviewPanel } from './PreviewPanel';
import { VariablePanel } from './VariablePanel';

type SetFieldValue = FormikProps<IEmailTemplatesConfig>['setFieldValue'];

export interface EmailTemplateEditorFormProps {
  formik: FormikProps<IEmailTemplatesConfig>;
  selectedTemplate: string;
  setSelectedTemplate: (value: string) => void;
  defaultTemplates: Record<string, IEmailTemplate>;
  selectedDefaultName?: string;
  isDemoEnabled: boolean;
  onTogglePreview: () => void;
  onResetToDefault: (args: {
    setFieldValue: SetFieldValue;
    values: IEmailTemplatesConfig;
  }) => void;
  onClose: () => void;
  isUpdating: boolean;
  isFetching: boolean;
  variableAnalysis: TemplateVariableAnalysis;
  insertion: {
    activeEditor: ActiveEditor;
    subjectInputRef: React.RefObject<HTMLInputElement | null>;
    handleSubjectChange: (
      e: React.ChangeEvent<HTMLInputElement>,
      setFieldValue: SetFieldValue,
      values: IEmailTemplatesConfig,
    ) => void;
    handleSubjectClick: (e: React.MouseEvent<HTMLInputElement>) => void;
    handleSubjectKeyUp: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    handleSubjectFocus: () => void;
    handleEditorMount: (
      editor: import('monaco-editor').editor.IStandaloneCodeEditor,
    ) => void;
    insertVariable: (
      variable: string,
      setFieldValue: SetFieldValue,
      values: IEmailTemplatesConfig,
    ) => void;
  };
  theme: string | undefined;
  editorOptions: Record<string, unknown>;
  previewData: Record<string, string>;
}

export function EmailTemplateEditorForm({
  formik,
  selectedTemplate,
  setSelectedTemplate,
  defaultTemplates,
  selectedDefaultName,
  isDemoEnabled,
  onTogglePreview,
  onResetToDefault,
  onClose,
  isUpdating,
  isFetching,
  variableAnalysis,
  insertion,
  theme,
  editorOptions,
  previewData,
}: EmailTemplateEditorFormProps) {
  const { values, handleSubmit, setFieldValue, isSubmitting } = formik;

  const selected = values.templates[selectedTemplate]; // eslint-disable-line security/detect-object-injection -- key comes from a controlled Select list

  return (
    <Form onSubmit={handleSubmit}>
      <div className="flex h-full flex-col">
        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4 overflow-y-auto p-2">
            <div className="space-y-2">
              <Label htmlFor="templateType">Select Template to Edit</Label>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(defaultTemplates).map(([key, template]) => (
                    <SelectItem key={key} value={key}>
                      {template.templateName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">
                Email Subject
                {insertion.activeEditor === 'subject' && (
                  <span className="ml-2 text-xs font-medium text-green-600">
                    ● Active
                  </span>
                )}
              </Label>
              <Input
                ref={insertion.subjectInputRef}
                id="subject"
                value={selected?.subject || ''}
                onChange={(e) =>
                  insertion.handleSubjectChange(e, setFieldValue, values)
                }
                onClick={insertion.handleSubjectClick}
                onKeyUp={insertion.handleSubjectKeyUp}
                onFocus={insertion.handleSubjectFocus}
                placeholder="Enter email subject"
              />
            </div>

            <div className="space-y-2">
              <Label>
                HTML Content
                {insertion.activeEditor === 'html' && (
                  <span className="ml-2 text-xs font-medium text-green-600">
                    ● Active
                  </span>
                )}
              </Label>
              <div className="rounded-md border">
                <Editor
                  height="400px"
                  defaultLanguage="html"
                  value={selected?.html || ''}
                  onChange={(value) => {
                    const updatedTemplates: IEmailTemplatesConfig['templates'] =
                      {
                        ...values.templates,
                        [selectedTemplate]: {
                          ...values.templates[selectedTemplate], // eslint-disable-line security/detect-object-injection -- key comes from a controlled Select list
                          html: value || '',
                        },
                      };

                    setFieldValue('templates', updatedTemplates);
                  }}
                  onMount={insertion.handleEditorMount}
                  options={{
                    ...editorOptions,
                    selectOnLineNumbers: true,
                    readOnly: false,
                    cursorStyle: 'line',
                    automaticLayout: true,
                    theme: theme === 'dark' ? 'vs-dark' : 'vs-light',
                  }}
                  theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                />
              </div>
            </div>

            <VariablePanel
              activeEditor={insertion.activeEditor}
              analysis={variableAnalysis}
              onInsertVariable={insertion.insertVariable}
              setFieldValue={setFieldValue}
              values={values}
            />
          </div>

          <PreviewPanel
            selectedTemplateName={selectedDefaultName}
            isDemoEnabled={isDemoEnabled}
            onTogglePreview={onTogglePreview}
            onResetToDefault={() => onResetToDefault({ setFieldValue, values })}
            subject={selected?.subject || ''}
            html={selected?.html || ''}
            previewData={previewData}
          />
        </div>

        <div className="flex w-full items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {variableAnalysis.invalid.length > 0 && (
              <p className="text-sm text-red-500">Remove Invalid Variables</p>
            )}
            {isFetching && (
              <p className="text-xs text-muted-foreground">Refreshing…</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={
                isSubmitting ||
                isUpdating ||
                variableAnalysis.invalid.length > 0
              }
            >
              {isSubmitting || isUpdating ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </Form>
  );
}
