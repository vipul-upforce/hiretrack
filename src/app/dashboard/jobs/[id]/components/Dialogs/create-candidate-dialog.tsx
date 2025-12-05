'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Maximize, Minimize } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Formik, Form } from 'formik';
import { useState, useEffect } from 'react';
import useCustomForm, {
  CustomFieldValues,
} from '@/Custom_Fields/hooks/useCustomForm';
import { Resume } from '@/lib/redux/types';
import { useApplyHandler } from '@/app/apply-jobs/useApplyHandler';
import { TermsConfirmationDialog } from '@/components/TermsConfirmationDialog';
import { useSelector } from 'react-redux';
import FormUpdater from '../Utils/FormUpdater';
import { CandidateForm } from '../Candidate/candidate-form';
import { candidateSchema } from '../../schemas/candidate-schema';
import { CreateCandidateDialogHeader } from './create-candidate-components/CreateCandidateDialogHeader';
import { CreateCandidateDialogFooter } from './create-candidate-components/CreateCandidateDialogFooter';
import { useCreateCandidateSubmission } from './create-candidate-components/useCreateCandidateSubmission';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CreateCandidateDialogProps {
  jobId: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  resumeFile?: File | null;
  isCreating?: (isCreating: boolean) => void;
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
          // Dynamically import PDF parsing only on client side
          const { parseResumeFromPdf } = await import(
            '@/lib/parse-resume-from-pdf'
          );
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

// Add this function before handleSubmit
const checkPdfPageCount = async (file: File): Promise<number> =>
  // console.log("%%%%%%% ", file);
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      try {
        // Dynamically import pdfjs only on client side
        const pdfjs = await import('pdfjs-dist');

        // Configure worker if not already set
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
        }

        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        resolve(pdf.numPages);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
export function CreateCandidateDialog({
  jobId,
  isOpen,
  setIsOpen,
  resumeFile,
  jobTitle,
  primaryColor,
  secondaryColor,
  // isCreating,
}: CreateCandidateDialogProps) {
  const { formikRef, handleApply } = useApplyHandler<any>();
  const [parsedResumeData, setParsedResume] = useState<Resume | null>(null);
  const formName = 'Candidate';
  const { validationSchema, initialValues: inits } = useCustomForm(
    formName,
    jobId, // Pass the jobId to filter job-specific fields
    undefined, // No candidateId for new candidates
    false, // Don't use fetchGlobal, as we want job-specific fields too
  );
  const [resetForm, setResetForm] = useState(false);
  // const [user, setuser] = useState<User | null>(null);
  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {},
  );
  const [isClient, setIsClient] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<CandidateFormValues | null>(null);
  const [isLargeViewport, setIsLargeViewport] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const {
    submitCandidate,
    isCreating,
    isFormSubmitting,
    isLoading: isSubmissionLoading,
  } = useCreateCandidateSubmission({
    jobId,
    parsedResumeData,
    user,
    onSuccess: () => setIsOpen(false),
  });

  useEffect(() => {
    setIsClient(true);

    const checkScreenSize = () => {
      const isLarge = window.innerWidth >= 1300 && window.innerHeight >= 1000;
      setIsLargeViewport(isLarge);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsMaximized(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isClient) {
      if (resumeFile) {
        setParsedResume(null);
        handleFileParse(resumeFile, setParsedResume);
      }
    } else {
      setParsedResume(null);
      setResetForm((prev) => !prev);
    }
  }, [isOpen, resumeFile, isClient]);

  const handleTermsConfirm = () => {
    if (pendingFormValues) {
      setShowTermsDialog(false);
      submitCandidate(pendingFormValues);
      setPendingFormValues(null);
    }
  };

  const handleSubmit = async (values: CandidateFormValues) => {
    // Only show terms confirmation dialog for candidates applying through portal
    // Admin/HR users adding candidates internally should skip the terms dialog
    if (user?.role === 'candidate' || user?.role === '') {
      setPendingFormValues(values);
      setShowTermsDialog(true);
    } else {
      // Admin/HR users bypass terms dialog and submit directly
      submitCandidate(values);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {user && (user.role === 'candidate' || user?.role === '') ? (
          <button
            type="button"
            disabled={isSubmissionLoading || isCreating}
            onMouseEnter={(e) => {
              const target = e.target as HTMLElement;
              target.style.backgroundColor = secondaryColor;
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLElement;
              target.style.backgroundColor = primaryColor;
            }}
            style={{ backgroundColor: primaryColor }}
            className="inline-flex justify-center w-full rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {isSubmissionLoading || isCreating
              ? 'Processing...'
              : 'Apply Now'}
          </button>
        ) : (
          <Button variant="primary" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Candidate
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className={
          !isLargeViewport || isMaximized
            ? '!max-w-none !w-screen !h-[100dvh] !min-h-100dvh !max-h-[100dvh] !left-0 !top-0 !translate-x-0 !translate-y-0 !min-w-0 !inset-0 !m-0 !border-0 !rounded-none overflow-hidden flex flex-col p-0'
            : 'lg:max-w-[80vw] xl:max-w-[65vw] lg:h-[90vh] lg:border lg:rounded-lg p-0 overflow-hidden flex flex-col'
        }
        style={
          !isLargeViewport || isMaximized
            ? {
              position: 'fixed' as const,
              inset: 0,
              width: '100vw',
              height: '100dvh',
              minHeight: '100dvh',
              maxHeight: '100dvh',
              maxWidth: 'none',
              transform: 'none',
              left: 0,
              top: 0,
              margin: 0,
              border: 0,
              borderRadius: 0,
              zIndex: 9999,
            }
            : undefined
        }
      >
        <CreateCandidateDialogHeader
          userRole={user?.role}
          jobTitle={jobTitle}
          isLargeViewport={isLargeViewport}
          isMaximized={isMaximized}
          onToggleMaximize={() => setIsMaximized(!isMaximized)}
        />
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
          {({
            isSubmitting,
            errors,
            touched,
            setTouched,
            values,
            setFieldValue,
          }) => (
            <Form className="flex flex-col flex-1 min-h-0 sticky top-0 overflow-y-clip">
              <FormUpdater parsedResumeData={parsedResumeData} />
              <div className="flex-1 overflow-y-auto px-6 py-4 h-full">
                <CandidateForm
                  jobId={jobId}
                  onFileUpload={async (file: File) => {
                    setFieldValue('resume', file);
                    await handleFileParse(file, setParsedResume);
                    Object?.entries(values?.customFields).forEach(
                      ([key, value]) => {
                        setTouched({ [key]: true });
                      },
                    );
                  }}
                />
              </div>
              <CreateCandidateDialogFooter
                userRole={user?.role}
                isSubmitting={isSubmitting}
                isCreating={isCreating}
                isLoading={isSubmissionLoading}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                onCancel={() => setIsOpen(false)}
                onApply={handleApply}
                hasErrors={Object.keys(errors).length > 0}
              />
            </Form>
          )}
        </Formik>
      </DialogContent>

      <TermsConfirmationDialog
        isOpen={showTermsDialog}
        onClose={() => {
          setShowTermsDialog(false);
          setPendingFormValues(null);
        }}
        onConfirm={handleTermsConfirm}
        isLoading={isCreating || isSubmissionLoading}
      />
    </Dialog>
  );
}
