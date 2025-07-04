"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CustomFieldDialog from "./Common/CustomFieldDialog";
import { CustomField } from "../Types/CustomField";
import { AddSpecificCustomFieldForm } from "./AddSpecificCustomFieldForm";

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

  const handleSave = (newField: CustomField) => {
    onSave(newField);
    setIsOpen(false);
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <div>
      <Button type="button" onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Custom Field
      </Button>
      <CustomFieldDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Add Custom Field"
      >
        <AddSpecificCustomFieldForm
          handleClose={handleClose}
          onSave={handleSave}
          jobId={jobId}
          candidateId={candidateId}
        />
      </CustomFieldDialog>
    </div>
  );
}
