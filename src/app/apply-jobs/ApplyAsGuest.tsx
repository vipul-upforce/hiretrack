'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Formik, Form, FormikProps } from 'formik';
import { useState, useEffect, type CSSProperties } from 'react';
import React from 'react';
import useCustomForm, {
  CustomFieldValues,
} from '@/Custom_Fields/hooks/useCustomForm';
import { Resume } from '@/lib/redux/types';
import * as pdfjs from 'pdfjs-dist';
import { TermsConfirmationDialog } from '@/components/TermsConfirmationDialog';
import { Spinner } from '@/components/ui/spinner';
import { useApplyHandler } from './useApplyHandler';
import { useUnsavedChangesProtection } from './useUnsavedChangesProtection';
import { candidateSchema } from '../dashboard/jobs/[id]/schemas/candidate-schema';
import FormUpdater from '../dashboard/jobs/[id]/components/Utils/FormUpdater';
import { CandidateForm } from '../dashboard/jobs/[id]/components/Candidate/candidate-form';
import {
  hasAppliedAsGuest,
  handleFileParse,
  getInitialValues,
} from './utils/guestApplicationUtils';
import { useGuestApplicationSubmit } from './utils/useGuestApplicationSubmit';
import { useScreenSize } from './utils/useScreenSize';
import { GuestApplyTrigger } from './components/GuestApplyTrigger';
import { AlreadyAppliedView } from './components/AlreadyAppliedView';
import ConfirmationDialog from '../dashboard/jobs/[id]/components/Dialogs/ConfirmationDialog';

if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

interface CreateCandidateDialogProps {
  jobId: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  resumeFile?: File | null;
  closeParent: () => void;
  jobTitle?: string;
  primaryColor?: string;
}

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
  const [parsedResumeData, setParsedResume] = useState<Resume | null>(null);
  const formName = 'Candidate';
  const { validationSchema, initialValues: inits } = useCustomForm(
    formName,
    jobId,
    undefined,
    true,
  );
  const [resetForm, setResetForm] = useState(false);
  const [hasAlreadyApplied, setHasAlreadyApplied] = useState(false);
  const { formikRef, handleApply } = useApplyHandler<CandidateFormValues>();
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [pendingFormValues, setPendingFormValues] =
    useState<CandidateFormValues | null>(null);
  const isSmallScreen = useScreenSize();
  const { submitApplication, isSubmitting: isSubmittingApplication } =
    useGuestApplicationSubmit(jobId, parsedResumeData);

  const {
    showUnsavedChangesDialog,
    handleDialogClose,
    handleCancelClick,
    handleConfirmClose,
    handleCancelClose,
  } = useUnsavedChangesProtection({
    formikRef: formikRef as React.RefObject<FormikProps<CandidateFormValues> | null>,
    isOpen,
    setIsOpen,
    onCloseCallback: closeParent,
  });

  useEffect(() => {
    if (isOpen) {
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

  const handleSubmit = async (values: CandidateFormValues) => {
    setPendingFormValues(values);
    setShowTermsDialog(true);
  };

  const actualSubmit = async (values: CandidateFormValues) => {
    const success = await submitApplication(values);
    if (success) {
      setIsOpen(false);
      closeParent();
    }
  };

  const handleTermsConfirm = () => {
    if (pendingFormValues) {
      setShowTermsDialog(false);
      actualSubmit(pendingFormValues);
      setPendingFormValues(null);
    }
  };


  const dialogContentStyle = isSmallScreen
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
      } as CSSProperties)
    : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <GuestApplyTrigger
          hasAlreadyApplied={hasAlreadyApplied}
          isSendingEmail={isSubmittingApplication}
          primaryColor={primaryColor}
          onClick={() => setIsOpen(true)}
        />
      </DialogTrigger>
      <DialogContent
        className={`${isSmallScreen ? 'fixed inset-0 m-0 max-h-none w-screen max-w-none rounded-none border-0 p-0' : 'lg:h-[85dvh] lg:max-h-[85dvh] lg:w-[85vw] lg:max-w-[85vw] lg:rounded-lg lg:border xl:h-[80dvh] xl:max-h-[80dvh] xl:w-[80vw] xl:max-w-[80vw]'} flex flex-col justify-center overflow-hidden`}
        style={dialogContentStyle}
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
          <AlreadyAppliedView onClose={() => setIsOpen(false)} />
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
            enableReinitialize
          >
            {({ isSubmitting, setFieldValue }) => (
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
                    onClick={handleCancelClick}
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
                    type="button"
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
        isLoading={isSubmittingApplication}
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
