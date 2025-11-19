"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChipInput } from "@/components/ui/chip-input";
import {
  Upload,
  X,
  Loader2,
  Mail,
  Paperclip,
  CheckCircle,
  AlertCircle,
  FileText,
  Eye,
  Code,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Editor } from "@monaco-editor/react";
import { useTheme } from "@/components/theme-provider";
import RichTextEditor from "@/components/ui/rte/RichTextEditor";
import { useSelector } from "react-redux";

interface EmailCandidateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: {
    _id: string;
    name: string;
    email: string;
    jobTitle: string;
  };
}

interface FileAttachment {
  file: File;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
  isDefault?: boolean;
  isCustom?: boolean;
}

const MAX_ATTACHMENTS = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function EmailCandidateDialog({
  isOpen,
  onClose,
  candidate,
}: EmailCandidateDialogProps) {
  const { theme } = useTheme();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const { user } = useSelector((state: any) => state.auth || {});

  // Template management
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("none");
  const [templateLoading, setTemplateLoading] = useState(true);
  const [contentMode, setContentMode] = useState<"rich" | "html">("rich");
  const [organizationName, setOrganizationName] = useState("");

  useEffect(() => {
    (async () => {
      if (user) {
        // const user = decryptedResponse.user;
        setUserEmail(user.email);
        setUserName(user.name || user.email);
        setReplyTo(user.email);
        setOrganizationName(user.organizationInfo.name || "HireTrack");
      }
      // }

      // Fetch templates
      try {
        const response = await fetch("/api/settings/templates");
        if (response.ok) {
          const data = await response.json();
          if (data.templates && Object.keys(data.templates).length > 0) {
            const loadedTemplates = Object.values(data.templates).map(
              (template: any) => ({
                id: template.templateId,
                name: template.templateName,
                subject: template.subject,
                content: template.html,
                variables: template.variables || [
                  "SenderName",
                  "ReceiverName",
                  "PortalName",
                ],
                isCustom:
                  !template.templateId.includes("job-application") &&
                  !template.templateId.includes("password-reset") &&
                  !template.templateId.includes("interview-assignment") &&
                  !template.templateId.includes("status-update") &&
                  !template.templateId.includes("new-remark") &&
                  !template.templateId.includes("step-completed") &&
                  !template.templateId.includes("send-otp"),
                isDefault:
                  template.templateId.includes("job-application") ||
                  template.templateId.includes("password-reset") ||
                  template.templateId.includes("interview-assignment") ||
                  template.templateId.includes("status-update") ||
                  template.templateId.includes("new-remark") ||
                  template.templateId.includes("step-completed") ||
                  template.templateId.includes("send-otp"),
              })
            );

            // Filter to show only custom templates (suitable for manual emails to candidates)
            const emailTemplates = loadedTemplates.filter(
              (template: EmailTemplate) => template.isCustom
            );
            setTemplates(emailTemplates);
          }
        }
      } catch (error) {
        console.error("Failed to load templates:", error);
      } finally {
        setTemplateLoading(false);
      }
    })();
  }, []);

  // Replace template variables with actual values
  const replaceVariables = (content: string): string => {
    return content
      .replace(/{{SenderName}}/g, userName || userEmail)
      .replace(/{{ReceiverName}}/g, candidate.name)
      .replace(/{{PortalName}}/g, organizationName)
      .replace(/{{jobTitle}}/g, candidate.jobTitle || "");
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);

    if (templateId === "none") {
      setSubject("");
      setBody("");
      return;
    }

    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSubject(replaceVariables(template.subject));
      setBody(replaceVariables(template.content));
      // Reset to rich text mode when selecting a template for better UX
      setContentMode("rich");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      toast.error(`Maximum ${MAX_ATTACHMENTS} attachments allowed`);
      return;
    }

    const newAttachments: FileAttachment[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 5MB limit`);
        continue;
      }

      newAttachments.push({
        file,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
      });
    }

    if (newAttachments.length > 0) {
      setAttachments([...attachments, ...newAttachments]);
    }

    // Clear the input so the same file can be selected again
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are required");
      return;
    }

    // Clear previous states
    setSending(true);
    setEmailError("");
    setEmailSent(false);

    try {
      let uploadedAttachments: any[] = [];

      // Upload files if there are any
      if (attachments.length > 0) {
        const filePromises = attachments.map(async (att) => {
          const base64Promise = new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(att.file);
          });
          const base64 = await base64Promise;
          return {
            base64,
            fileName: att.fileName,
            mimeType: att.mimeType,
            fileSize: att.fileSize,
          };
        });

        const fileData = await Promise.all(filePromises);

        const uploadResponse = await fetch("/api/file-shares", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            files: fileData,
            shareOptions: {
              isPublic: true,
              expiresInHours: 24 * 30, // 30 days
              metadata: {
                purpose: "email_attachment",
                relatedTo: "email",
                candidateId: candidate._id,
              },
            },
          }),
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || "Failed to upload attachments");
        }

        const uploadResult = await uploadResponse.json();
        uploadedAttachments = uploadResult.files;
      }

      // Send email
      const emailResponse = await fetch("/api/candidates/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candidate._id,
          subject,
          body,
          cc,
          bcc,
          replyTo,
          attachments: uploadedAttachments,
        }),
      });

      const emailResult = await emailResponse.json();

      if (!emailResponse.ok) {
        const errorMsg = emailResult.error || "Failed to send email";
        setEmailError(errorMsg);
        throw new Error(errorMsg);
      }

      setEmailSent(true);
      toast.success("Email sent successfully");

      // Auto-close after a short delay to show success state
      setTimeout(() => {
        onClose();
        // Reset form
        setSubject("");
        setBody("");
        setCc([]);
        setBcc([]);
        setAttachments([]);
        setEmailSent(false);
        setEmailError("");
        setSelectedTemplate("none");
        setContentMode("rich");
      }, 2000);
    } catch (error: any) {
      const errorMsg = error.message || "Failed to send email";
      setEmailError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSending(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-none !w-full !h-full !left-0 !top-0 !translate-x-0 !translate-y-0 min-w-0 lg:!max-w-[70vw] lg:!min-w-[800px] lg:!h-[85vh] lg:!left-[50%] lg:!top-[50%] lg:!translate-x-[-50%] lg:!translate-y-[-50%] xl:!max-w-[60vw] overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pr-12 border-b border-gray-200 dark:border-gray-700 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Mail className="h-6 w-6" />
            Compose and send an email
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            <span className="font-bold">To:</span> {candidate.name} (
            {candidate.email}) | <span className="font-bold">From:</span>{" "}
            {userName} ({userEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Template Selection */}
            {!templateLoading && templates.length > 0 && (
              <div className="space-y-2">
                <Label>Email Template</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedTemplate}
                    onValueChange={handleTemplateSelect}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Choose a template or start from scratch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Start from scratch
                        </div>
                      </SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              {template.name}
                            </div>
                            {template.isCustom && (
                              <Badge variant="secondary" className="ml-2">
                                Custom
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedTemplate !== "none" && (
                  <div className="text-xs text-muted-foreground">
                    Variables will be automatically replaced: SenderName →{" "}
                    {userName}, ReceiverName → {candidate.name}, PortalName →{" "}
                    {organizationName}
                  </div>
                )}
                {selectedTemplate === "none" && contentMode === "html" && (
                  <div className="text-xs text-muted-foreground">
                    💡 Tip: Use "Preview & Edit" mode to see how your email will
                    look while writing, or stay in "Advanced HTML" mode for full
                    control
                  </div>
                )}
                {contentMode === "rich" && selectedTemplate === "none" && (
                  <div className="text-xs text-muted-foreground">
                    💡 Use the formatting toolbar to style your text - bold,
                    italic, lists, and more. No HTML knowledge needed!
                  </div>
                )}
                {contentMode === "rich" && selectedTemplate !== "none" && (
                  <div className="text-xs text-muted-foreground">
                    💡 You're using a pre-designed template. To customize the
                    content, switch to "Advanced HTML" mode.
                  </div>
                )}
              </div>
            )}

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
                              {
                                templates.find((t) => t.id === selectedTemplate)
                                  ?.name
                              }
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
                          💡 This template has professional formatting applied.
                          Switch to "Advanced HTML" mode to modify the template
                          structure.
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

            <div className="space-y-2">
              <Label htmlFor="cc">CC</Label>
              <ChipInput
                value={cc}
                onChange={setCc}
                placeholder="Add email addresses"
                suggestions={[]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bcc">BCC</Label>
              <ChipInput
                value={bcc}
                onChange={setBcc}
                placeholder="Add email addresses"
                suggestions={[]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="replyTo">Reply To</Label>
              <Input
                id="replyTo"
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder={userEmail || "Your email address"}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Attachments ({attachments.length}/{MAX_ATTACHMENTS})
              </Label>

              {attachments.length > 0 && (
                <div className="space-y-2 mb-2">
                  {attachments.map((att, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border rounded-md bg-muted/50"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm truncate">{att.fileName}</span>
                        <span className="text-xs text-muted-foreground">
                          ({formatFileSize(att.fileSize)})
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        disabled={sending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.bmp"
                  disabled={attachments.length >= MAX_ATTACHMENTS}
                />
                <label
                  htmlFor="file-upload"
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer",
                    "hover:bg-accent hover:text-accent-foreground",
                    attachments.length >= MAX_ATTACHMENTS &&
                    "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Upload className="h-4 w-4" />
                  Choose Files
                </label>
                <span className="text-xs text-muted-foreground">
                  Max 5MB per file
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Success/Error Feedback */}
        {(emailSent || emailError) && (
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            {emailSent && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">
                  Email sent successfully!
                </span>
              </div>
            )}
            {emailError && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    Failed to send email
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {emailError}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 bg-background px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            variant="primary"
            disabled={sending || emailSent}
            className={cn(
              "min-w-[120px]",
              emailSent && "bg-green-600 hover:bg-green-700",
              emailError && "bg-red-600 hover:bg-red-700"
            )}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : emailSent ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Sent!
              </>
            ) : emailError ? (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Retry Send
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
