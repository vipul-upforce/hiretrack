import { Attachment } from '@/app/dashboard/jobs/[id]/schemas/AssignCandidateSchema';
import { Schema } from 'mongoose';
import { CustomFieldFile } from '../fileUtils';

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
      default: true,
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
      ref: 'User',
      required: false,
    },
  },
  previousInterviewer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  currentInterviewer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  assignmentBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
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
      ref: 'User',
    },
  },
  attachments: [
    {
      id: String,
      name: String,
      url: String,
      type: { type: String, default: 'pdf' },
      size: Number,
    },
  ],
  checklistForm: {
    checklistId: String,
    checklistName: String,
    checklistType: {
      type: String,
      enum: ['incoming', 'outgoing'],
    },
    laneId: String,
    laneName: String,
    responses: {
      type: Map,
      of: {
        fieldId: String,
        fieldLabel: String,
        fieldType: String,
        value: Schema.Types.Mixed,
        visibleInHistory: [String],
        files: [
          {
            id: String,
            name: String,
            url: String,
            type: String,
            size: Number,
          },
        ],
      },
    },
    completedAt: Date,
    completedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
};

export const historySchema = new Schema({
  jobId: {
    type: String,
    default: null,
  },
  candidateId: {
    type: String,
    required: true,
  },
  history: [candidateHistory],
});
// 4. History - Candidate + Job + DateTime (N+1 queries)
historySchema.index(
  {
    candidateId: 1,
    jobId: 1,
    'history.dateTime': -1,
  },
  { name: 'idx_history_candidate_job_datetime', background: true },
);

export interface ICandidateHistory {
  _id?: string;
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
      | string
      | null;
  };
  attachments: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  checklistForm?: {
    checklistId: string;
    checklistName: string;
    checklistType: 'incoming' | 'outgoing';
    laneId: string;
    laneName: string;

    responses: Record<
      string,
      {
        fieldId: string;
        fieldLabel: string;
        fieldType: string;
        value: any;
        files?: CustomFieldFile[];
        visibleInHistory?: string[]; // Define visibleInHistory as string[] or undefined
      }
    >;
    completedAt: Date;
    completedBy: {
      _id: string;
      name: string;
      email: string;
    };
  };
}
export interface IHistory {
  jobId: string | null;
  candidateId: string;
  history: ICandidateHistory[];
}
