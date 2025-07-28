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

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
}

const defaultTemplates: EmailTemplate[] = [
  {
    id: "job-application-hr",
    name: "Job Application (HR Notification)",
    subject: "New Job Application - {{jobTitle}}",
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin-top: 0;">New Job Application Received</h2>
        <p style="margin: 0 0 15px 0;">A new application has been submitted for the following position:</p>

        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Position:</strong> {{jobTitle}}</p>
            <p style="margin: 5px 0;"><strong>Candidate:</strong> {{candidateName}}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> {{candidateEmail}}</p>
            <p style="margin: 5px 0;"><strong>Phone:</strong> {{candidatePhone}}</p>
            <p style="margin: 5px 0;"><strong>Application Date:</strong> {{applicationDate}}</p>
        </div>

        <p style="margin: 15px 0;">Please review the application in the dashboard.</p>
        <p style="margin: 15px 0;"><a href="{{dashboardLink}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Application</a></p>
    </div>
</div>`,
    variables: [
      "jobTitle",
      "candidateName",
      "candidateEmail",
      "candidatePhone",
      "applicationDate",
      "dashboardLink",
    ],
  },
  {
    id: "password-reset",
    name: "Password Reset Request",
    subject: "Password Reset Request - {{organizationName}}",
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Password Reset Request</h2>
        <p style="margin: 0 0 15px 0;">Hello {{userName}},</p>

        <p style="margin: 0 0 15px 0;">We received a request to reset your password for your {{organizationName}} account.</p>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0 0 10px 0;"><strong>If you requested this password reset:</strong></p>
            <p style="margin: 0;">Click the button below to reset your password. This link will expire in 24 hours.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{resetLink}}" style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>

        <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #17a2b8;">
            <p style="margin: 0 0 10px 0;"><strong>If you didn't request this:</strong></p>
            <p style="margin: 0;">Please ignore this email. Your password will remain unchanged.</p>
        </div>

        <p style="margin: 15px 0 0 0;">Best regards,<br>{{organizationName}} Team</p>
    </div>
</div>`,
    variables: ["userName", "organizationName", "resetLink"],
  },
  {
    id: "interview-assignment",
    name: "Interview Assignment Event",
    subject: "Interview Assigned - {{candidateName}} for {{jobTitle}}",
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Interview Assignment</h2>
        <p style="margin: 0 0 15px 0;">Hello {{interviewerName}},</p>

        <p style="margin: 0 0 15px 0;">You have been assigned to conduct an interview for the following candidate:</p>

        <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #dee2e6;">
            <h3 style="margin-top: 0; color: #495057;">Interview Details</h3>
            <p style="margin: 5px 0;"><strong>Candidate:</strong> {{candidateName}}</p>
            <p style="margin: 5px 0;"><strong>Position:</strong> {{jobTitle}}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> {{interviewDate}}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> {{interviewTime}}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> {{duration}}</p>
            <p style="margin: 5px 0;"><strong>Type:</strong> {{interviewType}}</p>
            <p style="margin: 5px 0;"><strong>Meeting Link:</strong> <a href="{{meetingLink}}" style="color: #007bff; text-decoration: underline;">{{meetingLink}}</a></p>
        </div>

        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
            <p style="margin: 0 0 10px 0;"><strong>Next Steps:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li style="margin: 5px 0;">Review the candidate's profile and resume</li>
                <li style="margin: 5px 0;">Prepare interview questions</li>
                <li style="margin: 5px 0;">Join the meeting at the scheduled time</li>
                <li style="margin: 5px 0;">Submit feedback after the interview</li>
            </ul>
        </div>

        <div style="text-align: center; margin: 20px 0;">
            <a href="{{candidateProfileLink}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px; display: inline-block;">View Candidate</a>
            <a href="{{dashboardLink}}" style="background-color: #6c757d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Dashboard</a>
        </div>

        <p style="margin: 15px 0 0 0;">Best regards,<br>{{organizationName}} Hiring Team</p>
    </div>
</div>`,
    variables: [
      "interviewerName",
      "candidateName",
      "jobTitle",
      "interviewDate",
      "interviewTime",
      "duration",
      "interviewType",
      "meetingLink",
      "candidateProfileLink",
      "dashboardLink",
      "organizationName",
    ],
  },
  {
    id: "status-update",
    name: "Status Update Notification",
    subject: "Application Status Update - {{jobTitle}}",
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Application Status Update</h2>
        <p style="margin: 0 0 15px 0;">Dear {{candidateName}},</p>

        <p style="margin: 0 0 15px 0;">We wanted to update you on the status of your application for the <strong>{{jobTitle}}</strong> position at {{organizationName}}.</p>

        <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #dee2e6;">
            <h3 style="margin-top: 0; color: #495057;">Current Status</h3>
            <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #0056b3;">{{newStatus}}</p>
            </div>
            <p style="margin: 15px 0 0 0;">{{statusMessage}}</p>
        </div>

        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
            <p style="margin: 0 0 10px 0;"><strong>Next Steps:</strong></p>
            <p style="margin: 0;">{{nextSteps}}</p>
        </div>

        <p style="margin: 15px 0;">Thank you for your continued interest in joining our team. If you have any questions, please don't hesitate to reach out.</p>

        <p style="margin: 15px 0 0 0;">Best regards,<br>{{organizationName}} Hiring Team<br>{{hrContactInfo}}</p>
    </div>
</div>`,
    variables: [
      "candidateName",
      "jobTitle",
      "organizationName",
      "newStatus",
      "statusMessage",
      "nextSteps",
      "hrContactInfo",
    ],
  },
  {
    id: "new-remark",
    name: "New Remark Added",
    subject: "New Feedback Added - {{candidateName}}",
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-top: 0;">New Feedback Added</h2>
        <p style="margin: 0 0 15px 0;">Hello {{recipientName}},</p>

        <p style="margin: 0 0 15px 0;">New feedback has been added for candidate <strong>{{candidateName}}</strong> applying for the <strong>{{jobTitle}}</strong> position.</p>

        <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #dee2e6;">
            <h3 style="margin-top: 0; color: #495057;">Feedback Details</h3>
            <p style="margin: 5px 0;"><strong>Added by:</strong> {{reviewerName}}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> {{remarkDate}}</p>
            <p style="margin: 5px 0;"><strong>Rating:</strong> {{rating}}/5</p>

            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Comments:</strong></p>
                <p style="margin: 0;">{{remarkText}}</p>
            </div>
        </div>

        <div style="text-align: center; margin: 20px 0;">
            <a href="{{candidateProfileLink}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Full Profile</a>
        </div>

        <p style="margin: 15px 0 0 0;">Best regards,<br>{{organizationName}} Team</p>
    </div>
</div>`,
    variables: [
      "recipientName",
      "candidateName",
      "jobTitle",
      "reviewerName",
      "remarkDate",
      "rating",
      "remarkText",
      "candidateProfileLink",
      "organizationName",
    ],
  },
  {
    id: "step-completed",
    name: "Step Completed",
    subject: "Interview Step Completed - {{candidateName}}",
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Interview Step Completed</h2>
        <p style="margin: 0 0 15px 0;">Hello {{recipientName}},</p>

        <p style="margin: 0 0 15px 0;">An interview step has been completed for candidate <strong>{{candidateName}}</strong> applying for the <strong>{{jobTitle}}</strong> position.</p>

        <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #dee2e6;">
            <h3 style="margin-top: 0; color: #495057;">Completed Step</h3>
            <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;">
                <p style="margin: 0; font-weight: bold; color: #155724;">{{stepName}}</p>
                <p style="margin: 5px 0 0 0;">Completed by: {{completedBy}}</p>
                <p style="margin: 5px 0 0 0;">Date: {{completionDate}}</p>
            </div>
        </div>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0 0 10px 0;"><strong>Feedback:</strong></p>
            <p style="margin: 0;">{{feedback}}</p>
        </div>

        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
            <p style="margin: 0;"><strong>Next Step:</strong> {{nextStep}}</p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
            <a href="{{candidateProfileLink}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Candidate Progress</a>
        </div>

        <p style="margin: 15px 0 0 0;">Best regards,<br>{{organizationName}} Team</p>
    </div>
</div>`,
    variables: [
      "recipientName",
      "candidateName",
      "jobTitle",
      "stepName",
      "completedBy",
      "completionDate",
      "feedback",
      "nextStep",
      "candidateProfileLink",
      "organizationName",
    ],
  },
  {
    id: "send-otp",
    name: "Send OTP",
    subject: "Your OTP Code - {{organizationName}}",
    content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-top: 0;">OTP Verification</h2>
        <p style="margin: 0 0 15px 0;">Hello {{userName}},</p>

        <p style="margin: 0 0 15px 0;">You have requested a One-Time Password (OTP) for your {{organizationName}} account verification.</p>

        <div style="background-color: white; padding: 30px; border-radius: 5px; margin: 30px 0; border: 2px solid #007bff; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Your OTP Code</p>
            <p style="margin: 15px 0 0 0; font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 8px; font-family: 'Courier New', monospace;">{{otpCode}}</p>
        </div>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0 0 10px 0;"><strong>Important:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li style="margin: 5px 0;">This OTP is valid for {{expirationTime}} minutes only</li>
                <li style="margin: 5px 0;">Do not share this code with anyone</li>
                <li style="margin: 5px 0;">If you didn't request this OTP, please ignore this email</li>
            </ul>
        </div>

        <p style="margin: 15px 0;">If you're having trouble accessing your account, please contact our support team.</p>

        <p style="margin: 15px 0 0 0;">Best regards,<br>{{organizationName}} Security Team</p>
    </div>
</div>`,
    variables: ["userName", "organizationName", "otpCode", "expirationTime"],
  },
];

export default function EmailTemplatesPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([...defaultTemplates]);
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
        const data = await response.json();
        if (data.templates && data.templates.length > 0) {
          setTemplates(data.templates);
        }
      }
    } catch (error) {
      console.error("Failed to load email templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates }),
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
        prev.map((template) =>
          template.id === id ? resetTemplate : template
        )
      );
      toast.success("Template reset to default");
    } else {
      toast.error("Default template not found");
    }
  };

  const getCurrentTemplate = () => {
    const current = templates.find((t) => t.id === selectedTemplate);
    if (!current && templates.length > 0) {
      return templates[0];
    }
    return current || defaultTemplates[0];
  };

  const renderPreview = (content: string) => {
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
                {templates.map((template) => (
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
                ))}
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
                          __html: renderPreview(currentTemplate.content),
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
                  {currentTemplate.variables.map((variable) => (
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
