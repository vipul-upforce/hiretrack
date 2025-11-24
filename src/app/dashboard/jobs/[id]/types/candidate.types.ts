/**
 * Strict candidate types for kanban area
 * Removes [x: string]: any and provides strict typing
 */

import { CustomFieldValues } from "@/Custom_Fields/hooks/useCustomForm";
import { ICandidateHistory } from "@/lib/models/history";
import { ITag } from "@/lib/models/organization";
import { Attachment } from "@/app/api/candidates/route";
import { JobObject } from "../utils/candidateTypeGuards";
import { NormalizedInterviewer } from "../utils/candidateNormalizer";

/**
 * Candidate status types
 */
export type CandidateStatus =
  | "applied"
  | "screening"
  | "shortlisted"
  | "processing"
  | "accepted"
  | "rejected"
  | "default";

/**
 * Job detail structure
 */
export interface JobDetail {
  title: string;
  description: string;
}

/**
 * Remark structure
 */
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

/**
 * Resume structure
 */
export interface CandidateResume {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

/**
 * File attachment structure
 */
export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

/**
 * Tracking data structure
 */
export interface CandidateTracking {
  createdAt: string;
  updatedAt: string;
  assignedToJobDate?: string;
}

/**
 * Follow-up structure
 */
export interface FollowUp {
  note: string;
  date?: Date | string;
  userId?: {
    _id: string;
    name: string;
    email: string;
  };
}

/**
 * Assignment structure
 */
export interface CandidateAssignment {
  interviewerId: NormalizedInterviewer | string;
  time: string | Date;
  duration?: string;
  assignedAt: string | Date;
  googleMeet?: {
    eventId: string;
    meetingLink: string;
    htmlLink: string;
    summary: string;
    description: string;
    meetingAttachments?: FileAttachment[];
    meetingNotes?: string;
    attendeeResponses?: Array<{
      email: string;
      name?: string;
      responseStatus: "needsAction" | "accepted" | "declined" | "tentative";
      comment?: string;
      lastUpdated: Date | string;
      notificationSent?: boolean;
    }>;
    lastSyncedAt?: Date | string;
  };
  status?: string;
  jobId?: string | JobObject;
}

/**
 * Scores structure
 */
export interface CandidateScores {
  overall: number;
  experience: number;
  skills: number;
  affordability: number;
  strengths: string[];
  areas_for_improvement: string[];
  recommendation: string;
  notes: string;
  failure?: string;
  confidenceScores?: {
    overall: number;
    skills: number;
    experience: number;
    affordability: number;
  };
  evidenceLinks?: {
    overall: string;
    skills: string;
    experience: string;
    affordability: string;
  };
  redFlags?: Array<{
    type: string;
    severity: "low" | "medium" | "high";
    description: string;
    evidence: string;
  }>;
  comparativeRanking?: {
    overallRank: number;
    totalCandidates: number;
    percentile: number;
    skillsPercentile: number;
    experiencePercentile: number;
    affordabilityPercentile: number;
    hasTie: boolean;
    tiedWithCount: number;
    rankingBasedOn: "overall" | "weighted";
  };
  interviewQuestions?: Array<{
    category: string;
    question: string;
    reason: string;
    priority: "high" | "medium" | "low";
    suggestedAnswer?: string;
  }>;
  skillsMatrix?: {
    requiredAndPresent: Array<{
      skill: string;
      yearsOfExperience?: number;
      proficiencyLevel?: string;
      evidence: string;
    }>;
    requiredButMissing: string[];
    presentButNotRequired: string[];
  };
  weightedScore?: number;
}

/**
 * Raw candidate from API/SSE (before normalization)
 * May have inconsistent shapes
 */
export interface RawCandidate {
  _id: string;
  jobId: string | JobObject | undefined;
  name: string;
  email?: string;
  contact?: string;
  location?: string;
  experience?: number;
  relevantExperience?: number;
  skills?: string[];
  expectedCTC?: number;
  currentCTC?: number;
  noticePeriod?: number;
  tags?: ITag[];
  resume?: CandidateResume | null;
  remarks?: Remark[];
  attachments?: FileAttachment[];
  status?: CandidateStatus;
  tracking?: {
    createdAt?: string | Date;
    updatedAt?: string | Date;
    assignedToJobDate?: string | Date;
  };
  assignment?: unknown;
  customFields?: CustomFieldValues;
  jobDetails?: JobDetail;
  history?: ICandidateHistory[];
  isDeleted?: boolean;
  scores?: CandidateScores;
  followUp?: FollowUp;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: unknown; // Allow extra fields from API
}

/**
 * Normalized candidate (after normalization)
 * Strict typing, no [x: string]: any
 */
export interface NormalizedCandidate {
  _id: string;
  jobId: JobObject | string;
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
  tags?: ITag[];
  resume: CandidateResume | null;
  remarks?: Remark[];
  attachments: FileAttachment[];
  status: CandidateStatus;
  tracking: CandidateTracking;
  assignment: CandidateAssignment | null;
  customFields?: CustomFieldValues;
  jobDetails?: JobDetail;
  history?: ICandidateHistory[];
  isDeleted: boolean;
  scores?: CandidateScores;
  followUp?: FollowUp;
}

/**
 * Candidate column for Kanban board
 */
export interface CandidateColumn {
  id: CandidateStatus;
  title: string;
  candidates: NormalizedCandidate[];
}

