import mongoose, { Document, Schema } from 'mongoose';
import logger from '../logger';
import { coerceJobExperienceForStorage } from '../utils/job-experience';

export const jobSchema = new mongoose.Schema({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
  },
  title: { type: String, required: true },
  // company: { type: String, required: true },
  description: { type: String, required: true },
  skills: [{ type: String }],
  experience: {
    min: { type: Number, required: true },
    max: { type: Number },
    inText: { type: String },
  },
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
    enum: ['open', 'closed', 'draft'],
    default: 'open',
  },
  isPublished: { type: Boolean, default: false },
  attachments: {
    files: [
      {
        id: String,
        name: String,
        url: String,
        type: { type: String, default: 'pdf' },
        size: Number,
      },
    ],
    images: [
      {
        id: String,
        name: String,
        url: String,
        type: { type: String, default: 'image' },
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
  useCustomLanes: {
    type: Boolean,
    default: true, // Default to true for job-specific Kanban architecture
  },
  // Reference to Lane documents for this job
  // If useCustomLanes is true, these lanes override organization defaults
  lanes: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Lane',
      required: false,
    },
  ],
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

// Performance indexes for optimized queries
// Index for organization-based queries with status filtering
jobSchema.index(
  { organizationId: 1, status: 1, isDeleted: 1 },
  { name: 'idx_job_org_status_deleted', background: true },
);

// Index for organization + status + created date sorting
jobSchema.index(
  { organizationId: 1, status: 1, 'tracking.createdAt': -1 },
  { name: 'idx_job_org_status_created', background: true },
);

// Index for published jobs lookup
jobSchema.index(
  {
    organizationId: 1,
    status: 1,
    isPublished: 1,
    isDeleted: 1,
  },
  { name: 'idx_job_org_status_published', background: true },
);

// Index for lane queries
jobSchema.index(
  { organizationId: 1, useCustomLanes: 1 },
  { name: 'idx_job_org_custom_lanes', background: true },
);

// Index for lane references
jobSchema.index({ lanes: 1 }, { name: 'idx_job_lane_refs', background: true });

// Pre-save hook: normalize legacy experience (plain number / partial object) before validation
jobSchema.pre('save', function (next) {
  const coerced = coerceJobExperienceForStorage(this.experience);
  if (coerced) {
    this.experience = coerced;
  } else if (!this.isNew) {
    // Legacy jobs may lack experience entirely; don't block unrelated saves (e.g. lane updates)
    this.experience = { min: 0 };
  }
  next();
});

// Pre-save hook: Clone organization defaultLanes to job.lanes when creating a new job
jobSchema.pre('save', async function (next) {
  // Only run on new documents (not updates) and if lanes are not already set
  if (
    this.isNew &&
    (!this.lanes || this.lanes.length === 0) &&
    this.organizationId
  ) {
    try {
      const Organization =
        mongoose.connection.models.Organization ||
        mongoose.model('Organization');
      const Lane = mongoose.connection.models.Lane || mongoose.model('Lane');

      // Get organization's defaultLanes
      const organization = await Organization.findById(this.organizationId)
        .select('defaultLanes')
        .lean()
        .exec();

      if (
        organization &&
        'defaultLanes' in organization &&
        organization.defaultLanes &&
        Array.isArray(organization.defaultLanes) &&
        organization.defaultLanes.length > 0
      ) {
        // Check if defaultLanes are ObjectIds or populated
        const firstLane = organization.defaultLanes[0];
        let orgLaneIds: mongoose.Types.ObjectId[] = [];

        if (
          typeof firstLane === 'object' &&
          firstLane !== null &&
          '_id' in firstLane
        ) {
          // Already populated - extract _id
          orgLaneIds = (
            organization.defaultLanes as unknown as Array<{
              _id: mongoose.Types.ObjectId | string;
            }>
          ).map((lane) =>
            lane._id instanceof mongoose.Types.ObjectId
              ? lane._id
              : new mongoose.Types.ObjectId(lane._id),
          );
        } else {
          // ObjectIds - use directly
          orgLaneIds = (
            organization.defaultLanes as unknown as Array<
              mongoose.Types.ObjectId | string
            >
          ).map((id) =>
            id instanceof mongoose.Types.ObjectId
              ? id
              : new mongoose.Types.ObjectId(id),
          );
        }

        // Clone organization lanes to create job-specific lanes
        const orgLanes = await Lane.find({
          _id: { $in: orgLaneIds },
          organizationId: this.organizationId,
          jobId: null, // Organization-level lanes only
          isActive: true,
        })
          .select(
            'name description color order isDefault isEditable isDeletable systemKey',
          )
          .lean()
          .exec();

        if (orgLanes.length > 0) {
          // Create job-specific copies of organization lanes
          const jobLanes = await Lane.insertMany(
            orgLanes.map((orgLane) => ({
              organizationId: this.organizationId,
              jobId: this._id, // CRITICAL: Set jobId to make these job-specific lanes
              name: orgLane.name,
              description: orgLane.description,
              color: orgLane.color,
              order: orgLane.order,
              isDefault: false, // Job-specific lanes are never default
              isEditable: !orgLane.systemKey, // Respect system protection
              isDeletable: !orgLane.systemKey, // Respect system protection
              systemKey: orgLane.systemKey || null,
              isActive: true,
            })),
            { ordered: false }, // Continue on duplicate key errors
          );

          // Set job.lanes to the new job-specific lane ObjectIds
          this.lanes = jobLanes.map((lane) => lane._id);
          this.useCustomLanes = true;
        }
      }
    } catch (error) {
      // If cloning fails, continue without lanes (they can be set manually later)
      // Log error but don't block job creation
      logger.warn('Failed to clone organization lanes to job:', error);
    }
  }
  next();
});

export interface IJob extends Document<mongoose.Types.ObjectId> {
  organizationId: Schema.Types.ObjectId;
  title: string;
  // company: string;
  description: string;
  skills: string[];
  experience: {
    min: number;
    max?: number;
    inText?: string;
  };
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
  useCustomLanes: boolean;
  lanes?: Schema.Types.ObjectId[]; // References to Lane documents
  isDeleted?: boolean;
  promptForStatusChangeReason?: boolean;
  evaluationWeights?: {
    skills: number;
    experience: number;
    affordability: number;
    overall: number;
  };
  // Instance methods
  setCustomLanes: (laneIds: mongoose.Types.ObjectId[]) => Promise<IJob>;
  useDefaultLanes: () => Promise<IJob>;
  ensureLanesInitialized: () => Promise<void>;
}

// Static method to get effective lanes for a job
// Returns: { lanes: ObjectId[], useCustomLanes: boolean }
// If useCustomLanes is true, returns job-specific lanes
// If useCustomLanes is false, returns organization default lanes
jobSchema.statics.getEffectiveLanes = async function (
  jobId: mongoose.Types.ObjectId | string,
  organizationId: mongoose.Types.ObjectId | string,
) {
  const job = await this.findOne({
    _id: jobId,
    organizationId,
  })
    .select('lanes useCustomLanes organizationId')
    .lean()
    .exec();

  if (!job) {
    return null;
  }

  // If job uses custom lanes, return job-specific lanes (no config - filter/sort are client-side)
  if (job.useCustomLanes && job.lanes && job.lanes.length > 0) {
    const Lane = mongoose.connection.models.Lane || mongoose.model('Lane');
    const populatedLanes = await Lane.find({
      _id: { $in: job.lanes },
      organizationId,
      jobId:
        jobId instanceof mongoose.Types.ObjectId
          ? jobId
          : new mongoose.Types.ObjectId(jobId),
      isActive: true,
    })
      .select('_id name color order isActive systemKey')
      .sort({ order: 1 })
      .lean()
      .exec();

    return {
      lanes: populatedLanes,
      useCustomLanes: true,
    };
  }

  // Otherwise, return organization default lanes
  const Lane = mongoose.connection.models.Lane || mongoose.model('Lane');
  const orgLanes = await Lane.find({
    organizationId,
    jobId: null,
    isActive: true,
  })
    .select('_id name color order isActive systemKey')
    .sort({ order: 1 })
    .lean()
    .exec();

  return {
    lanes: orgLanes,
    useCustomLanes: false,
  };
};

// Instance method to set custom lanes
jobSchema.methods.setCustomLanes = async function (
  laneIds: mongoose.Types.ObjectId[],
) {
  this.lanes = laneIds;
  this.useCustomLanes = true;
  return this.save();
};

// Instance method to use organization default lanes
jobSchema.methods.useDefaultLanes = async function () {
  this.useCustomLanes = false;
  this.lanes = undefined;
  return this.save();
};

/**
 * Ensures that a job always has non-empty lanes.
 * If the job's lanes property is null, undefined, or an empty array,
 * it fetches organization default lanes and sets them on the job.
 * This method is idempotent and always leaves the job with valid lanes.
 *
 * @returns {Promise<void>}
 */
jobSchema.methods.ensureLanesInitialized = async function () {
  if (this.lanes && Array.isArray(this.lanes) && this.lanes.length > 0) {
    // Lanes are already set and non-empty.
    return;
  }

  // If this.organizationId is not set, cannot proceed.
  if (!this.organizationId) {
    throw new Error('OrganizationId is required to initialize lanes.');
  }

  // Import Organization only here to avoid circular dependencies if any
  const Organization = this.model('Organization');

  // Fetch the organization's default lanes
  const org = await Organization.findById(this.organizationId)
    .select('defaultLanes')
    .lean();

  if (
    !org ||
    !org.defaultLanes ||
    !Array.isArray(org.defaultLanes) ||
    org.defaultLanes.length === 0
  ) {
    throw new Error('Organization default lanes are not defined.');
  }

  // We want to CLONE the organization's default lanes as new, job-specific lanes (with this.jobId)
  // so that the job has its own private copy, but structurally following the organization's defaults.

  const Lane = this.model('Lane');

  // Get default lane IDs from organization
  const defaultLaneIds = org.defaultLanes.map((id: unknown) => {
    if (id instanceof mongoose.Types.ObjectId) {
      return id;
    }
    if (typeof id === 'string' || typeof id === 'number') {
      return new mongoose.Types.ObjectId(id);
    }
    throw new Error('Invalid lane ID format in organization defaultLanes');
  });

  // Fetch the full default lane definitions from DB (only the org's template lanes, not deleted, org only)
  const defaultLaneDocs = await Lane.find({
    _id: { $in: defaultLaneIds },
    organizationId: this.organizationId,
    jobId: null,
    isActive: true,
  })
    .lean()
    .exec();

  if (!defaultLaneDocs || defaultLaneDocs.length === 0) {
    throw new Error('Organization default lane templates not found.');
  }
  // Prepare cloned lanes with this jobId and organizationId, copying lane info
  const jobLanesData = defaultLaneDocs.map(
    (lane: {
      name: string;
      description?: string;
      color?: string;
      order: number;
      systemKey?: string | null;
      metadata?: Record<string, unknown>;
    }) => ({
      organizationId: this.organizationId,
      jobId: this._id, // set job-specific
      name: lane.name,
      description: lane.description,
      color: lane.color,
      order: lane.order,
      isDefault: false, // job-specific lanes are not default anymore
      isEditable: !lane.systemKey, // restrict editing for system lanes
      isDeletable: !lane.systemKey, // restrict deleting for system lanes
      systemKey: lane.systemKey || null,
      isActive: true,
      // Copy any additional fields that might exist in Lane schema safely
      ...(lane.metadata ? { metadata: lane.metadata } : {}),
    }),
  );

  // Create job-specific lanes in DB; ignore duplicates if any to support idempotency
  const insertedLanes = await Lane.insertMany(jobLanesData, { ordered: false });

  // Update job's lanes ref to these new lanes
  this.lanes = insertedLanes.map(
    (lane: { _id: mongoose.Types.ObjectId }) => lane._id,
  );

  // Mark the job as using custom lanes (sorting is client-side via localStorage)
  this.useCustomLanes = true;
};

// export const Job = mongoose.model('Job', jobSchema);
