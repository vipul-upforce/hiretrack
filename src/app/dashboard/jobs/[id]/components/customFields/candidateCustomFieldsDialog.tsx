import CustomFieldDialog from "@/Custom_Fields/Components/Common/CustomFieldDialog";
import JobSpecificCustomFields from "./jobSpecificCustomFields";

export default function CandidateCustomFieldsDialog({
  isOpen,
  onClose,
  jobId,
}: {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
}) {
  return (
    <CustomFieldDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Job-specific candidate form fields"
    >
      <JobSpecificCustomFields jobId={jobId} />
    </CustomFieldDialog>
  );
}
