/**
 * Custom hook for handling candidate creation submission logic
 */
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  useApplicationEventMailMutation,
  useCreateCandidateMutation,
  useEvaluateCandidateMutation,
  useUpdateAppliedApplicationMutation,
  useUpdateCandidateHistoryMutation,
  useUploadFilesMutation,
} from '@/lib/features/candidate/candidateApi';
import {
  uploadCandidateFilesOneByOne,
  type CandidateFileUploadValues,
} from '@/lib/utils/candidateFileUpload';
// import { v4 } from 'uuid';
import { ICandidateHistory } from '@/lib/models/history';
import { Resume } from '@/lib/redux/types';
import { CustomFieldValues } from '@/Custom_Fields/hooks/useCustomForm';
import logger from '@/lib/logger';
import type { ILocalUser } from '@/lib/redux/authSlice';

interface CandidateFormValues {
  name: string;
  location: string;
  experience: number;
  relevantExperience: number;
  skills: string[];
  expectedCTC: number;
  currentCTC: number;
  noticePeriod: number;
  resume: File | null;
  remarks: string;
  attachments: File[];
  assignee: string;
  time: Date | undefined;
  customFields: CustomFieldValues;
  email: string;
  assignment?: {
    interviewerId: string | { _id: string; name: string; email: string } | null;
    time: Date | null;
  } | null;
}

interface UseCreateCandidateSubmissionProps {
  jobId: string;
  parsedResumeData: Resume | null;
  user: ILocalUser | null;
  onSuccess: () => void;
}

/** Resolve organizationId to string (ILocalUser may have Organization object). */
function getOrganizationIdString(user: ILocalUser | null): string | undefined {
  if (!user?.organizationId) return undefined;
  return typeof user.organizationId === 'string'
    ? user.organizationId
    : (user.organizationId as { _id?: string })?._id;
}

// Removed convertFileToBase64 - we send files as binary in FormData now

// Helper function to evaluate candidate
async function evaluateCandidate(
  candidateId: string,
  evaluateCandidateMutation: ReturnType<typeof useEvaluateCandidateMutation>[0],
) {
  try {
    const result = await evaluateCandidateMutation({ candidateId }).unwrap();
    return result;
  } catch {
    return null;
  }
}

// Helper function to send applied event mail
async function sendAppliedEventMail(
  candidateId: string,
  applicationEventMailMutation: ReturnType<
    typeof useApplicationEventMailMutation
  >[0],
) {
  try {
    const resp = await applicationEventMailMutation({ candidateId }).unwrap();
    return resp;
  } catch {
    return null;
  }
}

export function useCreateCandidateSubmission({
  jobId,
  parsedResumeData,
  user,
  onSuccess,
}: UseCreateCandidateSubmissionProps) {
  const { toast } = useToast();
  const [createCandidate, { isLoading: isAdding }] =
    useCreateCandidateMutation();
  const [uploadFiles, { isLoading: isUploadingFiles }] =
    useUploadFilesMutation();
  const [evaluateCandidateMutation, { isLoading: isEvaluating }] =
    useEvaluateCandidateMutation();
  const [applicationEventMailMutation, { isLoading: isSendingEmail }] =
    useApplicationEventMailMutation();
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();
  const [updateAppliedApplication, { isLoading }] =
    useUpdateAppliedApplicationMutation();
  const [isCreating, setIsCreating] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  const submitCandidate = async (values: CandidateFormValues) => {
    // Prevent duplicate submissions
    if (isFormSubmitting || isCreating) {
      return;
    }

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
      setIsFormSubmitting(true);
      const hasOnlySpaces = Object.entries(values).some((value) => {
        if (typeof value[1] === 'string') {
          return value[1].length > 0 && value[1].trim() === '';
        }
        return false;
      });

      if (hasOnlySpaces) {
        toast({
          title: 'Validation Error',
          description: 'Fields cannot contain only spaces',
          variant: 'destructive',
        });
        setIsFormSubmitting(false);
        return;
      }

      // Extract assignment, assignee, and time from values to avoid spreading empty objects
      // DO NOT include resume or attachments in candidateData - they go in FormData as binary files
      const { assignment, assignee, time, ...restValues } = values;

      const candidateData: Record<string, unknown> = {
        ...restValues,
        jobId: {
          _id: jobId,
          title: '',
          description: '',
        },
        currentCTC: Number(parseFloat(String(values.currentCTC)).toFixed(2)),
        expectedCTC: Number(parseFloat(String(values.expectedCTC)).toFixed(2)),
        experience: Number(parseFloat(String(values.experience)).toFixed(2)),
        relevantExperience: Number(
          parseFloat(String(values.relevantExperience)).toFixed(2),
        ),
        noticePeriod: Number(
          parseFloat(String(values.noticePeriod)).toFixed(0),
        ),
        email: values.email || parsedResumeData?.profile?.email,
        remarks: [],
        // DO NOT include resume or attachments here - they are sent as binary files in FormData
      };

      // Handle assignment: prefer assignment object, fallback to assignee/time for backward compatibility
      if (assignment) {
        // Normalize interviewerId: convert empty string or "-1" to null
        const normalizedInterviewerId =
          typeof assignment.interviewerId === 'string'
            ? assignment.interviewerId
            : assignment.interviewerId?._id || null;

        if (
          normalizedInterviewerId &&
          normalizedInterviewerId !== '' &&
          normalizedInterviewerId !== '-1'
        ) {
          // Only include assignment if interviewerId is valid
          candidateData.assignment = {
            interviewerId: normalizedInterviewerId,
            time: assignment.time ? new Date(assignment.time) : undefined,
          };
        }
        // If invalid, don't include assignment (it will be undefined)
      } else if (assignee && assignee !== '-1' && assignee !== '' && time) {
        // Fallback: handle legacy assignee/time format if assignment object doesn't exist
        candidateData.assignment = {
          interviewerId: assignee,
          time: new Date(time),
        };
      }
      // If neither exists or both are invalid, assignment is not included (undefined)

      setIsCreating(true);

      // Step 1: Upload files one by one and collect URLs
      const hasFilesToUpload =
        (values.resume && values.resume instanceof File) ||
        (Array.isArray(values.attachments) && values.attachments.length > 0) ||
        (values.customFields &&
          Object.values(values.customFields).some(
            (field) =>
              Array.isArray(field) &&
              field.some((item) => item instanceof File),
          ));

      if (hasFilesToUpload) {
        try {
          const uploadResult = await uploadCandidateFilesOneByOne(
            values as CandidateFileUploadValues,
            uploadFiles,
            {
              organizationId: getOrganizationIdString(user),
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
            candidateData.resume = uploadResult.resume;
          }
          if (uploadResult.attachments.length > 0) {
            candidateData.attachments = uploadResult.attachments;
          }
          if (Object.keys(uploadResult.customFields).length > 0) {
            const existingCustomFields =
              (candidateData.customFields as Record<string, unknown>) || {};
            for (const [fieldKey, files] of Object.entries(
              uploadResult.customFields,
            )) {
              const existingField = existingCustomFields[fieldKey];
              if (Array.isArray(existingField)) {
                existingCustomFields[fieldKey] = [
                  ...existingField.filter((item) => !(item instanceof File)),
                  ...files,
                ];
              } else {
                existingCustomFields[fieldKey] = files;
              }
            }
            candidateData.customFields = existingCustomFields;
          }
        } catch (uploadError) {
          logger.error('File upload error:', uploadError);
          toast({
            title: 'File Upload Failed',
            description:
              uploadError instanceof Error
                ? uploadError.message
                : 'Failed to upload files. Please try again.',
            variant: 'destructive',
          });
          setIsFormSubmitting(false);
          setIsCreating(false);
          return;
        }
      }

      // Step 3: Send candidate data as JSON (with URLs, not files)
      const createdCandidate = await createCandidate(
        candidateData as Partial<typeof candidateData>,
      ).unwrap();
      const candidateId = createdCandidate._id;

      // Always attempt evaluation if resume is PDF
      if (values.resume && values.resume.type === 'application/pdf') {
        try {
          evaluateCandidate(candidateId, evaluateCandidateMutation);
        } catch (evalError) {
          logger.warn(
            'AI evaluation failed or was skipped by server:',
            evalError,
          );
        }
      }

      // Handle additional updates (if applicable)
      if (user?.role === 'candidate' || user?.role === '') {
        try {
          await updateAppliedApplication({ id: jobId });
        } catch (error: unknown) {
          toast({
            title: 'Failed',
            description: `${
              error instanceof Error ? error.message : 'Unknown Error Occurred'
            }`,
          });
        }
      }

      if (createdCandidate?.assignment?.interviewerId) {
        const newHistoryEntry: ICandidateHistory = {
          dateTime: new Date().toISOString() || '',
          title:
            typeof createdCandidate?.assignment?.interviewerId === 'object' &&
            createdCandidate?.assignment?.interviewerId?.name
              ? `Assigned to ${createdCandidate.assignment.interviewerId.name} : Assigned by ${user!.name}`
              : '',
          currentInterviewer:
            typeof createdCandidate?.assignment?.interviewerId === 'object' &&
            createdCandidate?.assignment?.interviewerId
              ? Object(createdCandidate.assignment.interviewerId._id)
              : null,
          previousInterviewer: null,
          assignmentBy: user && user.id,
          note: {
            description: '',
            date: '',
            rating: 0,
            userId: null,
          },
          attachments:
            createdCandidate.attachments?.map((attachment) => ({
              id: attachment.id,
              name: attachment.name,
              url: attachment.url,
              type: attachment.type,
              size: attachment.size,
            })) || [],
        };
        await updateCandidateHistory({
          candidateId: createdCandidate._id,
          jobId: {
            _id: jobId,
            title: '',
            description: '',
          },
          newEntry: newHistoryEntry,
        }).unwrap();
      }

      onSuccess();
      sendAppliedEventMail(candidateId, applicationEventMailMutation);
    } catch (error) {
      logger.error('Create candidate error:', error);

      let errorMessage =
        'Failed to create candidate due to an unexpected error.';

      if (typeof error === 'object' && error !== null) {
        if ('data' in error) {
          const errorData = (
            error as { data?: { error?: string; message?: string } }
          ).data;
          if (errorData?.error) {
            errorMessage = errorData.error;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        } else if (
          'message' in error &&
          typeof (error as Error).message === 'string'
        ) {
          errorMessage = (error as Error).message;
        }
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsFormSubmitting(false);
      setIsCreating(false);
    }
  };

  return {
    submitCandidate,
    isCreating,
    isFormSubmitting,
    isLoading:
      isAdding ||
      isEvaluating ||
      isSendingEmail ||
      isLoading ||
      isUploadingFiles,
  };
}
