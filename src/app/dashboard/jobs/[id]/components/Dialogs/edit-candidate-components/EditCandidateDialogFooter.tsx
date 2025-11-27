/**
 * Edit Candidate Dialog Footer Component
 * Displays action buttons for form submission
 */

import { Button } from "@/components/ui/button";
import { AddSpecificCustomFieldButton } from "@/Custom_Fields/Components/AddSpecificCustomFieldButton";

interface EditCandidateDialogFooterProps {
  candidateId: string;
  candidateName: string;
  isSubmitting: boolean;
  hasErrors: boolean;
  onCancel: () => void;
  onApply: () => void;
  onAddCustomField: (newField: any, formId: string | null) => void;
  selectedFormId: string | null;
}

export function EditCandidateDialogFooter({
  candidateId,
  candidateName,
  isSubmitting,
  hasErrors,
  onCancel,
  onApply,
  onAddCustomField,
  selectedFormId,
}: EditCandidateDialogFooterProps) {
  return (
    <div className="flex justify-between space-x-2 border-t bg-background px-6 py-4 sticky bottom-0 z-10">
      <AddSpecificCustomFieldButton
        candidateId={candidateId}
        candidateName={candidateName}
        onSave={(newField) => {
          console.log("newField", newField);
          console.log("selectedFormId", selectedFormId);
          onAddCustomField(newField, selectedFormId);
        }}
      />
      <div className="gap-3 flex bottom-0">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={onApply}
          type={hasErrors ? "button" : "submit"}
          variant="primary"
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}



