import React from "react";
import { Code, Eye, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Editor } from "@monaco-editor/react";
import { EmailTemplate } from "../types";

interface TemplateEditorProps {
  currentTemplate: EmailTemplate;
  updateTemplate: (
    id: string,
    field: keyof EmailTemplate,
    value: string
  ) => void;
  resetToDefault: (id: string) => void;
  previewMode: boolean;
  setPreviewMode: (mode: boolean) => void;
  renderPreview: (content: string, variables: string[]) => string;
  theme: string | undefined;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  currentTemplate,
  updateTemplate,
  resetToDefault,
  previewMode,
  setPreviewMode,
  renderPreview,
  theme,
}) => {
  return (
    <div className="lg:col-span-2 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              {currentTemplate.name}
            </CardTitle>
            <div className="flex gap-2">
              {currentTemplate.isDefault && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resetToDefault(currentTemplate.id)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Default
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
              >
                {previewMode ? (
                  <Code className="h-4 w-4 mr-2" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                {previewMode ? "Edit" : "Preview"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subject Line */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line</Label>
            <Input
              id="subject"
              value={currentTemplate.subject}
              onChange={(e) =>
                updateTemplate(currentTemplate.id, "subject", e.target.value)
              }
              placeholder="Email subject line"
            />
          </div>

          {/* Content Editor */}
          <div className="space-y-2">
            <Label>Email Content</Label>
            {previewMode ? (
              <div className="border rounded-lg p-4 min-h-[400px] bg-white">
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderPreview(
                      currentTemplate.content,
                      currentTemplate.variables
                    ),
                  }}
                />
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Editor
                  height="400px"
                  language="html"
                  theme={theme === "dark" ? "vs-dark" : "vs"}
                  value={currentTemplate.content}
                  onChange={(value) =>
                    updateTemplate(currentTemplate.id, "content", value || "")
                  }
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    lineNumbers: "on",
                    folding: true,
                    automaticLayout: true,
                  }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
