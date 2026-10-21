'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Formik, Form, FormikProps } from 'formik';
import { Candidate } from '@/types/candidate';
import { useParams, usePathname } from 'next/navigation';
import useCustomForm from '@/Custom_Fields/hooks/useCustomForm';
import React, { useContext, useEffect, useState } from 'react';
import { Resume } from '@/lib/redux/types';
import { useApplyHandler } from '@/app/apply-jobs/useApplyHandler';
import { useUnsavedChangesProtection } from '@/app/apply-jobs/useUnsavedChangesProtection';
import { AddSpecificCustomFieldButton } from '@/Custom_Fields/Components/AddSpecificCustomFieldButton';
import { CustomFieldsContext } from '@/Custom_Fields/Context';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import logger from '@/lib/logger';
import FormUpdater from '../Utils/FormUpdater';
import { getJobId } from '../../utils/candidateAccessors';
import { CandidateForm } from '../Candidate/candidate-form';
import { candidateSchema } from '../../schemas/candidate-schema';
import { EditCandidateDialogHeader } from './edit-candidate-components/EditCandidateDialogHeader';
import { useEditCandidateSubmit } from './edit-candidate-components/useEditCandidateSubmit';
import { parseResumeFile } from './edit-candidate-components/parseResumeFile';
import ConfirmationDialog from './ConfirmationDialog';

interface EditCandidateDialogProps {
  candidate: Candidate;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updatedCandidate: Candidate) => void;
  refetchAssignment?: () => void;
  onSuccess: () => void;
  reopenDetailsDialog?: () => void;
}

export function EditCandidateDialog({
  candidate,
  isOpen,
  onOpenChange,
  onUpdate,
  refetchAssignment,
  onSuccess,
  reopenDetailsDialog,
}: EditCandidateDialogProps) {
  const id = useParams()?.id as string;
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  const [isMaximized, setIsMaximized] = useState(false);

  const formName = 'Candidate';
  const { getDefaultValues, validationSchema } = useCustomForm(
    formName,
    id,
    candidate._id,
  );
  const [parsedResumeData, setParsedResume] = useState<Resume | null>(null);
  const { formikRef, handleApply } = useApplyHandler<Candidate>();
  const { handleSubmit } = useEditCandidateSubmit({
    candidate,
    pathname,
    jobIdFromParams: id ?? undefined,
    formikRef: formikRef as React.RefObject<FormikProps<Candidate> | null>,
    onUpdate,
    onSuccess,
    onOpenChange,
    refetchAssignment,
    reopenDetailsDialog,
  });
  const {
    setStepName,
    customFields,
    setSelectedFormId,
  } = useContext(CustomFieldsContext);
  useEffect(() => {
    setStepName('Candidate');
    if (customFields) {
      const candidateForm = Object.entries(customFields).find(
        ([, form]) => form.formName === 'Candidate',
      );

      if (candidateForm) {
        const [formId, form] = candidateForm;
        setSelectedFormId({
          formId,
          formName: form.formName,
          fields: form.fields,
        });
      }
    }

    return () => {
      setSelectedFormId(null);
      setStepName('FormList');
    };
  }, [customFields, setSelectedFormId, setStepName]);

  const {
    showUnsavedChangesDialog,
    handleDialogClose: handleUnsavedDialogClose,
    handleCancelClick: handleUnsavedCancelClick,
    handleConfirmClose: handleUnsavedConfirmClose,
    handleCancelClose: handleUnsavedCancelClose,
  } = useUnsavedChangesProtection({
    formikRef: formikRef as React.RefObject<FormikProps<Candidate> | null>,
    isOpen,
    setIsOpen: onOpenChange,
    onCloseCallback: () => {
      setSelectedFormId(null);
    },
  });

  let interviewerId: string | null = null;
  if (candidate?.assignment?.interviewerId) {
    if (typeof candidate.assignment.interviewerId === 'string') {
      interviewerId =
        !candidate.assignment.interviewerId ||
          candidate.assignment.interviewerId === '' ||
          candidate.assignment.interviewerId === '-1'
          ? null
          : candidate.assignment.interviewerId;
    } else if (candidate.assignment.interviewerId?._id) {
      const interviewerIdValue = candidate.assignment.interviewerId._id.replace(/"/g, '');
      interviewerId = !interviewerIdValue || interviewerIdValue === '' || interviewerIdValue === '-1' ? null : interviewerIdValue;
    }
  }

  const initialValues: Candidate = {
    ...candidate,
    resume: candidate.resume,
    attachments: candidate.attachments,
    email: candidate.email,
    assignment:
      candidate.assignment && Object.keys(candidate.assignment).length > 1
        ? {
          ...candidate.assignment,
          interviewerId: interviewerId || null,
          time: candidate.assignment.time,
          assignedAt: candidate.assignment.assignedAt,
        }
        : null,
    customFields: getDefaultValues(candidate.customFields || {}),
  };

  useEffect(() => {
    if (!isOpen) {
      setIsMaximized(false);
    }
  }, [isOpen]);

  const handleDialogClose = (open: boolean) => {
    if (!open && !showUnsavedChangesDialog) {
      setSelectedFormId(null);
    }
    handleUnsavedDialogClose(open);
  };

  const handleCancelClick = () => {
    handleUnsavedCancelClick();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent
        className={
          !isDesktop || isMaximized
            ? 'dialog-fullscreen-mode flex flex-col overflow-hidden'
            : `dialog-modal-mode ${candidate.resume ? 'xl-max-w-65vw' : 'xl-max-w-50vw'} flex flex-col justify-between overflow-hidden`
        }
      >
        <EditCandidateDialogHeader
          isLargeViewport={isDesktop}
          isMaximized={isMaximized}
          onToggleMaximize={() => setIsMaximized(!isMaximized)}
        />
        <Formik
          innerRef={formikRef}
          initialValues={initialValues}
          validationSchema={candidateSchema(validationSchema)}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ isSubmitting, errors, setFieldValue }) => (
            <Form className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <FormUpdater parsedResumeData={parsedResumeData} />
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <CandidateForm
                  jobId={getJobId(candidate) || id}
                  onFileUpload={async (file: File) => {
                    setFieldValue('resume', file);
                    await parseResumeFile(file, setParsedResume);
                  }}
                  isEditMode
                />
              </div>
              <div className="sticky bottom-0 z-10 flex justify-between space-x-2 border-t bg-background px-6 py-4">
                <AddSpecificCustomFieldButton
                  candidateId={candidate._id}
                  candidateName={candidate.name}
                />
                <div className="bottom-0 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelClick}
                  >
                    Cancel
                  </Button>

                  <Button
                    onClick={() => {
                      handleApply();
                    }}
                    disabled={isSubmitting}
                    type={Object.keys(errors).length === 0 ? 'button' : 'submit'}
                    variant="primary"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </DialogContent>

      <ConfirmationDialog
        isOpen={showUnsavedChangesDialog}
        setIsOpen={(open) => {
          if (!open) handleUnsavedCancelClose();
        }}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to close? All unsaved data will be lost."
        onConfirm={handleUnsavedConfirmClose}
        onCancel={handleUnsavedCancelClose}
        buttonName="Discard Changes"
      />
    </Dialog>
  );
}
