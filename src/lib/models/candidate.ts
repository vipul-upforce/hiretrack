import mongoose, { Schema } from 'mongoose';
import { CustomFieldFile } from '../fileUtils';

export interface ICandidate {
  jobId: mongoose.Schema.Types.ObjectId;
  name: string;
  location: string;
  organizationId:string;
  experience: number;
  skills: string[];
  expectedCTC: number;
  currentCTC: number;
  noticePeriod: number;
  // currentLocation: string;
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
    interviewerId:{
      _id?: string;
      name?: string;
      email?: string;
    } ;
    assignedAt: Date;
    deadline: Date;
  };
  customFields: {
    [key: string]: string | string[] | CustomFieldFile[] | { 
      type: string;
      value: string | number | boolean | null;
      required?: boolean;
    } | object; // Add object type to allow MongoDB documents
  };
}

export const candidateSchema = new Schema({
  jobId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Job',
    required: true 
  },
  organizationId:String,
  name: { type: String, required: true },
  location: { type: String, required: true },
  experience: { type: Number, required: true },
  skills: [{ type: String }],
  expectedCTC: { type: Number, required: true },
  currentCTC: { type: Number, required: true },
  noticePeriod: { type: Number, required: true },
  // currentLocation: { type: String, required: true },
  resume: {
    id: String,
    name: String,
    url: String,
    type: { type: String, default: 'pdf' },
    size: Number
  },
  remarks: [{
    _id: false,
    description: { 
      type: String, 
      required: true,
      trim: true
    },
    date: { 
      type: String, 
      required: true 
    },
    rating: { 
      type: Number,
      min: 0,
      max: 5
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }],
  attachments: [{
    id: String,
    name: String,
    url: String,
    type: { type: String, default: 'pdf' },
    size: Number
  }],
  status: {
    type: String,
  },
  tracking: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    assignedToJobDate: { type: Date, default: Date.now }
  },
  assignment: {
    interviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: Date,
    deadline: Date
  },
  customFields: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

// export const Candidate = mongoose.model('Candidate', candidateSchema); 

