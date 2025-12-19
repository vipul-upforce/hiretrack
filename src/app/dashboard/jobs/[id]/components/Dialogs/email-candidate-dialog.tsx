'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { RootState } from '@/lib/store';

// RTK Query hooks
import { useGetEmailTemplatesQuery } from '@/lib/features/settings/configApi';
import { useUploadFilesMutation } from '@/lib/features/files/fileSharesApi';
import { useSendEmailToCandidateMutation } from '@/lib/features/candidate/candidateApi';

// Import sub-components
import { EmailTemplateSelector } from './email-candidate-components/EmailTemplateSelector';
import { EmailEditor } from './email-candidate-components/EmailEditor';
import { EmailRecipients } from './email-candidate-components/EmailRecipients';
import { EmailAttachments } from './email-candidate-components/EmailAttachments';
import { EmailDialogFooter } from './email-candidate-components/EmailDialogFooter';
import {
  EmailTemplate,
  FileAttachment,
} from './email-candidate-components/types';

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
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const { user } = useSelector((state: RootState) => state.auth || {});

  // RTK Query hooks
  const { data: templatesData, isLoading: templateLoading } =
    useGetEmailTemplatesQuery(undefined, { skip: !isOpen });
  const [uploadFiles, { isLoading: isUploading }] = useUploadFilesMutation();
  const [sendEmail, { isLoading: isSendingEmail }] =
    useSendEmailToCandidateMutation();

  // Template management
  const [selectedTemplate, setSelectedTemplate] = useState<string>('none');
  const [contentMode, setContentMode] = useState<'rich' | 'html'>('rich');

  // Derived state
  const sending = isUploading || isSendingEmail;
  const userEmail = user?.email || '';
  const userName = user?.name || userEmail;
  const organizationName =
    (user?.organizationInfo as { name?: string } | undefined)?.name ||
    'HireTrack';

  // Process templates from API response
  const templates = useMemo<EmailTemplate[]>(() => {
    if (!templatesData?.templates) {
      return [];
    }

    const loadedTemplates = Object.values(templatesData.templates).map(
      (template) => ({
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
          !template.templateId.includes('job-application') &&
          !template.templateId.includes('password-reset') &&
          !template.templateId.includes('interview-assignment') &&
          !template.templateId.includes('status-update') &&
          !template.templateId.includes('new-remark') &&
          !template.templateId.includes('step-completed') &&
          !template.templateId.includes('send-otp'),
        isDefault:
          template.templateId.includes('job-application') ||
          template.templateId.includes('password-reset') ||
          template.templateId.includes('interview-assignment') ||
          template.templateId.includes('status-update') ||
          template.templateId.includes('new-remark') ||
          template.templateId.includes('step-completed') ||
          template.templateId.includes('send-otp'),
      }),
    );

    // Filter to show only custom templates (suitable for manual emails to candidates)
    return loadedTemplates.filter((template) => template.isCustom);
  }, [templatesData]);

  // Set replyTo when user is available
  useEffect(() => {
    if (user?.email) {
      setReplyTo(user.email);
    }
  }, [user?.email]);

  // Replace template variables with actual values
  const replaceVariables = useCallback(
    (content: string): string =>
      content
        .replace(/{{SenderName}}/g, userName || userEmail)
        .replace(/{{ReceiverName}}/g, candidate.name)
        .replace(/{{PortalName}}/g, organizationName)
        .replace(/{{jobTitle}}/g, candidate.jobTitle || ''),
    [userName, userEmail, candidate.name, candidate.jobTitle, organizationName],
  );

  // Handle template selection
  const handleTemplateSelect = useCallback(
    (templateId: string) => {
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
    },
    [templates, replaceVariables],
  );

  const handleSend = useCallback(async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and body are required');
      return;
    }

    // Clear previous states
    setEmailError('');
    setEmailSent(false);

    try {
      let uploadedAttachments: Array<{
        shareId: string;
        shareUrl: string;
        fileName: string;
        fileSize: number;
      }> = [];

      // Upload files if there are any
      if (attachments.length > 0) {
        const filePromises = attachments.map(async (att) => {
          const base64Promise = new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result) {
                resolve(e.target.result as string);
              } else {
                reject(new Error('Failed to read file'));
              }
            };
            reader.onerror = () => reject(new Error('File read error'));
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

        const uploadResult = await uploadFiles({
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
        }).unwrap();

        uploadedAttachments = uploadResult.files;
      }

      // Send email
      await sendEmail({
        candidateId: candidate._id,
        subject,
        body,
        cc,
        bcc,
        replyTo,
        attachments: uploadedAttachments,
      }).unwrap();

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
      const errorMsg =
        error instanceof Error ? error.message : 'Failed to send email';
      setEmailError(errorMsg);
      toast.error(errorMsg);
    }
  }, [
    subject,
    body,
    attachments,
    candidate._id,
    cc,
    bcc,
    replyTo,
    uploadFiles,
    sendEmail,
    onClose,
  ]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!left-0 !top-0 flex !h-full !w-full min-w-0 !max-w-none !translate-x-0 !translate-y-0 flex-col overflow-hidden lg:!left-[50%] lg:!top-[50%] lg:!h-[85vh] lg:!min-w-[800px] lg:!max-w-[70vw] lg:!translate-x-[-50%] lg:!translate-y-[-50%] xl:!max-w-[60vw]">
        <DialogHeader className="border-b border-gray-200 px-6 pb-4 pr-12 pt-6 dark:border-gray-700">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Mail className="h-6 w-6" />
            Compose and send an email
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            <span className="font-bold">To:</span> {candidate.name} (
            {candidate.email}) |<span className="font-bold">From:</span>{' '}
            {userName} ({userEmail})
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
