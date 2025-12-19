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
import type { RootState } from '@/lib/redux/store';

// RTK Query hooks
import { useGetEmailTemplatesQuery } from '@/lib/features/settings/configApi';
import { useSendEmailToCandidateMutation } from '@/lib/features/candidate/candidateApi';
import { useUploadFilesMutation } from '@/lib/features/files/fileSharesApi';

// Import sub-components
import {
  DEFAULT_TEMPLATE_IDS,
  DEFAULT_VARIABLES,
} from '@/app/dashboard/settings/templates/constants';
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
  const [selectedTemplate, setSelectedTemplate] = useState<string>('none');
  const [contentMode, setContentMode] = useState<'rich' | 'html'>('rich');

  // Redux state
  const { user } = useSelector((state: RootState) => state.auth || {});

  // RTK Query hooks
  const {
    data: templatesData,
    isLoading: templateLoading,
    error: templatesError,
  } = useGetEmailTemplatesQuery(undefined, { skip: !isOpen });

  const [sendEmail, { isLoading: sending }] = useSendEmailToCandidateMutation();
  const [uploadFiles] = useUploadFilesMutation();

  // Derived state from user
  const userEmail = user?.email || '';
  const userName = user?.name || userEmail;
  const organizationName = user?.organizationInfo?.name || 'HireTrack';

  // Process templates from API response
  const templates = useMemo<EmailTemplate[]>(() => {
    if (!templatesData?.templates) {
      return [];
    }

    const loadedTemplates: EmailTemplate[] = Object.values(
      templatesData.templates,
    ).map((template) => {
      const templateId = template.templateId.toLowerCase();
      const isDefault = DEFAULT_TEMPLATE_IDS.some((defaultId) =>
        templateId.includes(defaultId),
      );

      return {
        id: template.templateId,
        name: template.templateName,
        subject: template.subject,
        content: template.html,
        variables: template.variables || DEFAULT_VARIABLES,
        isCustom: !isDefault,
        isDefault,
      };
    });

    // Filter to show only custom templates (suitable for manual emails to candidates)
    return loadedTemplates.filter((template) => template.isCustom);
  }, [templatesData]);

  // Initialize user-related state
  useEffect(() => {
    if (user?.email) {
      setReplyTo(user.email);
    }
  }, [user]);

  // Replace template variables with actual values
  const replaceVariables = useCallback(
    (content: string): string =>
      content
        .replace(/{{SenderName}}/g, userName || userEmail)
        .replace(/{{ReceiverName}}/g, candidate.name)
        .replace(/{{PortalName}}/g, organizationName)
        .replace(/{{jobTitle}}/g, candidate.jobTitle || ''),
    [userName, userEmail, candidate.name, organizationName, candidate.jobTitle],
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
    [templates, replaceVariables, setSubject, setBody, setContentMode],
  );

  // Reset form state
  const resetForm = () => {
    setSubject('');
    setBody('');
    setCc([]);
    setBcc([]);
    setAttachments([]);
    setEmailSent(false);
    setEmailError('');
    setSelectedTemplate('none');
    setContentMode('rich');
  };

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
        fileName: string;
        fileSize: number;
        shareId: string;
        shareUrl: string;
      }> = [];

      // Upload files if there are any
      if (attachments.length > 0) {
        const filePromises = attachments.map(async (att) => {
          const base64Promise = new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result;
              if (typeof result === 'string') {
                resolve(result);
              } else {
                reject(new Error('Failed to read file'));
              }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
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

        try {
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

          uploadedAttachments = uploadResult.files.map((file) => ({
            fileName: file.fileName,
            fileSize: file.fileSize,
            shareId: file.shareId,
            shareUrl: file.shareUrl,
          }));
        } catch (uploadError) {
          let errorMessage = 'Failed to upload attachments';
          if (
            uploadError &&
            typeof uploadError === 'object' &&
            'data' in uploadError
          ) {
            errorMessage =
              (uploadError.data as { error?: string })?.error ||
              'Failed to upload attachments';
          }
          throw new Error(errorMessage);
        }
      }

      // Send email using RTK Query
      await sendEmail({
        candidateId: candidate._id,
        subject,
        body,
        cc: cc.length > 0 ? cc : undefined,
        bcc: bcc.length > 0 ? bcc : undefined,
        replyTo: replyTo || undefined,
        attachments:
          uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      }).unwrap();

      setEmailSent(true);
      toast.success('Email sent successfully');

      // Auto-close after a short delay to show success state
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);
    } catch (error: unknown) {
      let errorMsg = 'Failed to send email';
      if (error && typeof error === 'object' && 'data' in error) {
        errorMsg =
          (error.data as { error?: string })?.error || 'Failed to send email';
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }
      setEmailError(errorMsg);
      toast.error(errorMsg);
    }
  }, [
    subject,
    body,
    attachments,
    cc,
    bcc,
    replyTo,
    candidate._id,
    uploadFiles,
    sendEmail,
    onClose,
    resetForm,
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
            {templatesError && (
              <div className="text-sm text-red-600 dark:text-red-400">
                Failed to load email templates. Please try again.
              </div>
            )}
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
