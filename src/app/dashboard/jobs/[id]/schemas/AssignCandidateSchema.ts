import * as Yup from "yup";
import { Candidate } from "@/types/candidate";
import { Dayjs } from "dayjs";

// Interface for attachment objects
export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

// Interface for user objects
export interface User {
  id: string;
  name: string;
  email: string;
}

// Interface for form values
export interface FormValues {
  interviewerId: string;
  time: Dayjs | null;
  remark: string;
  rating: number | null;
  attachments: Attachment[];
}

// Interface for AssignCandidateDialog props
export interface AssignCandidateDialogProps {
  candidate: Candidate;
  refetch: () => void;
  isOpen?: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updatedCandidate: Candidate) => void;
  setLocalCandidate: (candidate: Candidate) => void;
  refetchAssignment?: () => void;
  onSuccess: () => void;
}

// Validation schema for the AssignCandidateDialog form
export const validationSchema = Yup.object({
  interviewerId: Yup.string().required("Interviewer is required"),
  time: Yup.date().min(new Date(), "Past date is not allowed").nullable(),
  remark: Yup.string(),
  rating: Yup.number().nullable(),
  attachments: Yup.array(),
});
