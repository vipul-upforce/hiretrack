import mongoose, { Schema } from "mongoose";
import { CustomFieldFile } from "../fileUtils";
import { ITag } from "./organization";

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
    text: string;
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
    strengths: string[];
    areas_for_improvement: string[];
    recommendation: string;
    notes: string;
    failure?: string;
  };
  checklistData?: {
    [laneId: string]: {
      incoming?: {
        checklistId: string;
        completedAt: Date;
        completedBy: mongoose.Schema.Types.ObjectId;
        responses: {
          [fieldId: string]: {
            value: any;
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
            value: any;
            files?: CustomFieldFile[];
          };
        };
      };
    };
  };
  isDeleted: boolean;
}

export const candidateSchema = new Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: false,
    },
    organizationId: String,
    name: { type: String, required: true },
    email: { type: String, required: true },
    contact: { type: String, required: true },
    location: { type: String, required: false },
    experience: { type: Number, required: false },
    skills: [{ type: String }],
    expectedCTC: { type: Number, required: false },
    currentCTC: { type: Number, required: false },
    noticePeriod: { type: Number, required: false },
    resume: {
      id: String,
      name: String,
      url: String,
      type: { type: String, default: "pdf" },
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
          ref: "User",
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
        ref: "User",
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
        type: { type: String, default: "pdf" },
        size: Number,
      },
    ],
    status: {
      type: String,
      validate: {
        validator: async function(status: string) {
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
            } else {
              // Use organization default lanes
              const organization = await Organization.findById(job.organizationId);
              if (!organization) return true;
              
              const defaultLanes = organization.defaultLanes || [
                "applied", "screening", "shortlisted", "processing", "accepted", "rejected"
              ];
              return defaultLanes.includes(status);
            }
          } catch (error) {
            console.warn('Lane validation error:', error);
            return true; // Allow if validation fails to prevent blocking operations
          }
        },
        message: 'Status must be a valid lane for this job'
      }
    },
    tracking: {
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
      assignedToJobDate: { type: Date, default: Date.now },
    },
    assignment: {
      interviewerId: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      assignedAt: Date,
      time: Date,
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
      projects: { type: Number, min: 0, max: 10, default: 0 },
      certifications: { type: Number, min: 0, max: 10, default: 0 },
      strengths: [String],
      areas_for_improvement: [String],
      recommendation: String,
      notes: String,
      failure: String,
    },
    checklistData: {
      type: Map,
      of: {
        incoming: {
          checklistId: String,
          completedAt: Date,
          completedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
          },
          responses: {
            type: Map,
            of: {
              value: Schema.Types.Mixed,
              files: [{
                id: String,
                name: String,
                url: String,
                type: String,
                size: Number,
              }],
            },
          },
        },
        outgoing: {
          checklistId: String,
          completedAt: Date,
          completedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
          },
          responses: {
            type: Map,
            of: {
              value: Schema.Types.Mixed,
              files: [{
                id: String,
                name: String,
                url: String,
                type: String,
                size: Number,
              }],
            },
          },
        },
      },
      default: {},
    },
    isDeleted: Boolean,
  },
  {
    timestamps: true,
  }
);

// export const Candidate = mongoose.model('Candidate', candidateSchema);
