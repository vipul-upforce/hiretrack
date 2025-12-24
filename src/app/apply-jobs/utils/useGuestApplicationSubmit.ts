import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import {
  useCreateGuestCandidateMutation,
  useEvaluateCandidateMutation,
  useApplicationEventMailMutation,
} from '@/lib/features/candidate/candidateApi';
import { Resume } from '@/lib/redux/types';
import { CustomFieldValues } from '@/Custom_Fields/hooks/useCustomForm';
import { v4 as uuidv4 } from 'uuid';
import {
  storeGuestApplication,
  hasAppliedAsGuest,
  evaluateCandidate,
  sendAppliedEventMail,
  convertFileToBase64,
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
      const resumeBase64 = values.resume
        ? await convertFileToBase64(values.resume)
        : null;

      const attachmentsBase64 = await Promise.all(
        values.attachments.map((file) => convertFileToBase64(file)),
      );

      const candidateData = {
        ...values,
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
        resume: resumeBase64
          ? {
              id: uuidv4(),
              name: values.resume?.name || '',
              url: resumeBase64,
              type: 'pdf',
              size: values.resume?.size || 0,
            }
          : undefined,
        attachments: attachmentsBase64.map((base64, index) => ({
          id: uuidv4(),
          name: values.attachments[index].name,
          url: base64,
          type: values.attachments[index].type,
          size: values.attachments[index].size,
        })),
        remarks: [],
      };

      const createdCandidate =
        await createGuestCandidate(candidateData).unwrap();
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
