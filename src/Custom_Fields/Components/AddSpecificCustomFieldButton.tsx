"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import CustomFieldDialog from "./Common/CustomFieldDialog";
import { CustomField } from "../Types/CustomField";
import SpecificCustomFieldList from "./List/SpecificCustomFieldList";

interface AddJobOrCandidateCustomFieldProps {
  jobId?: string;
  candidateId?: string;
  onSave: (newField: CustomField) => void;
}

export function AddSpecificCustomFieldButton({
  onSave,
  jobId,
  candidateId,
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
        Meta Fields
      </Button>
      <CustomFieldDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Meta Fields"
      >
        {/* <AddSpecificCustomFieldForm
          handleClose={handleClose}
          onSave={handleSave}
          jobId={jobId}
          candidateId={candidateId}
        /> */}
        <SpecificCustomFieldList jobId={jobId} candidateId={candidateId} />
      </CustomFieldDialog>
    </div>
  );
}
