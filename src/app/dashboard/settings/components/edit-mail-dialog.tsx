"use client";
import { useState, useEffect, useRef } from "react";
import type React from "react";

import { Mail, RotateCcw, AlertTriangle, Eye, EyeClosed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Editor } from "@monaco-editor/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Form, Formik } from "formik";
import {
  useGetMailTemplatesQuery,
  useUpdateMailTemplatesMutation,
} from "@/lib/features/settings/settingsApi";
import { Data, defaultTemplates, editorOptions } from "@/lib/constants";
import type { IEmailTemplatesConfig } from "./types";

export default function EmailTemplateEditor({
  onClose,
}: {
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState(
    "job-application-(hr)"
  );
  const [previewData] = useState(Data);
  const [activeEditor, setActiveEditor] = useState<"subject" | "html" | null>(
    null
  );
  const [isDemoEnabled, setIsDemoEnabled] = useState(false);

  // Refs for tracking cursor positions
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);
  const subjectCursorPosition = useRef<number>(0);

  const { data, isLoading, refetch } = useGetMailTemplatesQuery(undefined);
  const [updateEmailTemplates, { isLoading: isUpdating }] =
    useUpdateMailTemplatesMutation();

  useEffect(() => {
    refetch();
  }, []);

  // Initialize templates with defaults if not present
  const initializeTemplates = (existingData: any) => {
    const templates = existingData?.templates || {};
    const initializedTemplates = { ...defaultTemplates };

    // Override with existing templates if they exist
    Object.keys(defaultTemplates).forEach((key) => {
      if (templates[key]) {
        initializedTemplates[key] = templates[key];
      }
    });

    return initializedTemplates;
  };

  const initialValues: IEmailTemplatesConfig = {
    templates: initializeTemplates(data),
  };

  // Function to extract variables from template content
  const extractVariablesFromContent = (content: string): string[] => {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const matches = [];
    let match;
    while ((match = variableRegex.exec(content)) !== null) {
      matches.push(match[1].trim());
    }
    return [...new Set(matches)]; // Remove duplicates
  };

  // Function to analyze variable usage
  const analyzeVariableUsage = (values: IEmailTemplatesConfig) => {
    const currentTemplate = values.templates[selectedTemplate];
    if (!currentTemplate) return { used: [], unused: [], invalid: [] };

    const availableVariables =
      defaultTemplates[selectedTemplate]?.variables || [];
    const subjectContent = currentTemplate.subject || "";
    const htmlContent = currentTemplate.html || "";
    const allContent = subjectContent + " " + htmlContent;

    // Extract all variables used in the template
    const usedVariables = extractVariablesFromContent(allContent);

    // Categorize variables
    const used = availableVariables.filter((variable) =>
      usedVariables.includes(variable)
    );
    const unused = availableVariables.filter(
      (variable) => !usedVariables.includes(variable)
    );
    const invalid = usedVariables.filter(
      (variable) => !availableVariables.includes(variable)
    );

    return { used, unused, invalid };
  };

  const handleSubmit = async (values: IEmailTemplatesConfig) => {
    try {
      await updateEmailTemplates(values).unwrap();
      toast({
        title: "Success",
        description: "Email templates updated successfully",
      });
      refetch();
      onClose();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update email templates",
        variant: "destructive",
      });
    }
  };

  const handleResetTemplate = (
    setFieldValue: any,
    values: IEmailTemplatesConfig
  ) => {
    const defaultTemplate = defaultTemplates[selectedTemplate];
    if (defaultTemplate) {
      const updatedTemplates = {
        ...values.templates,
        [selectedTemplate]: {
          ...defaultTemplate,
        },
      };
      setFieldValue("templates", updatedTemplates);
    }
  };

  // Handle subject input events
  const handleSubjectFocus = () => {
    setActiveEditor("subject");
  };

  const handleSubjectClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    subjectCursorPosition.current = target.selectionStart || 0;
    setActiveEditor("subject");
  };

  const handleSubjectKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    subjectCursorPosition.current = target.selectionStart || 0;
  };

  const handleSubjectChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFieldValue: any,
    values: IEmailTemplatesConfig
  ) => {
    const target = e.target;
    subjectCursorPosition.current = target.selectionStart || 0;

    const updatedTemplates = {
      ...values.templates,
      [selectedTemplate]: {
        ...values.templates[selectedTemplate],
        subject: e.target.value,
      },
    };
    setFieldValue("templates", updatedTemplates);
  };

  // Handle Monaco editor events
  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Set active editor when Monaco editor is focused
    editor.onDidFocusEditorText(() => {
      setActiveEditor("html");
    });

    // Track cursor position changes
    editor.onDidChangeCursorPosition(() => {
      setActiveEditor("html");
    });
  };

  // Insert variable at cursor position
  const insertVariable = (
    variable: string,
    setFieldValue: any,
    values: IEmailTemplatesConfig
  ) => {
    const variableText = `{{${variable}}}`;

    if (activeEditor === "subject") {
      // Handle subject input insertion
      const input = subjectInputRef.current;
      if (!input) {
        toast({
          title: "Error",
          description: "Subject input not found",
          variant: "destructive",
        });
        return;
      }

      const currentValue = values.templates[selectedTemplate]?.subject || "";
      const startPos = subjectCursorPosition.current;
      const newValue =
        currentValue.slice(0, startPos) +
        variableText +
        currentValue.slice(startPos);

      // Update the value
      const updatedTemplates = {
        ...values.templates,
        [selectedTemplate]: {
          ...values.templates[selectedTemplate],
          subject: newValue,
        },
      };
      setFieldValue("templates", updatedTemplates);

      // Set cursor position after the inserted text
      setTimeout(() => {
        const newCursorPos = startPos + variableText.length;
        input.focus();
        input.setSelectionRange(newCursorPos, newCursorPos);
        subjectCursorPosition.current = newCursorPos;
      }, 0);
    } else if (activeEditor === "html") {
      // Handle Monaco editor insertion
      const editor = editorRef.current;
      if (!editor) {
        toast({
          title: "Error",
          description: "HTML editor not found",
          variant: "destructive",
        });
        return;
      }

      const position = editor.getPosition();
      if (!position) {
        toast({
          title: "Error",
          description: "Could not get cursor position",
          variant: "destructive",
        });
        return;
      }

      // Insert text at current position
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      };

      editor.executeEdits("insert-variable", [
        {
          range: range,
          text: variableText,
        },
      ]);

      // Move cursor to end of inserted text
      const newPosition = {
        lineNumber: position.lineNumber,
        column: position.column + variableText.length,
      };
      editor.setPosition(newPosition);
      editor.focus();
    } else {
      toast({
        title: "No editor selected",
        description:
          "Please click in the subject field or HTML editor first, then try again",
        variant: "destructive",
      });
    }
  };

  const processTemplate = (template: string, data: typeof previewData) => {
    if (!isDemoEnabled) return template;
    let processed = template;
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      processed = processed.replace(regex, value);
    });
    return processed;
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ values, handleSubmit, setFieldValue, isSubmitting }) => {
        const variableAnalysis = analyzeVariableUsage(values);

        return (
          <Form onSubmit={handleSubmit}>
            <div className="flex flex-col max-h-[95vh]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(95vh-120px)]">
                <div className="space-y-4 overflow-y-auto p-2">
                  <div className="space-y-2">
                    <Label htmlFor="templateType">
                      Select Template to Edit
                    </Label>
                    <select
                      id="templateType"
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="border rounded p-2 w-full"
                    >
                      {Object.entries(defaultTemplates).map(
                        ([key, template]) => (
                          <option key={key} value={key}>
                            {template.templateName}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">
                      Email Subject
                      {activeEditor === "subject" && (
                        <span className="text-xs text-green-600 ml-2 font-medium">
                          ● Active
                        </span>
                      )}
                    </Label>
                    <Input
                      ref={subjectInputRef}
                      id="subject"
                      value={values.templates[selectedTemplate]?.subject || ""}
                      onChange={(e) =>
                        handleSubjectChange(e, setFieldValue, values)
                      }
                      onClick={handleSubjectClick}
                      onKeyUp={handleSubjectKeyUp}
                      onFocus={handleSubjectFocus}
                      placeholder="Enter email subject"
                      className={activeEditor === "subject" ? "" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      HTML Content
                      {activeEditor === "html" && (
                        <span className="text-xs text-green-600 ml-2 font-medium">
                          ● Active
                        </span>
                      )}
                    </Label>
                    <div
                      className={`border rounded-md ${activeEditor === "html" ? "" : ""}`}
                    >
                      <Editor
                        height="400px"
                        defaultLanguage="html"
                        value={values.templates[selectedTemplate]?.html || ""}
                        onChange={(value) => {
                          const updatedTemplates = {
                            ...values.templates,
                            [selectedTemplate]: {
                              ...values.templates[selectedTemplate],
                              html: value || "",
                            },
                          };
                          setFieldValue("templates", updatedTemplates);
                        }}
                        onMount={handleEditorMount}
                        options={{
                          ...editorOptions,
                          selectOnLineNumbers: true,
                          roundedSelection: false,
                          readOnly: false,
                          cursorStyle: "line",
                          automaticLayout: true,
                        }}
                        theme="vs-light"
                      />
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-4">
                    {/* Available Variables Section */}
                    <div>
                      <p className="font-medium mb-2">
                        Available Variables:
                        {activeEditor && (
                          <span className="text-xs text-green-600 ml-2">
                            (Click to insert into{" "}
                            {activeEditor === "subject"
                              ? "subject"
                              : "HTML editor"}
                            )
                          </span>
                        )}
                        {!activeEditor && (
                          <span className="text-xs text-gray-500 ml-2">
                            (Click in an editor field first)
                          </span>
                        )}
                      </p>

                      {/* Used Variables - Green */}
                      {variableAnalysis.used.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-green-700 mb-1">
                            ✓ Used Variables ({variableAnalysis.used.length})
                          </p>
                          <div className="flex gap-2 text-xs flex-wrap">
                            {variableAnalysis.used.map((variable) => (
                              <button
                                key={variable}
                                type="button"
                                onClick={() =>
                                  insertVariable(
                                    variable,
                                    setFieldValue,
                                    values
                                  )
                                }
                                className={`border px-3 py-2 rounded-md transition-all duration-200 font-mono ${
                                  activeEditor
                                    ? "hover:bg-green-100 hover:border-green-500 hover:shadow-sm cursor-pointer border-green-300 bg-green-50 text-green-800"
                                    : "cursor-not-allowed opacity-50 bg-green-50 text-green-400 border-green-200"
                                }`}
                                disabled={!activeEditor}
                                title={
                                  activeEditor
                                    ? `Click to insert {{${variable}}} at cursor position`
                                    : "Select an editor first"
                                }
                              >
                                {`{{${variable}}}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Unused Variables - Gray */}
                      {variableAnalysis.unused.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-600 mb-1">
                            ○ Unused Variables ({variableAnalysis.unused.length}
                            )
                          </p>
                          <div className="flex gap-2 text-xs flex-wrap">
                            {variableAnalysis.unused.map((variable) => (
                              <button
                                key={variable}
                                type="button"
                                onClick={() =>
                                  insertVariable(
                                    variable,
                                    setFieldValue,
                                    values
                                  )
                                }
                                className={`border px-3 py-2 rounded-md transition-all duration-200 font-mono ${
                                  activeEditor
                                    ? "hover:bg-gray-100 hover:border-gray-400 hover:shadow-sm cursor-pointer border-gray-300 bg-gray-50 text-gray-700"
                                    : "cursor-not-allowed opacity-50 bg-gray-50 text-gray-400 border-gray-200"
                                }`}
                                disabled={!activeEditor}
                                title={
                                  activeEditor
                                    ? `Click to insert {{${variable}}} at cursor position`
                                    : "Select an editor first"
                                }
                              >
                                {`{{${variable}}}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Invalid Variables Section - Red and Non-clickable */}
                    {variableAnalysis.invalid.length > 0 && (
                      <div className="border-t pt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <p className="font-medium text-red-700">
                            Invalid Variables Found (
                            {variableAnalysis.invalid.length})
                          </p>
                        </div>
                        <div className="flex gap-2 text-xs flex-wrap">
                          {variableAnalysis.invalid.map((variable) => (
                            <div
                              key={variable}
                              className="border px-3 py-2 rounded-md font-mono cursor-not-allowed border-red-300 bg-red-50 text-red-700 opacity-75"
                              title={`Invalid variable: {{${variable}}} is not available for this template`}
                            >
                              {`{{${variable}}}`}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-red-600 mt-2">
                          Remove these variables from your template or they will
                          not be replaced with actual values.
                        </p>
                      </div>
                    )}
                  </div>

                 
                </div>

                <div className="space-y-4 overflow-hidden">
                  <div className="text-sm text-muted-foreground mb-2 flex justify-between items-end">
                    <p>
                      <strong>Template:</strong>{" "}
                      {defaultTemplates[selectedTemplate]?.templateName}
                    </p>
                    <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={isDemoEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsDemoEnabled((prev) => !prev)}
                      className="flex items-center gap-1"
                    >
                      {!isDemoEnabled ? <EyeClosed /> : <Eye />}{"Preview"} 
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetTemplate(setFieldValue, values)}
                      className="flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset to Default
                    </Button>
                   
                    </div>
                  </div>

                  <Card className="h-[calc(100%-60px)] overflow-hidden">
                    <CardContent className="p-0 h-full flex flex-col">
                      <div className="bg-gray-100 p-4 border-b">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4" />
                          <span className="font-medium">Subject:</span>
                          <span>
                            {processTemplate(
                              values.templates[selectedTemplate]?.subject || "",
                              previewData
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        <iframe
                          srcDoc={processTemplate(
                            values.templates[selectedTemplate]?.html || "",
                            previewData
                          )}
                          className="w-full h-full border-none"
                          title="Email Preview"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="w-full flex justify-between items-center pt-4 border-t">
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
                    disabled={
                      isSubmitting ||
                      isUpdating ||
                      variableAnalysis.invalid.length > 0
                    } 
                  >
                    {isSubmitting || isUpdating
                      ? "Saving..."
                      : "Save Templates"}
                  </Button>
                </div>
              </div>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
