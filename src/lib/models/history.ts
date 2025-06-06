import { Attachment } from "@/app/dashboard/jobs/[id]/schemas/AssignCandidateSchema";
import { Schema } from "mongoose";
export interface IinfoUpdateLog {
  title: string;
  previousValue?: unknown;
  currentValue?: unknown;
  attachments?: Attachment[];
}

const candidateHistory = {
  dateTime: {
    type: String,
  },
  title: {
    type: String,
  },
  remark: {
    id: String,
    isPrivate: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    date: {
      type: String,
      required: false,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  previousInterviewer: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  currentInterviewer: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  assignmentBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  note: {
    _id: false,
    description: {
      type: Schema.Types.Mixed,
      trim: true,
    },
    date: {
      type: String,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  attachments: [
    {
      id: String,
      name: String,
      url: String,
      type: { type: String, default: "pdf" },
      size: Number,
    },
  ],
};

export const historySchema = new Schema({
  jobId: {
    type: String,
    required: true,
  },
  candidateId: {
    type: String,
    required: true,
  },
  history: [candidateHistory],
});

export interface ICandidateHistory {
  dateTime: string;
  title: string | null;
  remark?: {
    id?: string;
    isPrivate?: boolean;
    description: string;
    date: string;
    rating?: number;
    userId: {
      _id: string;
      name: string;
      email: string;
    };
  };
  currentInterviewer:
    | Schema.Types.ObjectId
    | null
    | {
        _id: string;
        name: string;
        email: string;
      };
  previousInterviewer:
    | Schema.Types.ObjectId
    | null
    | {
        _id: string;
        name: string;
        email: string;
      };
  assignmentBy:
    | Schema.Types.ObjectId
    | string
    | null
    | {
        _id: string;
        name: string;
        email: string;
      };
  note: {
    description: string | IinfoUpdateLog[];
    date: string;
    rating: number;
    userId:
      | Schema.Types.ObjectId
      | {
          _id: string;
          name: string;
          email: string;
        }
      | null;
  };
  attachments: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
}
export interface IHistory {
  jobId: string;
  candidateId: string;
  history: ICandidateHistory[];
}
