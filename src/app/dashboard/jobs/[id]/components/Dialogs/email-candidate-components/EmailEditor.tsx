import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Code, Edit, FileText } from "lucide-react";
import { Editor } from "@monaco-editor/react";
import RichTextEditor from "@/components/ui/rte/RichTextEditor";
import { EmailTemplate } from "./types";

interface EmailEditorProps {
  subject: string;
  setSubject: (subject: string) => void;
  body: string;
  setBody: (body: string) => void;
  contentMode: "rich" | "html";
  setContentMode: (mode: "rich" | "html") => void;
  selectedTemplate: string;
  setSelectedTemplate: (templateId: string) => void;
  templates: EmailTemplate[];
  theme: string | undefined;
}

export const EmailEditor: React.FC<EmailEditorProps> = ({
  subject,
  setSubject,
  body,
  setBody,
  contentMode,
  setContentMode,
  selectedTemplate,
  setSelectedTemplate,
  templates,
  theme,
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="subject">Subject *</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter email subject"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="body">Message *</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setContentMode(contentMode === "rich" ? "html" : "rich")
              }
            >
              {contentMode === "rich" ? (
                <>
                  <Code className="h-4 w-4 mr-2" />
                  Advanced HTML
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Simple Editor
                </>
              )}
            </Button>
          </div>
        </div>

        {contentMode === "rich" ? (
          <div className="space-y-3">
            {/* Check if using a template */}
            {selectedTemplate !== "none" ? (
              <>
                {/* Template Preview */}
                <div className="border rounded-lg">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 border-b border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                        <FileText className="h-4 w-4" />
                        Using template:{" "}
                        {templates.find((t) => t.id === selectedTemplate)?.name}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate("none");
                          setBody("");
                        }}
                        className="text-xs"
                      >
                        Remove Template
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 bg-white max-h-[300px] overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: body }} />
                  </div>
                  <div className="p-3 bg-white dark:bg-black border-t text-xs text-muted-foreground">
                    💡 This template has professional formatting applied. Switch
                    to "Advanced HTML" mode to modify the template structure.
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Rich Text Editor for non-template emails */}
                <div className="border rounded-lg">
                  <div className="bg-white dark:bg-black p-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Edit className="h-4 w-4" />
                      Compose Your Email
                    </div>
                  </div>
                  <RichTextEditor
                    value={body}
                    onChange={(value) => setBody(value)}
                    placeholder="Type your email message here... Use the formatting toolbar above to style your text."
                    className="min-h-[300px]"
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Editor
              height="300px"
              language="html"
              theme={theme === "dark" ? "vs-dark" : "vs"}
              value={body}
              onChange={(value) => setBody(value || "")}
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
    </div>
  );
};

