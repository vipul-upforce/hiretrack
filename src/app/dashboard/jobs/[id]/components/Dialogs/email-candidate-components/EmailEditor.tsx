import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Code, Edit, FileText } from "lucide-react";
import { Editor } from "@monaco-editor/react";
import RichTextEditor from "@/components/ui/rte/RichTextEditor";
import { EmailTemplate } from "./types";
import { TemplateVisualEditor } from "./TemplateVisualEditor";

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
                {/* Template Visual Editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Using template:{" "}
                      <span className="font-semibold">
                        {templates.find((t) => t.id === selectedTemplate)?.name}
                      </span>
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
                  <TemplateVisualEditor
                    key={selectedTemplate}
                    htmlContent={body}
                    onContentChange={setBody}
                    className="min-h-[300px]"
                  />
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

