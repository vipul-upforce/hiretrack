import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import {
  useCreateGuestCandidateMutation,
  useEvaluateCandidateMutation,
  useApplicationEventMailMutation,
  useUploadFilesMutation,
} from '@/lib/features/candidate/candidateApi';
import { Resume } from '@/lib/redux/types';
import { CustomFieldValues } from '@/Custom_Fields/hooks/useCustomForm';
import { Candidate } from '@/types/candidate';
import {
  uploadCandidateFilesOneByOne,
  type CandidateFileUploadValues,
} from '@/lib/utils/candidateFileUpload';
import {
  storeGuestApplication,
  hasAppliedAsGuest,
  evaluateCandidate,
  sendAppliedEventMail,
  extractErrorMessage,
  validateFormValues,
} from './guestApplicationUtils';

type CandidateFormValues = {
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
  time?: Date;
  customFields: CustomFieldValues;
  email: string;
  contact: string;
};

export const useGuestApplicationSubmit = (
  jobId: string,
  parsedResumeData: Resume | null,
) => {
  const { toast } = useToast();
  const [createGuestCandidate] = useCreateGuestCandidateMutation();
  const [uploadFiles] = useUploadFilesMutation();
  const [evaluateCandidateMutation] = useEvaluateCandidateMutation();
  const [applicationEventMailMutation] = useApplicationEventMailMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitApplication = async (values: CandidateFormValues) => {
    setIsSubmitting(true);

    if (hasAppliedAsGuest(jobId)) {
      toast({
        title: 'Already Applied',
        description: 'You have already applied for this job as a guest.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return false;
    }

    const validationError = validateFormValues(values);
    if (validationError) {
      toast({
        title: validationError.includes('Duplicate')
          ? 'Alert'
          : 'Validation Error',
        description: validationError,
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return false;
    }

    try {
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

      let resumeUrl: {
        id: string;
        name: string;
        url: string;
        type: string;
        size: number;
      } | null = null;
      let attachmentUrls: Array<{
        id: string;
        name: string;
        url: string;
        type: string;
        size: number;
      }> = [];
      let customFieldUrls: Record<
        string,
        Array<{ id: string; name: string; url: string; type: string; size: number }>
      > = {};

      if (hasFilesToUpload) {
        try {
          const uploadResult = await uploadCandidateFilesOneByOne(
            values as CandidateFileUploadValues,
            uploadFiles,
            {
              jobId,
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
            resumeUrl = uploadResult.resume;
          }
          attachmentUrls = uploadResult.attachments;
          customFieldUrls = uploadResult.customFields;
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
          setIsSubmitting(false);
          return false;
        }
      }

      // Step 2: Build candidate data with file URLs (not File objects)
      const { ...restValues } = values;

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
        contact: values.contact,
        ...(values.assignee && values.time
          ? {
              assignee: values.assignee === '-1' ? '' : values.assignee,
              time: values.time,
            }
          : {}),
        remarks: [],
        ...(resumeUrl ? { resume: resumeUrl } : {}),
        ...(attachmentUrls.length > 0 ? { attachments: attachmentUrls } : {}),
      };

      if (Object.keys(customFieldUrls).length > 0) {
        const existingCustomFields =
          (candidateData.customFields as Record<string, unknown>) || {};
        for (const [fieldKey, files] of Object.entries(customFieldUrls)) {
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

      // Step 3: Send candidate data as JSON (with URLs, not files)
      const createdCandidate = await createGuestCandidate(
        candidateData as Partial<Candidate>,
      ).unwrap();
      const candidateId = createdCandidate._id;

      storeGuestApplication(jobId, candidateId);

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

      sendAppliedEventMail(candidateId, applicationEventMailMutation);

      toast({
        title: 'Application Submitted',
        description: 'Your application has been successfully submitted.',
      });

      setIsSubmitting(false);
      return true;
    } catch (error) {
      logger.error('Guest application error:', error);
      toast({
        title: 'Error',
        description: extractErrorMessage(error),
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return false;
    }
  };

  return { submitApplication, isSubmitting };
};
