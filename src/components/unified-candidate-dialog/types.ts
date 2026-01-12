import * as Yup from 'yup';
import { Dayjs } from 'dayjs';
import { Attachment } from '@/app/dashboard/jobs/[id]/schemas/AssignCandidateSchema';
import { Candidate } from '@/types/candidate';

export type CandidateActionType =
  | 'assignTo'
  | 'switchJob'
  | 'markAsDone'
  | 'addFollowUp'
  | 'addRemark';

export type Mention = {
  _id: string;
  name: string;
  email: string;
  role: string;
};

export interface ActionCheckboxes {
  assignTo: boolean;
  switchJob: boolean;
  markAsDone: boolean;
  addFollowUp: boolean;
  addRemark: boolean;
}

export interface UnifiedFormValues {
  interviewerId: string;
  time: Dayjs | null;
  scheduleGoogleMeet: boolean;
  meetDuration: number;
  meetingNotes: string;
  meetingAttachments: Attachment[];
  additionalGuests: string[];
  googleMeetData?: {
    eventId: string;
    meetingLink: string;
    htmlLink: string;
    summary: string;
    description: string;
    meetingNotes: string;
    meetingAttachments: Attachment[];
  };
  attachments: Attachment[];
  jobId: string;
  followUpNote: string;
  followUpDate: Dayjs | null;
  remarkDescription: string;
  remarkRating: number | null;
  remarkRatingHistory: number | null;
  isRemarkPrivate: boolean;
  selectedMentions: Mention[];
  removeFollowUp: boolean;
}

export interface UnifiedCandidateActionsDialogProps {
  candidate: Candidate;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialAction?: CandidateActionType;
  refetch?: () => Promise<void> | void;
  onUpdate?: (updatedCandidate: Candidate) => void;
  setLocalCandidate?: (candidate: Candidate) => void;
  refetchAssignment?: () => void;
  onSuccess?: () => void;
}

export const validationSchema = Yup.object({
  interviewerId: Yup.string().optional(),
  time: Yup.date().min(new Date(), 'Past date is not allowed').nullable(),
  jobId: Yup.string().optional(),
  followUpNote: Yup.string().nullable(),
  followUpDate: Yup.date().nullable(),
  remarkDescription: Yup.string().nullable(),
  remarkRating: Yup.number().nullable(),
  scheduleGoogleMeet: Yup.boolean(),
  meetDuration: Yup.number().when('scheduleGoogleMeet', {
    is: true,
    then: (schema) => schema.required('Please select meeting duration'),
    otherwise: (schema) => schema.nullable(),
  }),
});
