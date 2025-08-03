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
import { Upload, X, Loader2, Mail, Paperclip, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";

interface EmailCandidateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: {
    _id: string;
    name: string;
    email: string;
  };
}

interface FileAttachment {
  file: File;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

const MAX_ATTACHMENTS = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function EmailCandidateDialog({
  isOpen,
  onClose,
  candidate,
}: EmailCandidateDialogProps) {
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

  useEffect(() => {
    // Get current user's email for reply-to field
    (async () => {
      const token = Cookies.get("token");
      if (token) {
        const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
        if (decryptedResponse.success && decryptedResponse.user) {
          const user = decryptedResponse.user;
          setUserEmail(user.email);
          setUserName(user.name || user.email);
          setReplyTo(user.email);
        }
      }
    })();
  }, []);


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
    e.target.value = '';
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
            <span className="font-bold">To:</span> {candidate.name} ({candidate.email}) | <span className="font-bold">From:</span> {userName} ({userEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
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
              <Label htmlFor="body">Message *</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your message here..."
                rows={8}
                className="resize-none"
              />
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
              <Label>Attachments ({attachments.length}/{MAX_ATTACHMENTS})</Label>
              
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
                    attachments.length >= MAX_ATTACHMENTS && "opacity-50 cursor-not-allowed"
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
                <span className="text-sm font-medium">Email sent successfully!</span>
              </div>
            )}
            {emailError && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Failed to send email</div>
                  <div className="text-xs text-muted-foreground mt-1">{emailError}</div>
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