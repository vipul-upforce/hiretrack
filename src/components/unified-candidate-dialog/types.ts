import * as Yup from 'yup';
import { Dayjs } from 'dayjs';
import { Attachment } from '@/app/dashboard/jobs/[id]/schemas/AssignCandidateSchema';
import { Candidate } from '@/types/candidate';

export type CandidateActionType =
  | 'assignTo'
  | 'switchJob'
  | 'markAsDone'
  | 'addFollowUp'
  | 'addRemark'
  | 'updateStatus';

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
  updateStatus: boolean;
}

export interface UnifiedFormValues {
  interviewerId:
    | string
    | null
    | { _id: string; name: string; email: string; duration: string };
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
  newStatus: string;
  enabledActions: ActionCheckboxes;
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

export const getValidationSchema = (currentJobId: string | undefined) =>
  Yup.object({
    enabledActions: Yup.object(),

    // Switch Job Validation
    jobId: Yup.string().when('enabledActions.switchJob', {
      is: true,
      then: (s) =>
        s
          .required('Please select a new job')
          .test(
            'is-different',
            'Candidate is already assigned to this job',
            (value) => String(value) !== String(currentJobId),
          ),
      otherwise: (s) => s.nullable().notRequired(),
    }),

    // Follow Up Validation
    followUpNote: Yup.string().when(
      ['enabledActions.addFollowUp', 'enabledActions.removeFollowUp'],
      {
        is: (add: boolean, remove: boolean) => add && !remove,
        then: (s) => s.required('Follow-up note is required'),
        otherwise: (s) => s.nullable().notRequired(),
      },
    ),

    // Remark Validation
    remarkDescription: Yup.string().when('enabledActions.addRemark', {
      is: true,
      then: (s) => s.required('Remark is required'),
      otherwise: (s) => s.nullable().notRequired(),
    }),

    // Status Validation
    newStatus: Yup.string().when('enabledActions.updateStatus', {
      is: true,
      then: (s) => s.required('Please select a status'),
      otherwise: (s) => s.nullable().notRequired(),
    }),

    // Assign To Validation
    interviewerId: Yup.string()
      .nullable()
      .when('enabledActions.assignTo', {
        is: true,
        then: (s) =>
          s
            .required('Please select an interviewer')
            .test(
              'not-empty-or-none',
              'Please select an interviewer',
              (value) => value !== null && value !== '' && value !== '-1',
            ),
        otherwise: (s) => s.nullable().notRequired(),
      }),
    time: Yup.date()
      .nullable()
      .when('enabledActions.assignTo', {
        is: true,
        then: (s) =>
          s
            .min(new Date(), 'Cannot be in the past'),
        otherwise: (s) => s.nullable().notRequired(),
      }),
  });
