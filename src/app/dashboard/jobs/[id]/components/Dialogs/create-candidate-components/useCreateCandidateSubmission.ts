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
import { v4 as uuidv4 } from 'uuid';
import { ICandidateHistory } from '@/lib/models/history';
import { Resume } from '@/lib/redux/types';
import { CustomFieldValues } from '@/Custom_Fields/hooks/useCustomForm';
import logger from '@/lib/logger';

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
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  onSuccess: () => void;
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
      const { assignment, assignee, time, resume, attachments, ...restValues } = values;

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

      // Step 1: Upload files first to get URLs
      let resumeUrl: { id: string; name: string; url: string; type: string; size: number } | null = null;
      let attachmentUrls: Array<{ id: string; name: string; url: string; type: string; size: number }> = [];
      let customFieldUrls: Record<string, Array<{ id: string; name: string; url: string; type: string; size: number }>> = {};

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
        const uploadFormData = new FormData();

        // Add resume file if present
        if (values.resume && values.resume instanceof File) {
          uploadFormData.append('resume', values.resume);
        }

        // Add attachment files
        if (Array.isArray(values.attachments)) {
          values.attachments.forEach((file) => {
            if (file instanceof File) {
              uploadFormData.append('attachments', file);
            }
          });
        }

        // Add custom field files
        if (values.customFields) {
          Object.entries(values.customFields).forEach(([fieldKey, fieldValue]) => {
            if (Array.isArray(fieldValue)) {
              fieldValue.forEach((item, index) => {
                if (item instanceof File) {
                  uploadFormData.append(`customField_${fieldKey}_${index}`, item);
                }
              });
            }
          });
        }

        try {
          // Authenticated users don't need to pass organizationId - API uses their auth
          const uploadResult = await uploadFiles({ formData: uploadFormData }).unwrap();
          if (uploadResult.files && uploadResult.files.length > 0) {
            // First file is resume if present, rest are attachments
            if (values.resume && values.resume instanceof File) {
              resumeUrl = uploadResult.files[0];
              attachmentUrls = uploadResult.files.slice(1);
            } else {
              attachmentUrls = uploadResult.files;
            }
          }
          if (uploadResult.customFields) {
            customFieldUrls = uploadResult.customFields;
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

      // Step 2: Build candidate data with file URLs (not File objects)
      if (resumeUrl) {
        candidateData.resume = resumeUrl;
      }
      if (attachmentUrls.length > 0) {
        candidateData.attachments = attachmentUrls;
      }
      if (Object.keys(customFieldUrls).length > 0) {
        // Merge custom field URLs with existing custom field values
        const existingCustomFields = candidateData.customFields as Record<string, unknown> || {};
        Object.entries(customFieldUrls).forEach(([fieldKey, files]) => {
          const existingField = existingCustomFields[fieldKey];
          if (Array.isArray(existingField)) {
            // Merge with existing files (non-File objects)
            existingCustomFields[fieldKey] = [
              ...existingField.filter((item) => !(item instanceof File)),
              ...files,
            ];
          } else {
            existingCustomFields[fieldKey] = files;
          }
        });
        candidateData.customFields = existingCustomFields;
      }

      // Step 3: Send candidate data as JSON (with URLs, not files)
      const createdCandidate = await createCandidate(candidateData as Partial<typeof candidateData>).unwrap();
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
    isLoading: isAdding || isEvaluating || isSendingEmail || isLoading || isUploadingFiles,
  };
}
