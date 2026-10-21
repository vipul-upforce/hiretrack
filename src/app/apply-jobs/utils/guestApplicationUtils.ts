import logger from '@/lib/logger';
import {
  useApplicationEventMailMutation,
  useEvaluateCandidateMutation,
} from '@/lib/features/candidate/candidateApi';
import { Resume } from '@/lib/redux/types';
import { parseResumeFromPdf } from '@/lib/parse-resume-from-pdf';
import { CustomFieldValues } from '@/Custom_Fields/hooks/useCustomForm';

const GUEST_APPLICATIONS_KEY = 'guestApplications';

export const storeGuestApplication = (
  jobId: string,
  candidateId: string,
): boolean => {
  try {
    const existingApplications = JSON.parse(
      localStorage.getItem(GUEST_APPLICATIONS_KEY) || '{}',
    );
    existingApplications[jobId] = {
      candidateId,
      appliedAt: new Date().toISOString(),
    };
    localStorage.setItem(
      GUEST_APPLICATIONS_KEY,
      JSON.stringify(existingApplications),
    );
    return true;
  } catch (error) {
    logger.error('Failed to store guest application status:', error);
    return false;
  }
};

export const hasAppliedAsGuest = (jobId: string): boolean => {
  try {
    const applications = JSON.parse(
      localStorage.getItem(GUEST_APPLICATIONS_KEY) || '{}',
    );
    return !!applications[jobId];
  } catch {
    return false;
  }
};

export const evaluateCandidate = async (
  candidateId: string,
  evaluateCandidateMutation: ReturnType<typeof useEvaluateCandidateMutation>[0],
) => {
  try {
    const result = await evaluateCandidateMutation({ candidateId }).unwrap();
    return result;
  } catch (e) {
    return typeof e === 'object' &&
      e !== null &&
      'data' in e &&
      e.data !== null &&
      typeof e.data === 'object' &&
      'error' in e.data
      ? e.data.error
      : 'failed to re-evaluate candidate';
  }
};

export const sendAppliedEventMail = async (
  candidateId: string,
  applicationEventMailMutation: ReturnType<
    typeof useApplicationEventMailMutation
  >[0],
) => {
  try {
    const resp = await applicationEventMailMutation({ candidateId }).unwrap();
    return resp;
  } catch {
    return null;
  }
};

export const convertFileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

export const handleFileParse = async (
  file: File | null,
  setParsedResume: (data: Resume | null) => void,
) => {
  if (file && file.type === 'application/pdf') {
    const reader = new FileReader();
    reader.onload = async () => {
      const { result } = reader;
      if (result && typeof result === 'string') {
        try {
          const parsedData = await parseResumeFromPdf(result);
          setParsedResume(parsedData);
        } catch {
          setParsedResume(null);
        }
      }
    };
    reader.onerror = () => {};
    reader.readAsDataURL(file);
  }
};

export const getInitialValues = (customFields: CustomFieldValues) => ({
  name: '',
  location: '',
  experience: 0,
  relevantExperience: 0,
  skills: [],
  expectedCTC: 0,
  currentCTC: 0,
  noticePeriod: 0,
  resume: null as File | null,
  remarks: '',
  attachments: [] as File[],
  assignee: '',
  time: undefined,
  customFields: { ...customFields },
  email: '',
  contact: '',
});

export const extractErrorMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null) {
    if ('data' in error) {
      const errorData = (error as { data?: unknown }).data;
      if (errorData && typeof errorData === 'object') {
        if ('error' in errorData && typeof errorData.error === 'string') {
          return errorData.error;
        }
        if ('message' in errorData && typeof errorData.message === 'string') {
          return errorData.message;
        }
      }
      if (typeof errorData === 'string') {
        return errorData;
      }
    }
    if (
      'message' in error &&
      typeof (error as { message: unknown }).message === 'string'
    ) {
      return (error as { message: string }).message;
    }
  }
  return 'Failed to create candidate due to an unexpected error.';
};

export const validateFormValues = (
  values: Record<string, unknown>,
): string | null => {
  const hasOnlySpaces = Object.entries(values).some((value) => {
    if (typeof value[1] === 'string') {
      return value[1].length > 0 && value[1].trim() === '';
    }
    return false;
  });

  if (hasOnlySpaces) {
    return 'Fields cannot contain only spaces';
  }

  const fileNames = Array.isArray(values.attachments)
    ? (values.attachments as File[]).map((file) => file.name)
    : [];
  const hasDuplicates = new Set(fileNames).size !== fileNames.length;

  if (hasDuplicates) {
    return 'Duplicate file names found! Please rename before submitting.';
  }

  return null;
};
