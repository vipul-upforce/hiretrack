'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Formik, Form } from 'formik';
import { useState, useEffect } from 'react';
import {
  useApplicationEventMailMutation,
  useCreateGuestCandidateMutation,
  useEvaluateCandidateMutation,
} from '@/lib/features/candidate/candidateApi';
import { v4 as uuidv4 } from 'uuid';
import useCustomForm, {
  CustomFieldValues,
} from '@/Custom_Fields/hooks/useCustomForm';
import { Resume } from '@/lib/redux/types';
import { parseResumeFromPdf } from '@/lib/parse-resume-from-pdf';
import * as pdfjs from 'pdfjs-dist';
import { TermsConfirmationDialog } from '@/components/TermsConfirmationDialog';
import { User } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import logger from '@/lib/logger';
import { useApplyHandler } from './useApplyHandler';
import { candidateSchema } from '../dashboard/jobs/[id]/schemas/candidate-schema';
import FormUpdater from '../dashboard/jobs/[id]/components/Utils/FormUpdater';
import { CandidateForm } from '../dashboard/jobs/[id]/components/Candidate/candidate-form';

// Configure PDF.js worker
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

// New function to store application status in localStorage
const storeGuestApplication = (jobId: string, candidateId: string) => {
  try {
    // Get existing applications or initialize empty object
    const existingApplications = JSON.parse(
      localStorage.getItem('guestApplications') || '{}',
    );

    // Add this application
    existingApplications[jobId] = {
      candidateId,
      appliedAt: new Date().toISOString(),
    };

    // Save back to localStorage
    localStorage.setItem(
      'guestApplications',
      JSON.stringify(existingApplications),
    );

    return true;
  } catch (error) {
    logger.error('Failed to store guest application status:', error);
    return false;
  }
};

// Function to check if user has already applied to this job
export const hasAppliedAsGuest = (jobId: string): boolean => {
  try {
    const applications = JSON.parse(
      localStorage.getItem('guestApplications') || '{}',
    );
    return !!applications[jobId];
  } catch {
    return false;
  }
};

// New function to call the evaluate API
export async function evaluateCandidate(
  candidateId: string,
  evaluateCandidateMutation: ReturnType<typeof useEvaluateCandidateMutation>[0],
) {
  try {
    const result = await evaluateCandidateMutation({ candidateId }).unwrap();
    return result;
  } catch (e) {
    return typeof e === 'object' &&
      'data' in e &&
      typeof e.data === 'object' &&
      'error' in e.data
      ? e.data.error
      : 'failed to re-evaluate candidate';
  }
}

// event mail handler function
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

interface CreateCandidateDialogProps {
  jobId: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  resumeFile?: File | null;
  closeParent: () => void;
  jobTitle?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

const getInitialValues = (customFields: CustomFieldValues) => ({
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
    reader.onerror = () => {};
    reader.readAsDataURL(file);
  }
};

type CandidateFormValues = ReturnType<typeof getInitialValues>;


export function ApplyAsGuestDialog({
  jobId,
  isOpen,
  setIsOpen,
  resumeFile,
  closeParent,
  jobTitle,
  primaryColor = '#6366f1',
}: CreateCandidateDialogProps) {
  const { toast } = useToast();
  const [createGuestCandidate] = useCreateGuestCandidateMutation();
  const [evaluateCandidateMutation] = useEvaluateCandidateMutation();
  const [applicationEventMailMutation, { isLoading: isSendingEmail }] =
    useApplicationEventMailMutation();
  const [parsedResumeData, setParsedResume] = useState<Resume | null>(null);
  const formName = 'Candidate';
  const { validationSchema, initialValues: inits } = useCustomForm(
    formName,
    undefined,
    undefined,
    true,
  );
  const [resetForm, setResetForm] = useState(false);
  const [hasAlreadyApplied, setHasAlreadyApplied] = useState(false);
  const { formikRef, handleApply } = useApplyHandler<CandidateFormValues>();
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<any>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Check if user has already applied when dialog opens
      setHasAlreadyApplied(hasAppliedAsGuest(jobId));

      if (resumeFile) {
        setParsedResume(null);
        handleFileParse(resumeFile, setParsedResume);
      }
    } else {
      setParsedResume(null);
      setResetForm((prev) => !prev);
    }
  }, [isOpen, resumeFile, jobId]);

  const handleTermsConfirm = () => {
    if (pendingFormValues) {
      setShowTermsDialog(false);
      actualSubmit(pendingFormValues);
      setPendingFormValues(null);
    }
  };

  const handleSubmit = async (values: CandidateFormValues) => {
    // Show terms confirmation dialog first
    setPendingFormValues(values);
    setShowTermsDialog(true);
  };

  const actualSubmit = async (values: CandidateFormValues) => {
    setIsSubmittingApplication(true);
    if (hasAppliedAsGuest(jobId)) {
      toast({
        title: 'Already Applied',
        description: 'You have already applied for this job as a guest.',
        variant: 'destructive',
      });
      setIsOpen(false);
      setIsSubmittingApplication(false);
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
      setIsSubmittingApplication(false);
      return;
    }

    try {
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
        return;
      }

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
              url: resumeBase64, // Using base64 as URL for now; adjust if backend changes
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

      // Step 1: Create the candidate
      const createdCandidate =
        await createGuestCandidate(candidateData).unwrap();
      const candidateId = createdCandidate._id;

      // Store application status in localStorage
      storeGuestApplication(jobId, candidateId);

      // Always attempt evaluation if resume is PDF - server will check page limits
      if (values.resume && values.resume.type === 'application/pdf') {
        try {
          evaluateCandidate(candidateId, evaluateCandidateMutation);
        } catch (evalError) {
          logger.warn(
            'AI evaluation failed or was skipped by server:',
            evalError,
          );
          // Continue with submission even if evaluation fails
        }
      }

      // Send application confirmation email
      sendAppliedEventMail(candidateId, applicationEventMailMutation);

      // Show success message for guest application
      toast({
        title: 'Application Submitted',
        description: 'Your application has been successfully submitted.',
      });

      setIsOpen(false);
      closeParent();
    } catch (error) {
      logger.error('Guest application error:', error);

      let errorMessage =
        'Failed to create candidate due to an unexpected error.';

      // Handle RTK Query error format
      if (typeof error === 'object' && error !== null) {
        if ('data' in error) {
          const errorData = (error as { data?: any }).data;
          if (errorData?.error) {
            errorMessage = errorData.error;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        } else if (
          'message' in error &&
          typeof (error as any).message === 'string'
        ) {
          errorMessage = (error as any).message;
        }
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingApplication(false);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={isSendingEmail || hasAlreadyApplied}
          className="inline-flex w-full items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:w-fit"
          style={
            hasAlreadyApplied
              ? {
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                }
              : {
                  backgroundColor: `${primaryColor}15`,
                  color: primaryColor,
                  border: `2px solid ${primaryColor}`,
                }
          }
          onMouseEnter={(e) => {
            if (!hasAlreadyApplied && !isSendingEmail) {
              const target = e.target as HTMLElement;
              target.style.backgroundColor = primaryColor;
              target.style.color = 'white';
            }
          }}
          onMouseLeave={(e) => {
            if (!hasAlreadyApplied && !isSendingEmail) {
              const target = e.target as HTMLElement;
              target.style.backgroundColor = `${primaryColor}15`;
              target.style.color = primaryColor;
            }
          }}
        >
          {isSendingEmail && !hasAlreadyApplied ? (
            <>
              <div
                className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2"
                style={{ borderColor: primaryColor }}
              />
              Processing...
            </>
          ) : hasAlreadyApplied ? (
            <>
              <svg
                className="mr-2 h-4 w-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Applied
            </>
          ) : (
            <>
              <User className="mr-2 h-4 w-4" />
              Apply As Guest
            </>
          )}
        </button>
      </DialogTrigger>
      <DialogContent
        className={`${isSmallScreen ? 'fixed inset-0 m-0 max-h-none w-screen max-w-none rounded-none border-0 p-0' : 'lg:h-[85dvh] lg:max-h-[85dvh] lg:w-[85vw] lg:max-w-[85vw] lg:rounded-lg lg:border xl:h-[80dvh] xl:max-h-[80dvh] xl:w-[80vw] xl:max-w-[80vw]'} flex flex-col justify-center overflow-hidden`}
        style={
          isSmallScreen
            ? ({
                position: 'fixed',
                inset: '0',
                transform: 'none',
                left: '0',
                top: '0',
                width: '100vw',
                height: '100dvh',
                maxWidth: 'none',
                maxHeight: 'none',
                margin: '0',
                borderRadius: '0',
                border: 'none',
                zIndex: 9999,
              } as React.CSSProperties)
            : undefined
        }
      >
        <DialogHeader
          className={`flex-shrink-0 px-6 py-4 text-left ${hasAlreadyApplied && 'hidden'}`}
        >
          <DialogTitle className="text-left text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
            Apply
          </DialogTitle>
          {jobTitle && (
            <p className="mt-1 text-left text-sm text-gray-600 dark:text-gray-400">
              Applying for: {jobTitle}
            </p>
          )}
        </DialogHeader>
        {hasAlreadyApplied ? (
          <div className="flex h-full flex-col items-center justify-center p-4 text-center sm:p-6">
            <div className="w-full max-w-md space-y-4">
              <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-green-100 sm:h-40 sm:w-40">
                <svg
                  className="h-16 w-16 text-green-600 sm:h-20 sm:w-20"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold sm:text-xl">
                Application Already Submitted
              </h3>
              <p className="mb-4 text-sm text-muted-foreground sm:text-base">
                We've received your application for this job. No further action
                is needed at this time.
              </p>
              <Button
                onClick={() => setIsOpen(false)}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <Formik
            innerRef={formikRef}
            key={resetForm.toString()}
            initialValues={{
              ...getInitialValues(inits as CustomFieldValues),
              resume: resumeFile || null,
            }}
            validationSchema={candidateSchema(validationSchema)}
            onSubmit={handleSubmit}
            enableReinitialize={false}
          >
            {({ isSubmitting, errors, touched, setFieldValue }) => (
              <Form className="sticky top-0 flex min-h-0 flex-1 flex-col overflow-y-clip">
                <FormUpdater parsedResumeData={parsedResumeData} />
                <div className="flex-1 overflow-hidden border-t px-6 py-4">
                  <CandidateForm
                    jobId={jobId}
                    onFileUpload={async (file: File) => {
                      setFieldValue('resume', file);
                      await handleFileParse(file, setParsedResume);
                    }}
                  />
                </div>
                <div className="safe-area-inset-bottom sticky bottom-0 z-10 flex flex-shrink-0 justify-end space-x-2 border-t bg-background px-6 py-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 transition-all duration-200 hover:shadow-md sm:flex-none"
                    style={{
                      borderColor: '#d1d5db',
                      color: '#6b7280',
                    }}
                    onMouseEnter={(e) => {
                      const target = e.target as HTMLElement;
                      target.style.borderColor = '#9ca3af';
                      target.style.backgroundColor = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      const target = e.target as HTMLElement;
                      target.style.borderColor = '#d1d5db';
                      target.style.backgroundColor = 'transparent';
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type={Object.keys(errors).length == 0 ? 'button' : 'submit'}
                    onClick={handleApply}
                    variant="primary"
                    disabled={isSubmitting || isSubmittingApplication}
                    className="flex-1 text-white transition-all duration-200 hover:shadow-md sm:flex-none"
                  >
                    {isSubmitting || isSubmittingApplication ? (
                      <>
                        <Spinner />
                        Saving...
                      </>
                    ) : (
                      'Apply'
                    )}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        )}
      </DialogContent>

      <TermsConfirmationDialog
        isOpen={showTermsDialog}
        onClose={() => {
          setShowTermsDialog(false);
          setPendingFormValues(null);
        }}
        onConfirm={handleTermsConfirm}
        isLoading={isSendingEmail}
      />
    </Dialog>
  );
}
