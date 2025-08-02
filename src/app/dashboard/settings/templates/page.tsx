"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Save,
  Mail,
  FileText,
  Home,
  ChevronRight,
  Eye,
  Code,
  Send,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { Editor } from "@monaco-editor/react";
import Link from "next/link";
import { defaultTemplates, EmailTemplate } from "@/lib/constants";

export default function EmailTemplatesPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([
    ...defaultTemplates,
  ]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<string>("job-application-hr");
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);
  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/settings/templates");
      if (response.ok) {
        debugger;
        const data = await response.json();
        if (
          data.templates &&
          typeof data.templates === "object" &&
          Object.keys(data.templates).length > 0
        ) {
          const arr = Object.values(data.templates).map((template: any) => {
            const defaultTemplate = defaultTemplates.find(
              (t) => t.id === (template.templateId || template.id)
            );
            return {
              id: template.templateId || template.id,
              name: template.templateName || template.name,
              subject: template.subject,
              content: template.html || template.content,
              variables:
                Array.isArray(template.variables) &&
                template.variables.length > 0 &&
                template.variables.every((v: string) => v.trim())
                  ? template.variables
                  : defaultTemplate?.variables || [],
            };
          });
          setTemplates(arr);
        } else {
          setTemplates([...defaultTemplates]);
        }
      } else {
        toast.error(`Failed to load templates: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to load email templates:", error);
      toast.error("An error occurred while loading templates");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const template of templates) {
        if (!template.subject.trim() || !template.content.trim()) {
          toast.error(
            `Template "${template.name}" has empty subject or content`
          );
          return;
        }
      }
      // Transform templates to match API expected format
      const templatesPayload = {};
      templates.forEach((template, index) => {
        templatesPayload[template.id] = {
          templateId: template.id,
          templateName: template.name,
          subject: template.subject,
          html: template.content,
          variables: template.variables, // Include variables
        };
      });

      const response = await fetch("/api/settings/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templatesPayload),
      });

      if (response.ok) {
        toast.success("Email templates saved successfully");
        // Refresh templates to get updated data
        await fetchTemplates();
      } else {
        toast.error("Failed to save email templates");
      }
    } catch (error) {
      toast.error("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = (
    id: string,
    field: keyof EmailTemplate,
    value: string
  ) => {
    setTemplates((prev) =>
      prev.map((template) =>
        template.id === id ? { ...template, [field]: value } : template
      )
    );
  };

  const resetToDefault = (id: string) => {
    const defaultTemplate = defaultTemplates.find((t) => t.id === id);
    if (defaultTemplate) {
      // Create a deep copy of the default template
      const resetTemplate = JSON.parse(JSON.stringify(defaultTemplate));
      setTemplates((prev) =>
        prev.map((template) => (template.id === id ? resetTemplate : template))
      );
      toast.success("Template reset to default");
    } else {
      toast.error("Default template not found");
    }
  };

  const getCurrentTemplate = () => {
    debugger;
    const current = templates.find((t) => t.id === selectedTemplate);
    if (!current && templates.length > 0) {
      return templates[0];
    }
    return current || defaultTemplates[0];
  };

  const renderPreview = (content: string, variables: string[]) => {
    // Replace variables with sample data for preview
    const sampleData = {
      organizationName: "Acme Corporation",
      candidateName: "John Doe",
      candidateEmail: "john.doe@email.com",
      candidatePhone: "+1 (555) 123-4567",
      jobTitle: "Senior Frontend Developer",
      applicationDate: "January 15, 2024",
      dashboardLink: "https://app.company.com/dashboard",
      userName: "John Doe",
      resetLink: "https://app.company.com/reset-password?token=abc123",
      interviewerName: "Jane Smith",
      interviewDate: "January 22, 2024",
      interviewTime: "2:00 PM",
      duration: "45 minutes",
      interviewType: "Technical Interview",
      meetingLink: "https://meet.company.com/interview-123",
      candidateProfileLink: "https://app.company.com/candidates/123",
      newStatus: "Interview Scheduled",
      statusMessage: "Your interview has been scheduled for next week.",
      nextSteps:
        "Please prepare for the technical interview and review the job requirements.",
      hrContactInfo: "hr@company.com | +1 (555) 987-6543",
      recipientName: "Jane Smith",
      reviewerName: "Mike Johnson",
      remarkDate: "January 20, 2024",
      rating: "4",
      remarkText:
        "Strong technical skills demonstrated during the initial screening. Good communication abilities.",
      stepName: "Technical Interview",
      completedBy: "Jane Smith",
      completionDate: "January 20, 2024",
      feedback:
        "Candidate showed excellent problem-solving skills and technical knowledge.",
      nextStep: "Final Interview with Hiring Manager",
      otpCode: "123456",
      expirationTime: "15",
    };
    // Check for missing variables
    const missingVariables = variables.filter(
      (variable) => !(variable in sampleData)
    );
    if (missingVariables.length > 0) {
      toast.warning(
        `Missing sample data for variables: ${missingVariables.join(", ")}`
      );
    }

    let previewContent = content;
    Object.entries(sampleData).forEach(([key, value]) => {
      previewContent = previewContent.replace(
        new RegExp(`{{${key}}}`, "g"),
        value
      );
    });

    return previewContent;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading email templates...</p>
        </div>
      </div>
    );
  }

  const currentTemplate = getCurrentTemplate();
  return (
    <div className="h-screen flex flex-col overflow-hidden w-full">
      {/* Header section with improved design and breadcrumbs */}
      <div className="flex-shrink-0 px-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-y-2 py-3 px-0">
            {/* Title and Breadcrumbs */}
            <div className="flex flex-col gap-2">
              {/* Breadcrumbs */}
              <nav className="flex items-center text-sm text-muted-foreground font-medium">
                <Link
                  href="/dashboard"
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
                <ChevronRight className="h-4 w-4 mx-2" />
                <Link
                  href="/dashboard/settings"
                  className="hover:text-foreground transition-colors"
                >
                  Settings
                </Link>
                <ChevronRight className="h-4 w-4 mx-2" />
                <span className="text-foreground font-semibold">
                  Email Templates
                </span>
              </nav>
            </div>

            {/* Right Section - Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="flex-1 min-h-0 px-4 pb-4 mt-4 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Template List */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Templates
                </CardTitle>
                <CardDescription>
                  Select a template to customize
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {templates.map((template) => {
                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all hover:bg-accent",
                        selectedTemplate === template.id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      )}
                    >
                      <div className="font-medium text-sm">{template.name}</div>
                      <div className="text-xs text-muted-foreground truncate mt-1">
                        {template.subject}
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Editor */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    {currentTemplate.name}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetToDefault(currentTemplate.id)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to Default
                    </Button>
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
                      updateTemplate(
                        currentTemplate.id,
                        "subject",
                        e.target.value
                      )
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
                          updateTemplate(
                            currentTemplate.id,
                            "content",
                            value || ""
                          )
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

          {/* Template Variables */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Available Variables
                </CardTitle>
                <CardDescription>
                  Use these variables in your template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {currentTemplate?.variables?.map((variable) => (
                    <div
                      key={variable}
                      className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                    >
                      <code className="font-mono">{`{{${variable}}}`}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(`{{${variable}}}`);
                          toast.success("Variable copied to clipboard");
                        }}
                        className="h-6 px-2"
                      >
                        Copy
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Template Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="font-medium">Template Usage</div>
                  <div className="text-muted-foreground mt-1">
                    This template is automatically sent when candidates apply
                    for positions.
                  </div>
                </div>
                <div>
                  <div className="font-medium">Styling Guidelines</div>
                  <div className="text-muted-foreground mt-1">
                    Use inline CSS styles for maximum email client
                    compatibility. Avoid external stylesheets or CSS variables.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
