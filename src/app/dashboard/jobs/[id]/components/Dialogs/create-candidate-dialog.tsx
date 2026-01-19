'use client';

import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Formik, Form } from 'formik';
import { useState, useEffect } from 'react';
import useCustomForm, {
  CustomFieldValues,
} from '@/Custom_Fields/hooks/useCustomForm';
import { Resume } from '@/lib/redux/types';
import { useApplyHandler } from '@/app/apply-jobs/useApplyHandler';
import { useUnsavedChangesProtection } from '@/app/apply-jobs/useUnsavedChangesProtection';
import { TermsConfirmationDialog } from '@/components/TermsConfirmationDialog';
import { useAppSelector } from '@/lib/redux/hooks';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import FormUpdater from '../Utils/FormUpdater';
import { CandidateForm } from '../Candidate/candidate-form';
import { candidateSchema } from '../../schemas/candidate-schema';
import { CreateCandidateDialogHeader } from './create-candidate-components/CreateCandidateDialogHeader';
import { CreateCandidateDialogFooter } from './create-candidate-components/CreateCandidateDialogFooter';
import { useCreateCandidateSubmission } from './create-candidate-components/useCreateCandidateSubmission';
import ConfirmationDialog from './ConfirmationDialog';

interface CreateCandidateDialogProps {
  jobId: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  resumeFile?: File | null;
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
  assignment: null,
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
          const { parseResumeFromPdf } =
            await import('@/lib/parse-resume-from-pdf');
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

export function CreateCandidateDialog({
  jobId,
  isOpen,
  setIsOpen,
  resumeFile,
  jobTitle,
  primaryColor,
  secondaryColor,
}: CreateCandidateDialogProps) {
  const { formikRef, handleApply } = useApplyHandler<CandidateFormValues>();
  const [parsedResumeData, setParsedResume] = useState<Resume | null>(null);
  const formName = 'Candidate';
  const { validationSchema, initialValues: inits } = useCustomForm(
    formName,
    jobId, // Pass the jobId to filter job-specific fields
    undefined, // No candidateId for new candidates
    false, // Don't use fetchGlobal, as we want job-specific fields too
  );
  const [resetForm, setResetForm] = useState(false);
  const { user } = useAppSelector((state) => state.auth || {});
  const [isClient, setIsClient] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [pendingFormValues, setPendingFormValues] =
    useState<CandidateFormValues | null>(null);
  const isDesktop = useIsDesktop();
  const [isMaximized, setIsMaximized] = useState(false);

  const {
    showUnsavedChangesDialog,
    handleDialogClose,
    handleCancelClick,
    handleConfirmClose,
    handleCancelClose,
  } = useUnsavedChangesProtection({
    formikRef,
    isOpen,
    setIsOpen,
  });

  const {
    submitCandidate,
    isCreating,
    isLoading: isSubmissionLoading,
  } = useCreateCandidateSubmission({
    jobId,
    parsedResumeData,
    user,
    onSuccess: () => setIsOpen(false),
  });

  useEffect(() => {
    setIsClient(true);
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
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        {user && (user.role === 'candidate' || user?.role === '') ? (
          <button
            type="button"
            disabled={isSubmissionLoading || isCreating}
            onMouseEnter={(e) => {
              const target = e.target as HTMLElement;
              target.style.backgroundColor = secondaryColor || '';
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLElement;
              target.style.backgroundColor = primaryColor || '';
            }}
            style={{ backgroundColor: primaryColor }}
            className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {isSubmissionLoading || isCreating ? 'Processing...' : 'Apply Now'}
          </button>
        ) : (
          <Button variant="primary" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Candidate
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className={
          !isDesktop || isMaximized
            ? 'dialog-fullscreen-mode flex flex-col overflow-hidden p-0'
            : 'dialog-modal-mode xl-max-w-65vw flex flex-col overflow-hidden p-0'
        }
      >
        <CreateCandidateDialogHeader
          userRole={user?.role}
          jobTitle={jobTitle}
          isLargeViewport={isDesktop}
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
          {({ isSubmitting, setTouched, values, setFieldValue }) => (
            <Form className="sticky top-0 flex min-h-0 flex-1 flex-col overflow-y-clip">
              <FormUpdater parsedResumeData={parsedResumeData} />
              <div className="h-full flex-1 overflow-y-auto px-6 py-4">
                <CandidateForm
                  jobId={jobId}
                  onFileUpload={async (file: File) => {
                    setFieldValue('resume', file);
                    await handleFileParse(file, setParsedResume);
                    Object?.entries(values?.customFields).forEach(([key]) => {
                      setTouched({ [key]: true });
                    });
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
                onCancel={handleCancelClick}
                onApply={handleApply}
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

      <ConfirmationDialog
        isOpen={showUnsavedChangesDialog}
        setIsOpen={(open) => {
          if (!open) handleCancelClose();
        }}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to close? All unsaved data will be lost."
        onConfirm={handleConfirmClose}
        onCancel={handleCancelClose}
        buttonName="Discard Changes"
      />
    </Dialog>
  );
}
