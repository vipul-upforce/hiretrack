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
  // validTill: { type: Date, required: true },
  status: {
    type: String,
    enum: ["open", "closed", "draft"],
    default: "open",
  },
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
  isDeleted: Boolean,
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
  isDeleted?: boolean;
}

// export const Job = mongoose.model('Job', jobSchema);
