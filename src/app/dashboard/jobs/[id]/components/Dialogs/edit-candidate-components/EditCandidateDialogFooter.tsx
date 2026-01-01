/**
 * Edit Candidate Dialog Footer Component
 * Displays action buttons for form submission
 */

import { Button } from '@/components/ui/button';
import { AddSpecificCustomFieldButton } from '@/Custom_Fields/Components/AddSpecificCustomFieldButton';
// import { CustomField } from '@/Custom_Fields/Types/CustomField';

interface EditCandidateDialogFooterProps {
  candidateId: string;
  candidateName: string;
  isSubmitting: boolean;
  hasErrors: boolean;
  onCancel: () => void;
  onApply: () => void;
  // onAddCustomField: (newField: CustomField, formId: string | null) => void;
  // selectedFormId: string | null;
}

export function EditCandidateDialogFooter({
  candidateId,
  candidateName,
  isSubmitting,
  hasErrors,
  onCancel,
  onApply,
  // onAddCustomField,
  // selectedFormId,
}: EditCandidateDialogFooterProps) {
  return (
    <div className="sticky bottom-0 z-10 flex justify-between space-x-2 border-t bg-background px-6 py-4">
      <AddSpecificCustomFieldButton
        candidateId={candidateId}
        candidateName={candidateName}
        // onSave={(newField) => {
        //   onAddCustomField(newField, selectedFormId);
        // }}
      />
      <div className="bottom-0 flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={onApply}
          type={hasErrors ? 'button' : 'submit'}
          variant="primary"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
