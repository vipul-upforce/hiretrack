import { Schema, Document } from 'mongoose';

// Define user roles for visibility control
export type UserRole = 'admin' | 'hr' | 'interviewer' | 'candidate' | 'system';

// Interface for checklist field items (reusing custom fields structure)
export interface IChecklistField {
  id: string;
  label: string;
  type:
    | 'text'
    | 'number'
    | 'email'
    | 'date'
    | 'time'
    | 'datetime'
    | 'checkbox'
    | 'radio'
    | 'select'
    | 'multiSelect'
    | 'textarea'
    | 'password'
    | 'file';
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select, radio, multiSelect
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  order: number;
  // Role-based visibility controls
  visibleOnForm: UserRole[]; // Which roles can see this field when filling the form
  visibleInHistory: UserRole[]; // Which roles can see this field in candidate history
}

// Interface for checklist configuration
export interface IChecklist {
  id: string;
  name: string;
  description?: string;
  fields: IChecklistField[];
  isMandatory: boolean; // If true, must be completed before lane change
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  visibleInHistory?: string[];
}

// Interface for lane-specific configuration
export interface ILaneConfig {
  laneId: string;
  laneName: string;
  incomingChecklist?: IChecklist;
  outgoingChecklist?: IChecklist;
}

// Main interface for job lane configuration
export interface IJobLaneConfig extends Document {
  jobId: Schema.Types.ObjectId;
  organizationId: Schema.Types.ObjectId;
  laneConfigs: ILaneConfig[];
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const checklistFieldSchema = new Schema<IChecklistField>({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: [
      'text',
      'number',
      'email',
      'date',
      'time',
      'datetime',
      'checkbox',
      'radio',
      'select',
      'multiSelect',
      'textarea',
      'password',
      'file',
    ],
  },
  required: { type: Boolean, default: false },
  placeholder: String,
  options: [String],
  validation: {
    min: Number,
    max: Number,
    pattern: String,
    message: String,
  },
  order: { type: Number, required: true },
  // Role-based visibility controls
  visibleOnForm: {
    type: [String],
    enum: ['admin', 'hr', 'interviewer', 'candidate'],
    default: ['admin', 'hr', 'interviewer'], // Default visibility for backward compatibility
  },
  visibleInHistory: {
    type: [String],
    enum: ['admin', 'hr', 'interviewer', 'candidate'],
    default: ['admin', 'hr', 'interviewer'], // Default visibility for backward compatibility
  },
});

const checklistSchema = new Schema<IChecklist>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: String,
  fields: [checklistFieldSchema],
  isMandatory: { type: Boolean, default: false },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const laneConfigSchema = new Schema<ILaneConfig>({
  laneId: { type: String, required: true },
  laneName: { type: String, required: true },
  incomingChecklist: checklistSchema,
  outgoingChecklist: checklistSchema,
});

export const jobLaneConfigSchema = new Schema<IJobLaneConfig>({
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    unique: true,
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  laneConfigs: [laneConfigSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Add indexes for performance
jobLaneConfigSchema.index({ organizationId: 1 });

// Update timestamp on save
jobLaneConfigSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});
