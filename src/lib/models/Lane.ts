import { Schema, Document, Types } from 'mongoose';

/**
 * Lane Schema
 * Represents a reusable lane entity that can be used across jobs and organizations
 * Lanes define the stages in a candidate's journey (e.g., applied, screening, shortlisted)
 */

export interface ILane extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId; // Always required - for querying and access control
  jobId?: Types.ObjectId | null; // Optional - if null, this is an organization-level lane; if ObjectId, it's job-specific
  name: string; // Unique identifier (e.g., 'applied', 'screening')
  systemKey?: string | null; // System key for protected lanes ('applied', 'accepted', 'rejected')
  description?: string;
  color?: string; // Hex color code for UI display
  order: number; // Display order in Kanban board
  isDefault: boolean; // Whether this is a system default lane
  isEditable: boolean; // Whether lane name can be edited
  isDeletable: boolean; // Whether lane can be deleted
  isActive: boolean; // Whether lane is currently active
  metadata?: {
    // Additional metadata for custom use cases
    [key: string]: unknown;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Types.ObjectId; // User who created the lane (if custom)
}

// Default lanes that are system-defined
export const DEFAULT_LANES = [
  'applied',
  'screening',
  'shortlisted',
  'processing',
  'accepted',
  'rejected',
] as const;

// System-protected lane keys (these lanes cannot be edited or deleted)
export const SYSTEM_PROTECTED_LANES = [
  'applied',
  'accepted',
  'rejected',
] as const;

// Lane restrictions for default lanes
export const LANE_RESTRICTIONS = {
  nonEditable: ['applied', 'accepted', 'rejected'],
  nonDeletable: ['applied', 'accepted', 'rejected'],
} as const;

// Schema definition
const laneSchema = new Schema<ILane>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: false,
      index: true,
      default: null, // null = organization-level lane, ObjectId = job-specific lane
    },
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      // Validate: alphanumeric, hyphens, underscores only, 1-50 chars
      validate: {
        validator: (v: string) => /^[a-z0-9_-]{1,50}$/.test(v),
        message:
          'Lane name must be 1-50 characters, lowercase alphanumeric with hyphens/underscores only',
      },
    },
    systemKey: {
      type: String,
      default: null,
      enum: [null, 'applied', 'accepted', 'rejected'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    color: {
      type: String,
      validate: {
        validator: (v: string | undefined) => {
          if (!v) {
            return true; // Optional
          }
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: 'Color must be a valid hex color code',
      },
    },
    order: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
    isDeletable: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    collection: 'lanes',
  },
);

// Compound unique index: organizationId + name must be unique for organization-level lanes
laneSchema.index(
  { organizationId: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { jobId: null }, // Only enforce uniqueness for organization-level lanes
  },
);

// Compound unique index: organizationId + jobId + name must be unique for job-specific lanes
laneSchema.index(
  { organizationId: 1, jobId: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { jobId: { $ne: null } }, // Only enforce uniqueness for job-specific lanes
  },
);

// Index for active organization-level lanes
laneSchema.index(
  { organizationId: 1, isActive: 1, order: 1 },
  { partialFilterExpression: { jobId: null } },
);

// Index for active job-specific lanes
laneSchema.index(
  { jobId: 1, isActive: 1, order: 1 },
  { partialFilterExpression: { jobId: { $ne: null } } },
);

// Index for querying default lanes (organization-level only)
laneSchema.index(
  { organizationId: 1, isDefault: 1, isActive: 1 },
  { partialFilterExpression: { jobId: null } },
);

// Index for querying all lanes by organization and job
laneSchema.index({ organizationId: 1, jobId: 1, isActive: 1 });

// Pre-save hook: Set systemKey and enforce restrictions for protected lanes
laneSchema.pre('save', function (next) {
  const laneName = this.name as string;

  // Set systemKey for protected lanes
  if (
    SYSTEM_PROTECTED_LANES.includes(
      laneName as (typeof SYSTEM_PROTECTED_LANES)[number],
    )
  ) {
    this.systemKey = laneName as 'applied' | 'accepted' | 'rejected';
    // Force restrictions for system-protected lanes
    this.isEditable = false;
    this.isDeletable = false;
  } else {
    // Clear systemKey for non-protected lanes
    this.systemKey = null;
  }

  // Legacy: If this is a default lane, apply restrictions (for backward compatibility)
  if (
    this.isDefault &&
    DEFAULT_LANES.includes(laneName as (typeof DEFAULT_LANES)[number])
  ) {
    if (
      LANE_RESTRICTIONS.nonEditable.includes(
        laneName as 'applied' | 'accepted' | 'rejected',
      )
    ) {
      this.isEditable = false;
    }
    if (
      LANE_RESTRICTIONS.nonDeletable.includes(
        laneName as 'applied' | 'accepted' | 'rejected',
      )
    ) {
      this.isDeletable = false;
    }
  }
  next();
});

// Virtual for checking if lane is restricted
laneSchema.virtual('isRestricted').get(function () {
  return !this.isEditable || !this.isDeletable;
});

// Method to check if lane can be edited
laneSchema.methods.canEdit = function (): boolean {
  return this.isEditable && this.isActive;
};

// Method to check if lane can be deleted
laneSchema.methods.canDelete = function (): boolean {
  return this.isDeletable && this.isActive;
};

// Static method to get default lanes for an organization (organization-level only)
laneSchema.statics.getDefaultLanes = function (organizationId: Types.ObjectId) {
  return this.find({
    organizationId,
    jobId: null, // Organization-level lanes only
    isDefault: true,
    isActive: true,
  }).sort({ order: 1 });
};

// Static method to get all active organization-level lanes
laneSchema.statics.getOrganizationLanes = function (
  organizationId: Types.ObjectId,
) {
  return this.find({
    organizationId,
    jobId: null, // Organization-level lanes only
    isActive: true,
  }).sort({ order: 1 });
};

// Static method to get all active lanes for a specific job (job-specific + organization defaults)
laneSchema.statics.getJobLanes = function (
  jobId: Types.ObjectId,
  organizationId: Types.ObjectId,
) {
  return this.find({
    organizationId,
    $or: [
      { jobId }, // Job-specific lanes
      { jobId: null }, // Organization-level lanes
    ],
    isActive: true,
  }).sort({ order: 1 });
};

// Static method to get only job-specific lanes (excluding organization defaults)
laneSchema.statics.getJobSpecificLanes = function (
  jobId: Types.ObjectId,
  organizationId: Types.ObjectId,
) {
  return this.find({
    organizationId,
    jobId, // Job-specific lanes only
    isActive: true,
  }).sort({ order: 1 });
};

// Static method to create default lanes for an organization (organization-level)
// Ensures "applied" lane and other default lanes are unique per organization
laneSchema.statics.createDefaultLanes = async function (
  organizationId: Types.ObjectId,
  createdBy?: Types.ObjectId,
) {
  const defaultLaneData = [
    { name: 'applied', order: 0, isDefault: true },
    { name: 'screening', order: 1, isDefault: true },
    { name: 'shortlisted', order: 2, isDefault: true },
    { name: 'processing', order: 3, isDefault: true },
    { name: 'accepted', order: 4, isDefault: true },
    { name: 'rejected', order: 5, isDefault: true },
  ];

  // Check which lanes already exist for this organization (organization-level only)
  const existingLanes = await this.find({
    organizationId,
    jobId: null, // Organization-level lanes only
    name: { $in: defaultLaneData.map((lane) => lane.name) },
  }).lean();

  const existingLaneNames = new Set(
    existingLanes.map((lane: { name: string }) => lane.name),
  );

  // Only create lanes that don't already exist
  // This ensures "applied" and other lanes remain constant/unique per organization
  const lanesToCreate = defaultLaneData
    .filter((lane) => !existingLaneNames.has(lane.name))
    .map((lane) => ({
      ...lane,
      organizationId,
      jobId: null, // Organization-level lanes
      createdBy,
      isEditable: !LANE_RESTRICTIONS.nonEditable.includes(
        lane.name as 'applied' | 'accepted' | 'rejected',
      ),
      isDeletable: !LANE_RESTRICTIONS.nonDeletable.includes(
        lane.name as 'applied' | 'accepted' | 'rejected',
      ),
    }));

  // Only insert if there are lanes to create
  if (lanesToCreate.length === 0) {
    return existingLanes; // Return existing lanes if all already exist
  }

  // Insert only new lanes
  const createdLanes = await this.insertMany(lanesToCreate, {
    ordered: false,
  });

  // Return both existing and newly created lanes
  return [...existingLanes, ...createdLanes];
};

// Static method to create job-specific lanes (copies from organization defaults or creates new)
laneSchema.statics.createJobLanes = async function (
  jobId: Types.ObjectId,
  organizationId: Types.ObjectId,
  laneNames: string[],
  createdBy?: Types.ObjectId,
) {
  // First, try to get organization-level lanes with matching names to copy properties
  const orgLanes = await this.find({
    organizationId,
    jobId: null,
    name: { $in: laneNames },
    isActive: true,
  }).lean();

  const orgLaneMap = new Map(
    orgLanes.map(
      (lane: {
        name: string;
        description?: string;
        color?: string;
        order: number;
        systemKey?: string | null;
      }) => [lane.name, lane],
    ),
  );

  const jobLanes = laneNames.map((laneName, index) => {
    const orgLane = orgLaneMap.get(laneName) as
      | {
          description?: string;
          color?: string;
          order: number;
          systemKey?: string | null;
        }
      | undefined;
    return {
      organizationId,
      jobId, // Job-specific lane
      name: laneName,
      description: orgLane?.description,
      color: orgLane?.color,
      order: orgLane?.order ?? index,
      isDefault: false, // Job-specific lanes are never default
      isEditable: !orgLane?.systemKey, // Respect system protection
      isDeletable: !orgLane?.systemKey, // Respect system protection
      systemKey: orgLane?.systemKey || null,
      isActive: true,
      createdBy,
    };
  });

  // Use insertMany with ordered: false to skip duplicates
  return this.insertMany(jobLanes, { ordered: false });
};

export default laneSchema;
