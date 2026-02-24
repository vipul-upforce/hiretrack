'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Formik, Form, FormikProps } from 'formik';
import {
  useUpdateCandidateMutation,
  useUpdateCandidateHistoryMutation,
  useUploadFilesMutation,
} from '@/lib/features/candidate/candidateApi';
import {
  uploadCandidateFilesOneByOne,
  type CandidateFileUploadValues,
  type UploadedFileResult,
} from '@/lib/utils/candidateFileUpload';
import { Candidate } from '@/types/candidate';
import { v4 as uuidv4 } from 'uuid';
import { useParams, usePathname } from 'next/navigation';
import useCustomForm, { CustomFieldValues } from '@/Custom_Fields/hooks/useCustomForm';
import { ICandidateHistory } from '@/lib/models/history';
import React, { useContext, useEffect, useState } from 'react';
import { Resume } from '@/lib/redux/types';
import { parseResumeFromPdf } from '@/lib/parse-resume-from-pdf';
import { useSendMailMutation } from '@/lib/features/org/orgApi';
import { sentAssignmentMail } from '@/lib/utils';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { useApplyHandler } from '@/app/apply-jobs/useApplyHandler';
import { useUnsavedChangesProtection } from '@/app/apply-jobs/useUnsavedChangesProtection';
import { AddSpecificCustomFieldButton } from '@/Custom_Fields/Components/AddSpecificCustomFieldButton';
import { CustomFieldsContext } from '@/Custom_Fields/Context';
import { useAppSelector } from '@/lib/redux/hooks';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import FormUpdater from '../Utils/FormUpdater';
import { getJobId } from '../../utils/candidateAccessors';
import { CandidateForm } from '../Candidate/candidate-form';
import { candidateSchema } from '../../schemas/candidate-schema';
import { EditCandidateDialogHeader } from './edit-candidate-components/EditCandidateDialogHeader';
import ConfirmationDialog from './ConfirmationDialog';

interface EditCandidateDialogProps {
  candidate: Candidate;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updatedCandidate: Candidate) => void;
  refetchAssignment?: () => void;
  onSuccess: () => void;
  reopenDetailsDialog?: () => void;
}

const handleFileParse = async (
  file: File | null,
  setParsedResume: (data: Resume | null) => void,
) => {
  if (file && file.type === 'application/pdf') {
    const reader = new FileReader();

    reader.onload = async () => {
      const { result } = reader;

      if (result && typeof result === 'string') {
        try {
          const fileUrl = result;

          const parsedData = await parseResumeFromPdf(fileUrl);
          setParsedResume(parsedData);
        } catch {
          setParsedResume(null);
        }
      }
    };

    reader.readAsDataURL(file);
  }
};

const isFetchBaseQueryError = (
  error: unknown,
): error is FetchBaseQueryError & { data: { error: string } } =>
  typeof error === 'object' &&
  error !== null &&
  'data' in error &&
  typeof error.data === 'object' &&
  error.data !== null &&
  'error' in error.data &&
  typeof error.data.error === 'string';

export function EditCandidateDialog({
  candidate,
  isOpen,
  onOpenChange,
  onUpdate,
  refetchAssignment,
  onSuccess,
  reopenDetailsDialog,
}: EditCandidateDialogProps) {
  const { toast } = useToast();
  const id = useParams()?.id as string;
  const [updateCandidate] = useUpdateCandidateMutation();
  const [uploadFiles] = useUploadFilesMutation();
  const [sendEmail] = useSendMailMutation();
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();
  const isDesktop = useIsDesktop();
  const [isMaximized, setIsMaximized] = useState(false);

  const formName = 'Candidate';
  const { getDefaultValues, validationSchema } = useCustomForm(
    formName,
    id, // Pass the job ID from the URL params
    candidate._id,
  );
  const pathname = usePathname();
  const [parsedResumeData, setParsedResume] = useState<Resume | null>(null);
  // const [user, setuser] = useState<User | null>(null);
  const { user } = useAppSelector((state) => state.auth);
  const { formikRef, handleApply } = useApplyHandler<Candidate>();
  const {
    // handleAddCustomField,
    // selectedFormId,
    setStepName,
    customFields,
    setSelectedFormId,
  } = useContext(CustomFieldsContext);
  useEffect(() => {
    setStepName('Candidate');
    if (customFields) {
      const candidateForm = Object.entries(customFields).find(
        ([, form]) => form.formName === 'Candidate',
      );

      if (candidateForm) {
        const [formId, form] = candidateForm;
        setSelectedFormId({
          formId,
          formName: form.formName,
          fields: form.fields,
        });
      }
    }

    return () => {
      setSelectedFormId(null);
      setStepName('FormList');
    };
  }, [customFields, setSelectedFormId, setStepName]);

  const {
    showUnsavedChangesDialog,
    handleDialogClose: handleUnsavedDialogClose,
    handleCancelClick: handleUnsavedCancelClick,
    handleConfirmClose: handleUnsavedConfirmClose,
    handleCancelClose: handleUnsavedCancelClose,
  } = useUnsavedChangesProtection({
    formikRef: formikRef as React.RefObject<FormikProps<Candidate> | null>,
    isOpen,
    setIsOpen: onOpenChange,
    onCloseCallback: () => {
      setSelectedFormId(null);
    },
  });

  const handleSubmit = async (values: Candidate) => {
    // debugger;
    const fileNames = values.attachments.map((file) => file.name);
    const hasDuplicates = new Set(fileNames).size !== fileNames.length;

    if (hasDuplicates) {
      toast({
        title: 'Alert',
        description:
          'Duplicate file names found! Please rename before submitting.',
        variant: 'destructive',
      });
      return;
    }
    try {
      // Separate new files from existing files
      const resumeIsFile = values.resume instanceof File;
      const newAttachmentFiles: File[] = [];
      const existingAttachments: Array<{
        url: string;
        id: string;
        name: string;
        type: string;
        size: number;
      }> = [];

      values.attachments.forEach((file) => {
        if (file instanceof File) {
          newAttachmentFiles.push(file);
        } else {
          existingAttachments.push(file);
        }
      });

      // Separate custom field files: new files (File objects or base64) vs existing (with URLs)
      const customFieldFilesToUpload: Record<
        string,
        Array<File | { base64: string; name: string; type: string; size: number }>
      > = {};
      const existingCustomFields: Record<
        string,
        Array<{
          url: string;
          id: string;
          name: string;
          type: string;
          size: number;
        }>
      > = {};

      if (values.customFields) {
        Object.entries(values.customFields).forEach(([fieldKey, fieldValue]) => {
          if (Array.isArray(fieldValue) && fieldValue.length > 0) {
            const newFiles: Array<
              File | { base64: string; name: string; type: string; size: number }
            > = [];
            const existingFiles: Array<{
              url: string;
              id: string;
              name: string;
              type: string;
              size: number;
            }> = [];

            fieldValue.forEach((item) => {
              // Check if it's a File object (new file)
              if (item instanceof File) {
                newFiles.push(item);
              }
              // Check if it's a new file with base64 (needs upload)
              else if (
                typeof item === 'object' &&
                item !== null &&
                'base64' in item &&
                item.base64 &&
                typeof item.base64 === 'string' &&
                item.base64.startsWith('data:')
              ) {
                newFiles.push(item as {
                  base64: string;
                  name: string;
                  type: string;
                  size: number;
                });
              }
              // Check if it's an existing file with URL
              else if (
                typeof item === 'object' &&
                item !== null &&
                'url' in item &&
                item.url &&
                typeof item.url === 'string'
              ) {
                existingFiles.push({
                  url: (item as { url: string }).url,
                  id: (item as { id?: string }).id || uuidv4(),
                  name: (item as { name?: string }).name || '',
                  type: (item as { type?: string }).type || 'application/octet-stream',
                  size: (item as { size?: number }).size || 0,
                });
              }
            });

            if (newFiles.length > 0) {
              customFieldFilesToUpload[fieldKey] = newFiles;
            }
            if (existingFiles.length > 0) {
              existingCustomFields[fieldKey] = existingFiles;
            }
          }
        });
      }

      // Check if we have new files to upload
      const hasCustomFieldFilesToUpload =
        Object.keys(customFieldFilesToUpload).length > 0;
      const hasFilesToUpload =
        resumeIsFile ||
        newAttachmentFiles.length > 0 ||
        hasCustomFieldFilesToUpload;

      // Build payload with existing file URLs (keep existing files as-is)
      const payload: Partial<Candidate> = {
        ...values,
        _id: candidate._id, // Explicitly include _id for FormData submission
        email: values.email,
        currentCTC: Number(parseFloat(String(values.currentCTC)).toFixed(2)),
        expectedCTC: Number(parseFloat(String(values.expectedCTC)).toFixed(2)),
        experience: Number(parseFloat(String(values.experience)).toFixed(2)),
        relevantExperience: Number(
          parseFloat(String(values.relevantExperience)).toFixed(2),
        ),
        noticePeriod: Number(
          parseFloat(String(values.noticePeriod)).toFixed(0),
        ),
        resume: (() => {
          if (resumeIsFile) {
            // New file will be sent in FormData
            return undefined;
          }
          if (values.resume) {
            return {
              id: values.resume.id || uuidv4(),
              name: values.resume.name || '',
              url: values.resume.url,
              type: values.resume.type || 'pdf',
              size: values.resume.size || 0,
            };
          }
          return undefined;
        })(),
        attachments: existingAttachments, // Only existing attachments in payload
        // customFields will be populated as files are uploaded
      };

      // Handle assignment
      if (values.assignment) {
        const normalizedInterviewerId =
          typeof values.assignment.interviewerId === 'string'
            ? values.assignment.interviewerId
            : values.assignment?.interviewerId?._id?.replace(/"/g, '') || null;

        if (
          !normalizedInterviewerId ||
          normalizedInterviewerId === '' ||
          normalizedInterviewerId === '-1'
        ) {
          delete payload.assignment;
        } else {
          payload.assignment = {
            ...values.assignment,
            interviewerId: normalizedInterviewerId,
            time: values.assignment.time ?? null,
            assignedAt: values.assignment.assignedAt,
          };
        }
      }

      // Calculate latest modified attachments (for history tracking)
      const latestModifiedAttachments = [
        ...(resumeIsFile
          ? [
            {
              id: uuidv4(),
              name: values.resume?.name || '',
              size: values.resume?.size || 0,
            },
          ]
          : []),
        ...newAttachmentFiles.map((file) => ({
          id: uuidv4(),
          name: file.name,
          size: file.size,
        })),
      ];

      // let result;
      // let error;
      // let uploadResult: {
      //   files: Array<{
      //     id: string;
      //     name: string;
      //     url: string;
      //     type: string;
      //     size: number;
      //   }>;
      // } | null = null;
      // Step 1: Upload new files one by one and collect URLs
      if (hasFilesToUpload) {
        try {
          const uploadResult = await uploadCandidateFilesOneByOne(
            values as CandidateFileUploadValues,
            uploadFiles,
            {
              organizationId: user?.organizationId as string,
              onCustomFieldUploadError: (fieldKey, error) => {
                toast({
                  title: 'File Upload Failed',
                  description: `Failed to upload file for ${fieldKey}: ${error.message}`,
                  variant: 'destructive',
                });
              },
            },
          );

          if (uploadResult.resume) {
            payload.resume = uploadResult.resume;
          }
          if (uploadResult.attachments.length > 0) {
            payload.attachments = [
              ...(payload.attachments || []),
              ...uploadResult.attachments,
            ];
          }

          const formatFileForPayload = (file: UploadedFileResult) => ({
            base64: file.url,
            name: file.name,
            type: file.type,
            size: file.size,
            id: file.id,
            url: file.url,
          });

          for (const fieldKey of Object.keys(customFieldFilesToUpload)) {
            const uploadedFiles = uploadResult.customFields[fieldKey] ?? [];
            if (uploadedFiles.length > 0) {
              if (!payload.customFields) {
                payload.customFields = {};
              }
              const existingFormatted = (existingCustomFields[fieldKey] || []).map(
                (f) => formatFileForPayload(f),
              );
              const uploadedFormatted = uploadedFiles.map(formatFileForPayload);
              payload.customFields[fieldKey] = [
                ...existingFormatted,
                ...uploadedFormatted,
              ] as CustomFieldValues[string];
            } else if (existingCustomFields[fieldKey]) {
              if (!payload.customFields) {
                payload.customFields = {};
              }
              payload.customFields[fieldKey] = existingCustomFields[
                fieldKey
              ].map((f) => formatFileForPayload(f)) as CustomFieldValues[string];
            }
          }
          // Preserve existing-only custom fields (no new uploads this submit)
          for (const [fieldKey, existingFiles] of Object.entries(
            existingCustomFields,
          )) {
            if (payload.customFields && !(fieldKey in payload.customFields)) {
              payload.customFields[fieldKey] = existingFiles.map((f) =>
                formatFileForPayload(f),
              ) as CustomFieldValues[string];
            }
          }
        } catch (uploadError) {
          toast({
            title: 'File Upload Failed',
            description:
              uploadError instanceof Error
                ? uploadError.message
                : 'Failed to upload files. Please try again.',
            variant: 'destructive',
          });
          return;
        }
      }

      // Step 2: Send candidate data as JSON (with URLs, not files)
      // debugger
      const updateResult = await updateCandidate(payload);
      const result = updateResult.data;
      const { error } = updateResult;

      if (error) {
        toast({
          title: 'Error',
          description: isFetchBaseQueryError(error)
            ? error.data.error
            : 'Failed to update job',
          variant: 'destructive',
        });
        return;
      }
      // sentAssignmentMail(result, sendEmail);
      // check if assignment has changed before sending email
      const prevAssignment = candidate.assignment?.interviewerId;
      const newAssignment = result?.assignment?.interviewerId;
      // debugger;
      const prevId =
        typeof prevAssignment === 'object'
          ? prevAssignment?._id
          : prevAssignment;
      const newId =
        typeof newAssignment === 'object' ? newAssignment?._id : newAssignment;

      if (prevId !== newId) {
        sentAssignmentMail(result as Candidate, sendEmail);
      }

      const previousInterviewer =
        typeof candidate.assignment?.interviewerId === 'object'
          ? candidate.assignment.interviewerId?.name
          : null;
      const previousInterviewerId =
        typeof candidate.assignment?.interviewerId === 'object'
          ? Object(candidate.assignment.interviewerId?._id)
          : null;

      const nextInterviewer =
        result && typeof result.assignment?.interviewerId === 'object'
          ? result.assignment.interviewerId?.name
          : null;
      const nextInterviewerId =
        result && typeof result.assignment?.interviewerId === 'object'
          ? Object(result.assignment.interviewerId?._id)
          : null;

      let title;
      if (!previousInterviewer || previousInterviewer === '') {
        title = `Assigned to ${nextInterviewer} : Assigned by ${user ? user.name : 'No one'
          }`;
      } else {
        title = `${previousInterviewer} → ${nextInterviewer} : Assigned by ${user ? user.name : 'No one'
          }`;
      }

      title = null;

      const newHistoryEntry: ICandidateHistory = {
        dateTime: new Date().toISOString() || '',
        title,
        currentInterviewer: nextInterviewerId,
        previousInterviewer: previousInterviewerId,
        assignmentBy: user ? user.id : null,
        note: {
          description: '',
          date: '',
          rating: 0,
          userId: null,
        },
        attachments: latestModifiedAttachments.map((file) => ({
          id: file.id,
          name: file.name,
          url: '',
          type: '',
          size: file.size,
        })),
      };

      if (nextInterviewer && nextInterviewer !== '') {
        await updateCandidateHistory({
          candidateId: candidate._id || '',
          jobId: candidate?.jobId || null,
          newEntry: newHistoryEntry,
        }).unwrap();
      }

      if (pathname === '/dashboard') {
        refetchAssignment?.();
      }
      if (result) {
        onUpdate(result);
      }
      if (id) {
        onSuccess();
      }
      onOpenChange(false);
      if (reopenDetailsDialog) {
        reopenDetailsDialog();
      }
      toast({
        title: 'Success',
        description: 'Candidate updated successfully',
      });
      // Reset form after successful submission
      if (formikRef.current) {
        formikRef.current.resetForm();
      }
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'data' in error) {
        const errorData = (error as { data?: { error?: string } }).data;

        if (
          typeof errorData === 'object' &&
          errorData !== null &&
          'error' in errorData
        ) {
          toast({
            title: 'Error',
            description: errorData.error || 'Failed to update job',
            variant: 'destructive',
          });
          return;
        }
      }

      toast({
        title: 'Error',
        description: 'Failed to update job due to an unexpected error.',
        variant: 'destructive',
      });
    }
  };

  let interviewerId = null;
  if (candidate?.assignment?.interviewerId) {
    // Normalize interviewerId: convert empty string or "-1" to null
    if (typeof candidate.assignment.interviewerId === 'string') {
      interviewerId =
        !candidate.assignment.interviewerId ||
          candidate.assignment.interviewerId === '' ||
          candidate.assignment.interviewerId === '-1'
          ? null
          : candidate.assignment.interviewerId;
    } else if (candidate.assignment.interviewerId?._id) {
      const interviewerIdValue = candidate.assignment.interviewerId._id.replace(/"/g, '');
      interviewerId = !interviewerIdValue || interviewerIdValue === '' || interviewerIdValue === '-1' ? null : interviewerIdValue;
    }
  }

  const initialValues: Candidate = {
    ...candidate,
    resume: candidate.resume,
    attachments: candidate.attachments,
    email: candidate.email, // Added email to initial values
    assignment:
      candidate.assignment && Object.keys(candidate.assignment).length > 1
        ? {
          ...candidate.assignment,
          interviewerId: interviewerId || null,
          time: candidate.assignment.time,
          assignedAt: candidate.assignment.assignedAt,
        }
        : null,
    customFields: getDefaultValues(candidate.customFields || {}),
  };

  useEffect(() => {
    if (!isOpen) {
      setIsMaximized(false);
    }
  }, [isOpen]);

  const handleDialogClose = (open: boolean) => {
    if (!open && !showUnsavedChangesDialog) {
      setSelectedFormId(null);
    }
    handleUnsavedDialogClose(open);
  };

  const handleCancelClick = () => {
    handleUnsavedCancelClick();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent
        className={
          !isDesktop || isMaximized
            ? 'dialog-fullscreen-mode flex flex-col overflow-hidden'
            : `dialog-modal-mode ${candidate.resume ? 'xl-max-w-65vw' : 'xl-max-w-50vw'
            } flex flex-col justify-between overflow-hidden`
        }
      >
        <EditCandidateDialogHeader
          isLargeViewport={isDesktop}
          isMaximized={isMaximized}
          onToggleMaximize={() => setIsMaximized(!isMaximized)}
        />
        <Formik
          innerRef={formikRef}
          initialValues={initialValues}
          validationSchema={candidateSchema(validationSchema)}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ isSubmitting, errors, setFieldValue }) => (
            // <Form className='flex flex-col h-[calc(90vh-80px)] overflow-hidden border-t '>
            <Form className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <FormUpdater parsedResumeData={parsedResumeData} />
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <CandidateForm
                  jobId={getJobId(candidate) || id}
                  onFileUpload={async (file: File) => {
                    setFieldValue('resume', file);
                    await handleFileParse(file, setParsedResume);
                  }}
                  isEditMode
                />
              </div>
              <div className="sticky bottom-0 z-10 flex justify-between space-x-2 border-t bg-background px-6 py-4">
                <AddSpecificCustomFieldButton
                  candidateId={candidate._id}
                  candidateName={candidate.name}
                />
                <div className="bottom-0 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelClick}
                  >
                    Cancel
                  </Button>

                  <Button
                    onClick={() => {
                      handleApply();
                    }}
                    disabled={isSubmitting}
                    type={Object.keys(errors).length === 0 ? 'button' : 'submit'}
                    variant="primary"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </DialogContent>

      <ConfirmationDialog
        isOpen={showUnsavedChangesDialog}
        setIsOpen={(open) => {
          if (!open) handleUnsavedCancelClose();
        }}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to close? All unsaved data will be lost."
        onConfirm={handleUnsavedConfirmClose}
        onCancel={handleUnsavedCancelClose}
        buttonName="Discard Changes"
      />
    </Dialog>
  );
}
