import mongoose, { Schema } from 'mongoose';
import { ChecklistFieldValue } from '@/types/checklist';
import { CustomFieldFile } from '../fileUtils';
import { ITag } from './organization';
import logger from '../logger';

/* eslint-disable max-lines */
export interface FollowUp {
  note: string;
  date?: Date;
  userId: mongoose.Schema.Types.ObjectId;
}
export interface ICandidate {
  jobId?:
    | mongoose.Schema.Types.ObjectId
    | { _id: string; title: string; description: string };
  name: string;
  email: string;
  contact: string; // Contact number - required
  location: string;
  organizationId: string;
  experience: number;
  relevantExperience: number;
  skills: string[];
  expectedCTC: number;
  currentCTC: number;
  noticePeriod: number;
  // currentLocation: string;
  tags?: ITag[];
  resume: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
  remarks: Array<{
    description: string;
    date: string;
    rating?: number;
    userId: mongoose.Schema.Types.ObjectId;
  }>;
  attachments: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  status: string;
  tracking: {
    createdAt: Date;
    updatedAt: Date;
  };
  assignment?: {
    interviewerId: {
      _id?: string;
      name?: string;
      email?: string;
    };
    assignedAt: Date;
    time: Date;
    googleMeet?: {
      eventId: string;
      meetingLink: string;
      htmlLink: string;
      summary: string;
      description: string;
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
      guestEmails?: string[];
      meetingNotes?: string;
      meetingAttachments?: Array<{
        id: string;
        name: string;
        url: string;
        type: string;
        size: number;
      }>;
      lastSyncedAt?: Date;
    };
    microsoftTeams?: {
      meetingId: string;
      meetingLink: string;
      eventId?: string;
      htmlLink?: string;
      summary?: string;
      description?: string;
      meetingNotes?: string;
      meetingAttachments?: Array<{
        id: string;
        name: string;
        url: string;
        type: string;
        size: number;
      }>;
      lastSyncedAt?: Date;
    };
  };
  customFields: {
    [key: string]:
      | string
      | string[]
      | CustomFieldFile[]
      | {
          type: string;
          value: string | number | boolean | null;
          required?: boolean;
        }
      | object; // Add object type to allow MongoDB documents
  };
  followUp?: FollowUp;
  scores?: {
    overall: number;
    experience: number;
    skills: number;
    affordability?: number;
    strengths: string[];
    areas_for_improvement: string[];
    recommendation: string;
    notes: string;
    failure?: string;
    // New enhanced evaluation fields
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
  checklistData?: {
    [laneId: string]: {
      incoming?: {
        checklistId: string;
        completedAt: Date;
        completedBy: mongoose.Schema.Types.ObjectId;
        responses: {
          [fieldId: string]: {
            value: ChecklistFieldValue;
            files?: CustomFieldFile[];
          };
        };
      };
      outgoing?: {
        checklistId: string;
        completedAt: Date;
        completedBy: mongoose.Schema.Types.ObjectId;
        responses: {
          [fieldId: string]: {
            value: ChecklistFieldValue;
            files?: CustomFieldFile[];
          };
        };
      };
    };
  };
  isDeleted: boolean;
  duplicateCount?: number;
}

export const candidateSchema = new Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: false,
    },
    organizationId: String,
    name: { type: String, required: true },
    email: { type: String, required: true },
    contact: { type: String, required: false },
    location: { type: String, required: false },
    experience: { type: Number, required: false },
    relevantExperience: { type: Number, required: true },
    skills: [{ type: String }],
    expectedCTC: { type: Number, required: false },
    currentCTC: { type: Number, required: false },
    noticePeriod: { type: Number, required: false },
    resume: {
      id: String,
      name: String,
      url: String,
      type: { type: String, default: 'pdf' },
      size: Number,
    },
    remarks: [
      {
        _id: false,
        description: {
          type: String,
          required: true,
          trim: true,
        },
        date: {
          type: String,
          required: true,
        },
        rating: {
          type: Number,
          min: 0,
          max: 5,
        },
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
      },
    ],
    followUp: {
      note: {
        type: String,
      },
      date: {
        type: Date,
      },
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    tags: [
      {
        title: {
          type: String,
        },
        color: {
          type: String,
        },
      },
    ],
    attachments: [
      {
        id: String,
        name: String,
        url: String,
        type: { type: String, default: 'pdf' },
        size: Number,
      },
    ],
    status: {
      type: String,
      validate: {
        async validator(this: ICandidate, status: string) {
          // Skip validation if no status is provided
          if (!status) return true;

          // Get the job for this candidate
          if (!this.jobId) return true; // Allow if no job assigned

          const Job = mongoose.model('Job');
          const Organization = mongoose.model('Organization');

          try {
            const job = await Job.findById(this.jobId);
            if (!job) return true; // Allow if job not found (will be handled elsewhere)

            // Check if job uses custom lanes
            if (job.useCustomLanes && job.lanes) {
              return job.lanes.includes(status);
            }
            // Use organization default lanes
            const organization = await Organization.findById(
              job.organizationId,
            );
            if (!organization) return true;

            const defaultLanes = organization.defaultLanes || [
              'applied',
              'screening',
              'shortlisted',
              'processing',
              'accepted',
              'rejected',
            ];
            return defaultLanes.includes(status);
          } catch (error) {
            logger.warn('Lane validation error:', error);
            return true; // Allow if validation fails to prevent blocking operations
          }
        },
        message: 'Status must be a valid lane for this job',
      },
    },
    tracking: {
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
      assignedToJobDate: { type: Date, default: Date.now },
    },
    assignment: {
      type: {
        interviewerId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
        assignedAt: {
          type: Date,
          default: null,
        },
        time: {
          type: Date,
          default: null,
        },
        googleMeet: {
          eventId: String,
          meetingLink: String,
          htmlLink: String,
          summary: String,
          description: String,
          meetingNotes: String,
          meetingAttachments: {
            type: [
              {
                id: String,
                name: String,
                url: String,
                type: { type: String, default: 'pdf' },
                size: Number,
              },
            ],
            default: undefined,
          },
          attendeeResponses: {
            type: [
              {
                email: String,
                name: String,
                responseStatus: {
                  type: String,
                  enum: ['needsAction', 'accepted', 'declined', 'tentative'],
                  default: 'needsAction',
                },
                comment: String,
                lastUpdated: Date,
                notificationSent: Boolean,
              },
            ],
            default: undefined,
          },
          lastSyncedAt: Date,
        },
        zoomMeet: {
          meetingId: String,
          meetingLink: String,
          startUrl: String,
          eventId: String,
          htmlLink: String,
          summary: String,
          description: String,
          guestEmails: {
            type: [String],
            default: undefined,
          },
          meetingNotes: String,
          meetingAttachments: {
            type: [
              {
                id: String,
                name: String,
                url: String,
                type: { type: String, default: 'pdf' },
                size: Number,
              },
            ],
            default: undefined,
          },
          lastSyncedAt: Date,
        },
        microsoftTeams: {
          meetingId: String,
          meetingLink: String,
          eventId: String,
          htmlLink: String,
          summary: String,
          description: String,
          meetingNotes: String,
          meetingAttachments: {
            type: [
              {
                id: String,
                name: String,
                url: String,
                type: { type: String, default: 'pdf' },
                size: Number,
              },
            ],
            default: undefined,
          },
          lastSyncedAt: Date,
        },
      },
      default: null,
      required: false,
    },
    customFields: {
      type: Object,
      default: {},
    },
    scores: {
      overall: {
        type: Number,
        min: 0,
        max: 10,
      },
      experience: { type: Number, min: 0, max: 10 },
      skills: { type: Number, min: 0, max: 10 },
      affordability: { type: Number, min: 0, max: 10 },
      education: { type: Number, min: 0, max: 10 },
      projects: {
        type: Number,
        min: 0,
        max: 10,
        default: 0,
      },
      certifications: {
        type: Number,
        min: 0,
        max: 10,
        default: 0,
      },
      strengths: [String],
      areas_for_improvement: [String],
      recommendation: String,
      notes: String,
      failure: String,
      // New enhanced evaluation fields
      confidenceScores: {
        overall: { type: Number, min: 0, max: 1 },
        skills: { type: Number, min: 0, max: 1 },
        experience: { type: Number, min: 0, max: 1 },
        affordability: { type: Number, min: 0, max: 1 },
      },
      evidenceLinks: {
        overall: String,
        skills: String,
        experience: String,
        affordability: String,
      },
      redFlags: [
        {
          type: {
            type: String,
          },
          severity: {
            type: String,
            enum: ['low', 'medium', 'high'],
          },
          description: String,
          evidence: String,
        },
      ],
      comparativeRanking: {
        overallRank: Number,
        totalCandidates: Number,
        percentile: Number,
        skillsPercentile: Number,
        experiencePercentile: Number,
        affordabilityPercentile: Number,
        hasTie: Boolean,
        tiedWithCount: Number,
        rankingBasedOn: {
          type: String,
          enum: ['overall', 'weighted'],
        },
      },
      interviewQuestions: [
        {
          category: { type: String },
          question: { type: String },
          reason: { type: String },
          priority: {
            type: String,
            enum: ['high', 'medium', 'low'],
          },
          suggestedAnswer: { type: String },
        },
      ],
      skillsMatrix: {
        requiredAndPresent: [
          {
            skill: String,
            yearsOfExperience: Number,
            proficiencyLevel: String,
            evidence: String,
          },
        ],
        requiredButMissing: [String],
        presentButNotRequired: [String],
      },
      weightedScore: Number,
    },
    checklistData: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    isDeleted: Boolean,
  },
  {
    timestamps: true,
  },
);

// Performance indexes for optimized queries
// Index for job-based queries with sorting (primary use case)
candidateSchema.index(
  { jobId: 1, 'tracking.createdAt': -1 },
  { name: 'idx_jobId_createdAt', background: true },
);

// Index for organization-based queries with filtering and sorting
candidateSchema.index(
  { organizationId: 1, 'tracking.createdAt': -1, isDeleted: 1 },
  { name: 'idx_orgId_createdAt_deleted', background: true },
);

// Index for organization + job queries
candidateSchema.index(
  { organizationId: 1, jobId: 1, 'tracking.createdAt': -1 },
  { name: 'idx_orgId_jobId_createdAt', background: true },
);

// Index for status filtering with organization
candidateSchema.index(
  { organizationId: 1, status: 1, isDeleted: 1 },
  { name: 'idx_orgId_status_deleted', background: true },
);

// Index for interviewer assignment queries
candidateSchema.index(
  {
    'assignment.interviewerId': 1,
    organizationId: 1,
    'assignment.assignedAt': -1,
  },
  { name: 'idx_assignment_interviewer_org', background: true, sparse: true },
);

// Index for follow-up queries
candidateSchema.index(
  { 'followUp.userId': 1, 'followUp.date': -1 },
  { name: 'idx_followUp_userId_date', background: true, sparse: true },
);

// Index for email lookups (unique constraint if needed)
candidateSchema.index({ email: 1 }, { name: 'idx_email', background: true });

// Index for organization-wide candidate queries with jobId
candidateSchema.index(
  {
    organizationId: 1,
    jobId: 1,
    status: 1,
    isDeleted: 1,
  },
  { name: 'idx_orgId_jobId_status_deleted', background: true },
);
// CRITICAL MISSING INDEXES:

// 1. Candidates - Assignment time queries (used in assignments route)
candidateSchema.index(
  {
    'assignment.interviewerId': 1,
    'assignment.time': 1,
    organizationId: 1,
    isDeleted: 1,
  },
  {
    name: 'idx_assignment_interviewer_time_org',
    background: true,
    sparse: true,
  },
);

// 2. Candidates - Job + Status + Date range (analytics)
candidateSchema.index(
  {
    jobId: 1,
    status: 1,
    'tracking.createdAt': -1,
    isDeleted: 1,
  },
  { name: 'idx_job_status_created_deleted', background: true },
);

// export const Candidate = mongoose.model('Candidate', candidateSchema);
