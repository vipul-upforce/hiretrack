import { CustomFieldValues } from '@/Custom_Fields/hooks/useCustomForm';
import { ICandidateHistory } from '@/lib/models/history';
import { ITag } from '@/lib/models/organization';
import { Attachment } from '@/app/api/candidates/route';
import { Job } from './job';

export interface JobDetail {
  title: string;
  description: string;
}

export type CandidateStatus =
  | 'applied'
  | 'screening'
  | 'shortlisted'
  | 'processing'
  | 'accepted'
  | 'rejected'
  | 'default';

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

export interface Assignment {
  interviewerId:
    | string
    | { _id: string; name: string; email: string; duration: string }
    | null;
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
      responseStatus: 'needsAction' | 'accepted' | 'declined' | 'tentative';
      comment?: string;
      lastUpdated: Date;
      notificationSent?: boolean;
    }>;
    lastSyncedAt?: Date;
  };
  zoomMeet?: {
    meetingId: string;
    meetingLink: string;
    startUrl?: string;
    eventId?: string;
    htmlLink?: string;
    summary?: string;
    description?: string;
    meetingAttachments?: Attachment[];
    meetingNotes?: string;
    lastSyncedAt?: Date;
  };
  jobId?: Job;
}

export interface Candidate {
  isSelected?: boolean;
  _id: string;
  id?: string;
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
  remarksCount?: number; // Count of remarks (from optimized API)
  duplicateCount?: number; // Count of duplicate candidates
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
      severity: 'low' | 'medium' | 'high';
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
      rankingBasedOn: 'overall' | 'weighted';
    };
    interviewQuestions?: Array<{
      category: string;
      question: string;
      reason: string;
      priority: 'high' | 'medium' | 'low';
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
  };
  followUp?: {
    note: string | null;
    date?: Date | string | null;
    userId?: {
      _id: string | null;
      name: string | null;
      email: string | null;
    };
  };
  organizationId?: string;
  candidateName?: string; // Alias for name
  jobTitle?: string; // Flattened from jobId.title
  interviewDate?: string; // Flattened from assignment.time
  createdAt?: string | Date;
  updatedAt?: string | Date;

  checklistData?: {
    [laneId: string]: {
      incoming?: {
        checklistId: string;
        completedAt: Date | string;
        completedBy: string;
        responses: {
          [fieldId: string]: {
            value: string | string[] | number | boolean | Date | null;
            files?: Array<{
              id: string;
              name: string;
              url: string;
              type: string;
              size: number;
            }>;
          };
        };
      };
      outgoing?: {
        checklistId: string;
        completedAt: Date | string;
        completedBy: string;
        responses: {
          [fieldId: string]: {
            value: string | string[] | number | boolean | Date | null;
            files?: Array<{
              id: string;
              name: string;
              url: string;
              type: string;
              size: number;
            }>;
          };
        };
      };
    };
  };
}

export interface CandidateColumn {
  id: CandidateStatus;
  title: string;
  candidates: Candidate[];
}
