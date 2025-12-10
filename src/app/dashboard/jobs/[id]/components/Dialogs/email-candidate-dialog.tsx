'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/components/theme-provider';
import { useSelector } from 'react-redux';

// Import sub-components
import logger from '@/lib/logger';
import { EmailTemplateSelector } from './email-candidate-components/EmailTemplateSelector';
import { EmailEditor } from './email-candidate-components/EmailEditor';
import { EmailRecipients } from './email-candidate-components/EmailRecipients';
import { EmailAttachments } from './email-candidate-components/EmailAttachments';
import { EmailDialogFooter } from './email-candidate-components/EmailDialogFooter';
import { EmailTemplate, FileAttachment } from './email-candidate-components/types';

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

export function EmailCandidateDialog({
  isOpen,
  onClose,
  candidate,
}: EmailCandidateDialogProps) {
  const { theme } = useTheme();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const { user } = useSelector((state: any) => state.auth || {});

  // Template management
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('none');
  const [templateLoading, setTemplateLoading] = useState(true);
  const [contentMode, setContentMode] = useState<'rich' | 'html'>('rich');
  const [organizationName, setOrganizationName] = useState('');

  useEffect(() => {
    (async () => {
      if (user) {
        setUserEmail(user.email);
        setUserName(user.name || user.email);
        setReplyTo(user.email);
        setOrganizationName(user.organizationInfo.name || 'HireTrack');
      }

      // Fetch templates
      try {
        const response = await fetch('/api/settings/templates');
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
                  'SenderName',
                  'ReceiverName',
                  'PortalName',
                ],
                isCustom:
                  !template.templateId.includes('job-application')
                  && !template.templateId.includes('password-reset')
                  && !template.templateId.includes('interview-assignment')
                  && !template.templateId.includes('status-update')
                  && !template.templateId.includes('new-remark')
                  && !template.templateId.includes('step-completed')
                  && !template.templateId.includes('send-otp'),
                isDefault:
                  template.templateId.includes('job-application')
                  || template.templateId.includes('password-reset')
                  || template.templateId.includes('interview-assignment')
                  || template.templateId.includes('status-update')
                  || template.templateId.includes('new-remark')
                  || template.templateId.includes('step-completed')
                  || template.templateId.includes('send-otp'),
              }),
            );

            // Filter to show only custom templates (suitable for manual emails to candidates)
            const emailTemplates = loadedTemplates.filter(
              (template: EmailTemplate) => template.isCustom,
            );
            setTemplates(emailTemplates);
          }
        }
      } catch (error) {
        logger.error('Failed to load templates:', error);
      } finally {
        setTemplateLoading(false);
      }
    })();
  }, []);

  // Replace template variables with actual values
  const replaceVariables = (content: string): string => content
    .replace(/{{SenderName}}/g, userName || userEmail)
    .replace(/{{ReceiverName}}/g, candidate.name)
    .replace(/{{PortalName}}/g, organizationName)
    .replace(/{{jobTitle}}/g, candidate.jobTitle || '');

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);

    if (templateId === 'none') {
      setSubject('');
      setBody('');
      return;
    }

    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSubject(replaceVariables(template.subject));
      setBody(replaceVariables(template.content));
      // Reset to rich text mode when selecting a template for better UX
      setContentMode('rich');
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and body are required');
      return;
    }

    // Clear previous states
    setSending(true);
    setEmailError('');
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

        const uploadResponse = await fetch('/api/file-shares', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: fileData,
            shareOptions: {
              isPublic: true,
              expiresInHours: 24 * 30, // 30 days
              metadata: {
                purpose: 'email_attachment',
                relatedTo: 'email',
                candidateId: candidate._id,
              },
            },
          }),
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || 'Failed to upload attachments');
        }

        const uploadResult = await uploadResponse.json();
        uploadedAttachments = uploadResult.files;
      }

      // Send email
      const emailResponse = await fetch('/api/candidates/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        const errorMsg = emailResult.error || 'Failed to send email';
        setEmailError(errorMsg);
        throw new Error(errorMsg);
      }

      setEmailSent(true);
      toast.success('Email sent successfully');

      // Auto-close after a short delay to show success state
      setTimeout(() => {
        onClose();
        // Reset form
        setSubject('');
        setBody('');
        setCc([]);
        setBcc([]);
        setAttachments([]);
        setEmailSent(false);
        setEmailError('');
        setSelectedTemplate('none');
        setContentMode('rich');
      }, 2000);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to send email';
      setEmailError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSending(false);
    }
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
            <span className="font-bold">To:</span>
            {' '}
            {candidate.name}
            {' '}
            (
            {candidate.email}
            ) |
            <span className="font-bold">From:</span>
            {' '}
            {userName}
            {' '}
            (
            {userEmail}
            )
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {!templateLoading && (
              <EmailTemplateSelector
                templates={templates}
                selectedTemplate={selectedTemplate}
                onTemplateSelect={handleTemplateSelect}
                userName={userName}
                candidateName={candidate.name}
                organizationName={organizationName}
                contentMode={contentMode}
              />
            )}

            <EmailEditor
              subject={subject}
              setSubject={setSubject}
              body={body}
              setBody={setBody}
              contentMode={contentMode}
              setContentMode={setContentMode}
              selectedTemplate={selectedTemplate}
              setSelectedTemplate={setSelectedTemplate}
              templates={templates}
              theme={theme}
            />

            <EmailRecipients
              cc={cc}
              setCc={setCc}
              bcc={bcc}
              setBcc={setBcc}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              userEmail={userEmail}
            />

            <EmailAttachments
              attachments={attachments}
              setAttachments={setAttachments}
              sending={sending}
            />
          </div>
        </div>

        <EmailDialogFooter
          onClose={onClose}
          onSend={handleSend}
          sending={sending}
          emailSent={emailSent}
          emailError={emailError}
        />
      </DialogContent>
    </Dialog>
  );
}
