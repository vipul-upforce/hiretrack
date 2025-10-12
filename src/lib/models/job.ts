import mongoose, { Document } from "mongoose";
import { Schema } from "mongoose";

export const jobSchema = new mongoose.Schema({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
  },
  title: { type: String, required: true },
  // company: { type: String, required: true },
  description: { type: String, required: true },
  skills: [{ type: String }],
  experience: { type: Number, required: true },
  links: [{ type: String }],
  salary: {
    min: { type: Number },
    max: { type: Number },
    inText: { type: String },
    isPrivate: { type: Boolean, default: false },
  },
  // validTill: { type: Date, required: true },
  status: {
    type: String,
    enum: ["open", "closed", "draft"],
    default: "open",
  },
  isPublished: { type: Boolean, default: false },
  attachments: {
    files: [
      {
        id: String,
        name: String,
        url: String,
        type: { type: String, default: "pdf" },
        size: Number,
      },
    ],
    images: [
      {
        id: String,
        name: String,
        url: String,
        type: { type: String, default: "image" },
        size: Number,
      },
    ],
  },
  tracking: {
    createdAt: { type: Date, default: Date.now },
    openedAt: Date,
    closedAt: Date,
    updatedAt: { type: Date, default: Date.now },
  },
  customFields: {
    type: Object,
    default: {},
  },
  lanes: {
    type: [String],
    default: undefined, // Will use organization default lanes if not set
  },
  useCustomLanes: {
    type: Boolean,
    default: false,
  },
  isDeleted: Boolean,
  promptForStatusChangeReason: {
    type: Boolean,
    default: true,
  },
  evaluationWeights: {
    skills: {
      type: Number,
      default: 25,
      min: 0,
      max: 100,
    },
    experience: {
      type: Number,
      default: 25,
      min: 0,
      max: 100,
    },
    affordability: {
      type: Number,
      default: 25,
      min: 0,
      max: 100,
    },
    overall: {
      type: Number,
      default: 25,
      min: 0,
      max: 100,
    },
  },
});

export interface IJob extends Document<mongoose.Types.ObjectId> {
  organizationId: Schema.Types.ObjectId;
  title: string;
  // company: string;
  description: string;
  skills: string[];
  experience: number;
  links: string[];
  // validTill: Date;
  salary?: {
    min: number;
    max: number;
    inText: string;
    isPrivate: boolean;
  };
  status: string;
  attachments: {
    files: {
      id: string;
      name: string;
      url: string;
      type: string;
      size: number;
    }[];
    images: {
      id: string;
      name: string;
      url: string;
      type: string;
      size: number;
    }[];
  };
  tracking: {
    createdAt: Date;
    openedAt: Date;
    closedAt: Date;
    updatedAt: Date;
  };
  customFields: {
    [key: string]: object;
  };
  lanes?: string[];
  useCustomLanes: boolean;
  isDeleted?: boolean;
  promptForStatusChangeReason?: boolean;
  evaluationWeights?: {
    skills: number;
    experience: number;
    affordability: number;
    overall: number;
  };
}

// export const Job = mongoose.model('Job', jobSchema);
