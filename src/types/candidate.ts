import { CustomFieldValues } from "@/Custom_Fields/hooks/useCustomForm";
import { ICandidateHistory } from "@/lib/models/history";
import { Job } from "./job";

export interface JobDetail {
  title: string;
  description: string;
}

export interface Candidate {
  _id: string;
  jobId: {
    _id: string;
    title: string;
    description: string;
    skills?: string[];
  };
  name: string;
  location: string;
  experience: number;
  skills: string[];
  expectedCTC?: number;
  currentCTC?: number;
  noticePeriod: number;
  // currentLocation: string;
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
  email?: string;
  isDeleted?: boolean;
  scores?: {
    overall: number;
    experience: number;
    skills: number;
    strengths: string[];
    areas_for_improvement: string[];
    recommendation: string;
    notes: string;
    failure?: string;
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
  interviewerId: string | { _id: string; name: string; email: string };
  deadline: string;
  assignedAt: string;
  status?: string;
  assignment?: { status: string };
  jobId?: Job;
}
