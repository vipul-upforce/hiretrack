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
  email?: string;
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
    email: { type: String, required: false },
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
    isDeleted: Boolean,
  },
  {
    timestamps: true,
  }
);

// export const Candidate = mongoose.model('Candidate', candidateSchema);
