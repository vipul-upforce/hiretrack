/**
 * Custom hook for edit-candidate-dialog submission: payload building,
 * file uploads, candidate update, assignment email, and history.
 */

'use client';

import { useToast } from '@/hooks/use-toast';
import {
  useUpdateCandidateMutation,
  useUpdateCandidateHistoryMutation,
  useUploadFilesMutation,
} from '@/lib/features/candidate/candidateApi';
import { useSendMailMutation } from '@/lib/features/org/orgApi';
import {
  uploadCandidateFilesOneByOne,
  type CandidateFileUploadValues,
  type UploadedFileResult,
} from '@/lib/utils/candidateFileUpload';
import { sentAssignmentMail } from '@/lib/utils';
import { useAppSelector } from '@/lib/redux/hooks';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { FormikProps } from 'formik';
import { v4 as uuidv4 } from 'uuid';
import { Candidate } from '@/types/candidate';
import { ICandidateHistory } from '@/lib/models/history';
import { CustomFieldValues } from '@/Custom_Fields/hooks/useCustomForm';
import React from 'react';

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

export interface UseEditCandidateSubmitProps {
  candidate: Candidate;
  pathname: string | null;
  jobIdFromParams: string | null | undefined;
  formikRef: React.RefObject<FormikProps<Candidate> | null>;
  onUpdate: (updatedCandidate: Candidate) => void;
  onSuccess: () => void;
  onOpenChange: (open: boolean) => void;
  refetchAssignment?: () => void;
  reopenDetailsDialog?: () => void;
}

export function useEditCandidateSubmit({
  candidate,
  pathname,
  jobIdFromParams,
  formikRef,
  onUpdate,
  onSuccess,
  onOpenChange,
  refetchAssignment,
  reopenDetailsDialog,
}: UseEditCandidateSubmitProps) {
  const { toast } = useToast();
  const [updateCandidate] = useUpdateCandidateMutation();
  const [uploadFiles] = useUploadFilesMutation();
  const [sendEmail] = useSendMailMutation();
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();
  const { user } = useAppSelector((state) => state.auth);

  const handleSubmit = async (values: Candidate) => {
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

      const customFieldFilesToUpload: Record<
        string,
        Array<
          File | { base64: string; name: string; type: string; size: number }
        >
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
        Object.entries(values.customFields).forEach(
          ([fieldKey, fieldValue]) => {
            if (Array.isArray(fieldValue) && fieldValue.length > 0) {
              const newFiles: Array<
                | File
                | { base64: string; name: string; type: string; size: number }
              > = [];
              const existingFiles: Array<{
                url: string;
                id: string;
                name: string;
                type: string;
                size: number;
              }> = [];

              fieldValue.forEach((item) => {
                if (item instanceof File) {
                  newFiles.push(item);
                } else if (
                  typeof item === 'object' &&
                  item !== null &&
                  'base64' in item &&
                  item.base64 &&
                  typeof item.base64 === 'string' &&
                  item.base64.startsWith('data:')
                ) {
                  newFiles.push(
                    item as {
                      base64: string;
                      name: string;
                      type: string;
                      size: number;
                    },
                  );
                } else if (
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
                    type:
                      (item as { type?: string }).type ||
                      'application/octet-stream',
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
          },
        );
      }

      const hasCustomFieldFilesToUpload =
        Object.keys(customFieldFilesToUpload).length > 0;
      const hasFilesToUpload =
        resumeIsFile ||
        newAttachmentFiles.length > 0 ||
        hasCustomFieldFilesToUpload;

      const payload: Partial<Candidate> = {
        ...values,
        _id: candidate._id,
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
          if (resumeIsFile) return undefined;
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
        attachments: existingAttachments,
      };

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
              const existingFormatted = (
                existingCustomFields[fieldKey] || []
              ).map((f) => formatFileForPayload(f));
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
              ].map((f) =>
                formatFileForPayload(f),
              ) as CustomFieldValues[string];
            }
          }
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

      const prevAssignment = candidate.assignment?.interviewerId;
      const newAssignment = result?.assignment?.interviewerId;
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

      let title: string | null;
      if (!previousInterviewer || previousInterviewer === '') {
        title = `Assigned to ${nextInterviewer} : Assigned by ${user ? user.name : 'No one'}`;
      } else {
        title = `${previousInterviewer} → ${nextInterviewer} : Assigned by ${user ? user.name : 'No one'}`;
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
      if (jobIdFromParams) {
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

  return { handleSubmit };
}
