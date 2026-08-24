'use client';

import { useState, useEffect, useMemo } from 'react';
import { Form, Formik } from 'formik';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useGetMailTemplatesQuery,
  useUpdateMailTemplatesMutation,
} from '@/lib/features/settings';
import { defaultTemplatesAsObject as defaultTemplates } from '@/app/dashboard/settings/templates/constants';
import type { IEmailTemplatesConfig } from '@/app/dashboard/settings/components/types';
import { mergeTemplatesWithDefaults } from '@/app/dashboard/settings/templates/components/email-template-editor/utils';
import { analyzeVariables } from './edit-mail-dialog/hooks/useVariableAnalysis';
import {
  useTemplateEditorState,
  createTemplateEditorHandlers,
} from './edit-mail-dialog/utils';
import { TemplatePreview } from './edit-mail-dialog/components/TemplatePreview';
import { VariableList } from './edit-mail-dialog/components/VariableList';
import { EditorFields } from './edit-mail-dialog/components/EditorFields';

interface EmailTemplateEditorProps {
  onClose: () => void;
}

export default function EmailTemplateEditor({
  onClose,
}: EmailTemplateEditorProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] =
    useState('job-application-hr');
  const [isDemoEnabled, setIsDemoEnabled] = useState(false);

  const editorState = useTemplateEditorState();

  const { data, isLoading, refetch } = useGetMailTemplatesQuery(undefined);
  const [updateEmailTemplates, { isLoading: isUpdating }] =
    useUpdateMailTemplatesMutation();

  useEffect(() => {
    refetch();
  }, [refetch]);

  const initialValues: IEmailTemplatesConfig = useMemo(
    () => ({
      templates: mergeTemplatesWithDefaults({
        defaults: defaultTemplates,
        existing: data,
      }),
    }),
    [data],
  );

  const handleSubmit = async (values: IEmailTemplatesConfig) => {
    try {
      await updateEmailTemplates(values).unwrap();
      toast({
        title: 'Success',
        description: 'Email templates updated successfully',
      });
      refetch();
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update email templates',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, setFieldValue, isSubmitting }) => {
          const variableAnalysis = analyzeVariables(values, selectedTemplate);
          const handlers = createTemplateEditorHandlers(
            editorState,
            selectedTemplate,
            setFieldValue,
            values,
            toast,
          );

          const handleHtmlChange = (value: string | undefined) => {
            const updatedTemplates = {
              ...values.templates,
              [selectedTemplate]: {
                ...values.templates[selectedTemplate],
                html: value || '',
              },
            };
            setFieldValue('templates', updatedTemplates);
          };

          const handleResetTemplate = () => {
            const defaultTemplate = defaultTemplates[selectedTemplate];
            if (defaultTemplate) {
              const updatedTemplates = {
                ...values.templates,
                [selectedTemplate]: { ...defaultTemplate },
              };
              setFieldValue('templates', updatedTemplates);
            }
          };

          return (
            <Form>
              <div className="flex h-full flex-col">
                <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="templateType">
                        Select Template to Edit
                      </Label>
                      <Select
                        value={selectedTemplate}
                        onValueChange={setSelectedTemplate}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(defaultTemplates).map(
                            ([key, template]) => (
                              <SelectItem key={key} value={key}>
                                {template.templateName}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <EditorFields
                      selectedTemplate={selectedTemplate}
                      values={values}
                      activeEditor={editorState.activeEditor}
                      subjectInputRef={editorState.subjectInputRef}
                      onSubjectChange={handlers.handleSubjectChange}
                      onSubjectClick={editorState.handleSubjectClick}
                      onSubjectKeyUp={editorState.handleSubjectKeyUp}
                      onSubjectFocus={editorState.handleSubjectFocus}
                      onHtmlChange={handleHtmlChange}
                      onEditorMount={editorState.handleEditorMount}
                    />

                    <div className="space-y-4 text-sm text-muted-foreground">
                      <div>
                        <p className="mb-2 font-medium">
                          Available Variables:
                          {editorState.activeEditor && (
                            <span className="ml-2 text-xs text-green-600">
                              (Click to insert into{' '}
                              {editorState.activeEditor === 'subject'
                                ? 'subject'
                                : 'HTML editor'}
                              )
                            </span>
                          )}
                          {!editorState.activeEditor && (
                            <span className="ml-2 text-xs text-gray-500">
                              (Click in an editor field first)
                            </span>
                          )}
                        </p>

                        <VariableList
                          variables={variableAnalysis.invalid}
                          activeEditor={editorState.activeEditor}
                          onInsert={handlers.insertVariable}
                          variant="invalid"
                        />

                        <VariableList
                          variables={variableAnalysis.used}
                          activeEditor={editorState.activeEditor}
                          onInsert={handlers.insertVariable}
                          variant="used"
                        />

                        <VariableList
                          variables={variableAnalysis.unused}
                          activeEditor={editorState.activeEditor}
                          onInsert={handlers.insertVariable}
                          variant="unused"
                        />
                      </div>
                    </div>
                  </div>

                  <TemplatePreview
                    selectedTemplate={selectedTemplate}
                    templateName={
                      defaultTemplates[selectedTemplate]?.templateName || ''
                    }
                    values={values}
                    isDemoEnabled={isDemoEnabled}
                    onToggleDemo={() => setIsDemoEnabled((prev) => !prev)}
                    onReset={handleResetTemplate}
                  />
                </div>

                <div className="flex w-full items-center justify-between border-t pt-4">
                  <div className="text-sm text-muted-foreground">
                    {variableAnalysis.invalid.length > 0 && (
                      <p className="text-sm text-red-500">
                        Remove Invalid Variables
                      </p>
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
        }}
      </Formik>
    </div>
  );
}
