import { CustomFieldValues } from "@/Custom_Fields/hooks/useCustomForm";
import { ICandidateHistory } from "@/lib/models/history";
import { Job } from "./job";
import { ITag } from "@/lib/models/organization";
import { Attachment } from "@/app/api/candidates/route";

export interface JobDetail {
  title: string;
  description: string;
}

export interface Candidate {
  [x: string]: any;
  _id: string;
  jobId: {
    _id: string;
    title: string;
    description: string;
    skills?: string[];
  };
  name: string;
  email: string;
  contact: string;
  location: string;
  experience: number;
  relevantExperience: number;
  skills: string[];
  expectedCTC?: number;
  currentCTC?: number;
  noticePeriod: number;
  // currentLocation: string;
  tags?: ITag[];
  resume: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  } | null;
  remarks?: Remark[];
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  status: CandidateStatus;
  tracking?: {
    createdAt: string;
    updatedAt: string;
    assignedToJobDate?: string;
  };
  assignment: Assignment | null;
  customFields?: CustomFieldValues;
  jobDetails?: {
    title: string;
    description: string;
  };
  history?: ICandidateHistory[];
  isDeleted?: boolean;
  scores?: {
    overall: number;
    experience: number;
    skills: number;
    affordability: number;
    strengths: string[];
    areas_for_improvement: string[];
    recommendation: string;
    notes: string;
    failure?: string;
  };
  followUp?: {
    note: string;
    date?: Date | string;
    userId?: {
      _id: string;
      name: string;
      email: string;
    };
  };
}

export type CandidateStatus =
  | "applied"
  | "screening"
  | "shortlisted"
  | "processing"
  | "accepted"
  | "rejected"
  | "default";

export interface CandidateColumn {
  id: CandidateStatus;
  title: string;
  candidates: Candidate[];
}

export interface Remark {
  description: string;
  date: string;
  rating?: number;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
}

interface Assignment {
  interviewerId:
    | string
    | { _id: string; name: string; email: string; duration: string };
  time: string;
  duration?: string;
  assignedAt: string;
  googleMeet?: {
    eventId: string;
    meetingLink: string;
    htmlLink: string;
    summary: string;
    description: string;
    meetingAttachments?: Attachment[];
    meetingNotes?: string;
    attendeeResponses?: Array<{
      email: string;
      name?: string;
      responseStatus: "needsAction" | "accepted" | "declined" | "tentative";
      comment?: string;
      lastUpdated: Date;
      notificationSent?: boolean;
    }>;
    lastSyncedAt?: Date;
  };
  status?: string;
  assignment?: { status: string };
  jobId?: Job;
}
