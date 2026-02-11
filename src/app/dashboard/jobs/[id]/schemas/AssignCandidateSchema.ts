import * as Yup from 'yup';
import { Candidate } from '@/types/candidate';
import { Dayjs } from 'dayjs';

// Interface for attachment objects
export interface Attachment {
  id: string;
  name: string;
  url: string;
  base64?: string;
  type: string;
  size: number;
}

// Interface for user objects
export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  organizationInfo?: {
    name: string;
    _id: string;
  };
}

// Interface for form values
export interface FormValues {
  interviewerId: string | null;
  time: Dayjs | null;
  remark: string;
  rating: number | null;
  attachments: Attachment[];
  scheduleGoogleMeet?: boolean;
  meetDuration?: number;
  meetingNotes?: string;
  meetingAttachments?: Attachment[];
  additionalGuests?: string[];
  scheduleZoomMeet?: boolean;
  zoomMeetDuration?: number;
  zoomMeetingNotes?: string;
  zoomMeetingAttachments?: Attachment[];
  zoomAdditionalGuests?: string[];
  googleMeetData?: {
    eventId: string;
    meetingLink: string;
    htmlLink: string;
    summary: string;
    description: string;
    meetingNotes?: string;
    meetingAttachments?: Attachment[];
  };
  zoomMeetData?: {
    meetingId: string;
    meetingLink: string;
    startUrl?: string;
    eventId?: string;
    htmlLink?: string;
    summary?: string;
    description?: string;
    meetingNotes?: string;
    meetingAttachments?: Attachment[];
  };
}

// Interface for AssignCandidateDialog props
export interface AssignCandidateDialogProps {
  candidate: Candidate;
  refetch: () => Promise<void>;
  isOpen?: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updatedCandidate: Candidate) => void;
  setLocalCandidate: (candidate: Candidate) => void;
  refetchAssignment?: () => void;
  onSuccess: () => void;
}

// Validation schema for the AssignCandidateDialog form
export const validationSchema = Yup.object({
  interviewerId: Yup.string().required('Interviewer is required'),
  time: Yup.date().min(new Date(), 'Past date is not allowed').nullable(),
  remark: Yup.string(),
  rating: Yup.number().nullable(),
  attachments: Yup.array(),
  scheduleGoogleMeet: Yup.boolean(),
  meetDuration: Yup.number().when('scheduleGoogleMeet', {
    is: true,
    then: (schema) => schema.required('Please select meeting duration'),
    otherwise: (schema) => schema.nullable(),
  }).max(60, 'Google Meet duration cannot exceed 60 minutes'),
  meetingNotes: Yup.string(),
  meetingAttachments: Yup.array(),
  additionalGuests: Yup.array().of(
    Yup.string().email('Please enter valid email addresses'),
  ),
  scheduleZoomMeet: Yup.boolean(),
  zoomMeetDuration: Yup.number().when('scheduleZoomMeet', {
    is: true,
    then: (schema) => schema.required('Please select meeting duration'),
    otherwise: (schema) => schema.nullable(),
  }).max(40, 'Zoom meeting duration cannot exceed 40 minutes'),
  zoomMeetingNotes: Yup.string(),
  zoomMeetingAttachments: Yup.array(),
  zoomAdditionalGuests: Yup.array().of(
    Yup.string().email('Please enter valid email addresses'),
  ),
});
