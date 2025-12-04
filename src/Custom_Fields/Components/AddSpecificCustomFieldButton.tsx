'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import CustomFieldDialog from './Common/CustomFieldDialog';
import { CustomField } from '../Types/CustomField';
import SpecificCustomFieldList from './List/SpecificCustomFieldList';

interface AddJobOrCandidateCustomFieldProps {
  jobId?: string;
  candidateId?: string;
  jobTitle?: string;
  candidateName?: string;
  onSave: (newField: CustomField) => void;
}

export function AddSpecificCustomFieldButton({
  onSave,
  jobId,
  candidateId,
  jobTitle,
  candidateName,
}: AddJobOrCandidateCustomFieldProps) {
  const [isOpen, setIsOpen] = useState(false);

  // const handleSave = (newField: CustomField) => {
  //   onSave(newField);
  //   setIsOpen(false);
  // };

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <div>
      <Button type="button" variant="secondary" onClick={() => setIsOpen(true)}>
        {/* <Plus className="h-4 w-4 mr-2" /> */}
        {jobId ? 'Personalized fields for this Job' : 'Personalized fields for this Candidate'}
      </Button>
      <CustomFieldDialog
        isOpen={isOpen}
        onClose={handleClose}
        title={jobId ? 'Personalized fields for this Job' : 'Personalized fields for this Candidate'}
      >
        {/* <AddSpecificCustomFieldForm
          handleClose={handleClose}
          onSave={handleSave}
          jobId={jobId}
          candidateId={candidateId}
        /> */}
        <SpecificCustomFieldList jobId={jobId} candidateId={candidateId} jobTitle={jobTitle} candidateName={candidateName} />
      </CustomFieldDialog>
    </div>
  );
}
