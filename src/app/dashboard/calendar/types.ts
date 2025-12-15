import { CandidateStatus } from '@/types/candidate';
import { Assignment } from '@/types/assignment';

export interface Interviewer {
  _id: string;
  name: string;
  email: string;
}

export interface Job {
  _id: string;
  title: string;
  description: string;
  skills?: string[];
}

export interface CandidateAssignment {
  _id: string;
  name: string;
  jobId: Job | string;
  jobDetails?: {
    title: string;
    description: string;
  };
  location: string;
  experience: number;
  relevantExperience: number;
  skills: string[];
  expectedCTC?: number;
  currentCTC?: number;
  noticePeriod: number;
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  resume: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  } | null;
  assignment: Assignment | null;
  remarks?: Array<{
    description: string;
    date: string;
    rating?: number;
    userId: {
      _id: string;
      name: string;
      email: string;
    };
  }>;
  status?: CandidateStatus;
  tracking?: {
    createdAt: string;
    updatedAt: string;
  };
}

export interface CustomCalendarEvent {
  id: string;
  title: string;
  start?: Date;
  end?: Date;
  allDay: boolean;
  startStr: string;
  endStr: string;
  url: string;
  display: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps: {
    candidate: CandidateAssignment;
    interviewer: Interviewer;
  };
}

export type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';

