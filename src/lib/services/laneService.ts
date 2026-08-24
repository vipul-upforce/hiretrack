/**
 * Centralized Lane Service
 * 
 * This service provides a unified interface for all lane CRUD operations,
 * handling both organization-level (default) lanes and job-specific lanes.
 * 
 * Key features:
 * - Consistent validation across all operations
 * - Proper handling of system-protected lanes
 * - Candidate migration when lanes are deleted/renamed
 * - Broadcasting updates via SSE
 * - Transaction-safe operations
 */

import { Types } from 'mongoose';
import connectToDatabase, {
  Lane,
  Job,
  Organization,
  Candidate,
  History,
} from '@/lib/mongodb';
import { broadcastLaneUpdate, broadcastMultipleCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import {
  DEFAULT_LANES,
  SYSTEM_PROTECTED_LANES,
  LANE_RESTRICTIONS,
  type ILane,
} from '@/lib/models/Lane';
import { IHistory } from '@/lib/models/history';

// Re-export for convenience
export { LANE_RESTRICTIONS };

// Type for lean query results
type LeanLane = Omit<ILane, 'collection' | 'db' | 'model'>;

// Helper function to convert string/ObjectId to ObjectId
function toObjectId(
  id: string | Types.ObjectId | null | undefined,
): Types.ObjectId | null {
  if (!id) return null;
  if (typeof id === 'string') return new Types.ObjectId(id);
  return id;
}

// Helper function to convert string/ObjectId to ObjectId or undefined
function toObjectIdOrUndefined(
  id: string | Types.ObjectId | null | undefined,
): Types.ObjectId | undefined {
  if (!id) return undefined;
  if (typeof id === 'string') return new Types.ObjectId(id);
  return id;
}

// Types
export interface LaneValidationResult {
  isValid: boolean;
  error?: string;
}

export interface CreateLaneParams {
  organizationId: string | Types.ObjectId;
  jobId?: string | Types.ObjectId | null;
  name: string;
  order?: number;
  description?: string;
  color?: string;
  createdBy?: string | Types.ObjectId;
}

export interface UpdateLaneParams {
  organizationId: string | Types.ObjectId;
  jobId?: string | Types.ObjectId | null;
  laneName: string;
  updates: {
    name?: string;
    order?: number;
    description?: string;
    color?: string;
  };
}

export interface DeleteLaneParams {
  organizationId: string | Types.ObjectId;
  jobId?: string | Types.ObjectId | null;
  laneName: string;
  migrationLane?: string;
}

export interface GetLanesParams {
  organizationId: string | Types.ObjectId;
  jobId?: string | Types.ObjectId | null;
  includeInactive?: boolean;
}

/**
 * Normalizes a lane name to match schema requirements:
 * - Lowercase
 * - Replace spaces with hyphens
 * - Remove invalid characters
 * - Max 50 characters
 */
export function normalizeLaneName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .substring(0, 50);
}

/**
 * Validates a lane name according to schema rules
 */
export function validateLaneName(name: string): LaneValidationResult {
  if (!name || typeof name !== 'string') {
    return {
      isValid: false,
      error: 'Lane name is required and must be a string',
    };
  }

  const normalized = normalizeLaneName(name);
  if (!normalized || normalized.length === 0) {
    return {
      isValid: false,
      error: 'Invalid lane name. Must contain at least one alphanumeric character.',
    };
  }

  // Schema validation: lowercase alphanumeric, hyphens, underscores only, 1-50 chars
  if (!/^[a-z0-9_-]{1,50}$/.test(normalized)) {
    return {
      isValid: false,
      error:
        'Lane name must be 1-50 characters, lowercase alphanumeric with hyphens/underscores only',
    };
  }

  return { isValid: true };
}

/**
 * Validates an array of lane names
 */
export function validateLaneNames(lanes: string[]): LaneValidationResult {
  if (!Array.isArray(lanes) || lanes.length === 0) {
    return {
      isValid: false,
      error: 'Lanes must be a non-empty array',
    };
  }

  // Check for duplicates
  const uniqueLanes = [...new Set(lanes)];
  if (uniqueLanes.length !== lanes.length) {
    return {
      isValid: false,
      error: 'Duplicate lane names are not allowed',
    };
  }

  // Validate each lane name
  for (const lane of lanes) {
    const validation = validateLaneName(lane);
    if (!validation.isValid) {
      return validation;
    }
  }

  // Ensure required lanes are present
  const requiredLanes = ['applied', 'accepted', 'rejected'];
  const normalizedLanes = lanes.map(normalizeLaneName);
  for (const requiredLane of requiredLanes) {
    if (!normalizedLanes.includes(requiredLane)) {
      return {
        isValid: false,
        error: `Required lane '${requiredLane}' must be included`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Checks if a lane is system-protected and cannot be edited/deleted
 */
export function isLaneProtected(laneName: string): boolean {
  return SYSTEM_PROTECTED_LANES.includes(
    normalizeLaneName(laneName) as (typeof SYSTEM_PROTECTED_LANES)[number],
  );
}

/**
 * Gets organization-level (default) lanes
 */
export async function getOrganizationLanes(
  params: GetLanesParams,
): Promise<LeanLane[]> {
  await connectToDatabase();
  if (!Lane) {
    throw new Error('Database models not available');
  }

  const organizationId =
    typeof params.organizationId === 'string'
      ? new Types.ObjectId(params.organizationId)
      : params.organizationId;

  const query: {
    organizationId: Types.ObjectId;
    jobId: null;
    isActive?: boolean;
  } = {
    organizationId,
    jobId: null,
  };

  if (!params.includeInactive) {
    query.isActive = true;
  }

  return Lane.find(query).sort({ order: 1 }).lean();
}

/**
 * Gets job-specific lanes (job-specific + organization defaults)
 */
export async function getJobLanes(
  params: GetLanesParams & { jobId: string | Types.ObjectId },
): Promise<LeanLane[]> {
  await connectToDatabase();
  if (!Lane) {
    throw new Error('Database models not available');
  }

  const organizationId =
    typeof params.organizationId === 'string'
      ? new Types.ObjectId(params.organizationId)
      : params.organizationId;
  const jobId =
    typeof params.jobId === 'string'
      ? new Types.ObjectId(params.jobId)
      : params.jobId;

  const query: {
    organizationId: Types.ObjectId;
    $or: Array<{ jobId: Types.ObjectId | null }>;
    isActive?: boolean;
  } = {
    organizationId,
    $or: [{ jobId }, { jobId: null }],
  };

  if (!params.includeInactive) {
    query.isActive = true;
  }

  return Lane.find(query).sort({ order: 1 }).lean();
}

/**
 * Gets only job-specific lanes (excluding organization defaults)
 */
export async function getJobSpecificLanes(
  params: GetLanesParams & { jobId: string | Types.ObjectId },
): Promise<LeanLane[]> {
  await connectToDatabase();
  if (!Lane) {
    throw new Error('Database models not available');
  }

  const organizationId =
    typeof params.organizationId === 'string'
      ? new Types.ObjectId(params.organizationId)
      : params.organizationId;
  const jobId =
    typeof params.jobId === 'string'
      ? new Types.ObjectId(params.jobId)
      : params.jobId;

  const query: {
    organizationId: Types.ObjectId;
    jobId: Types.ObjectId;
    isActive?: boolean;
  } = {
    organizationId,
    jobId,
  };

  if (!params.includeInactive) {
    query.isActive = true;
  }

  return Lane.find(query).sort({ order: 1 }).lean();
}

/**
 * Creates a single lane
 */
export async function createLane(
  params: CreateLaneParams,
): Promise<ILane> {
  await connectToDatabase();
  if (!Lane) {
    throw new Error('Database models not available');
  }

  // Validate lane name
  const validation = validateLaneName(params.name);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const normalizedName = normalizeLaneName(params.name);
  const organizationId = toObjectId(params.organizationId);
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }
  const jobId = toObjectId(params.jobId);
  const createdBy = params.createdBy ? toObjectId(params.createdBy) : undefined;

  // Check if lane already exists
  const existingLane = await Lane.findOne({
    organizationId,
    jobId,
    name: normalizedName,
  });

  if (existingLane) {
    throw new Error('Lane already exists');
  }

  // Determine if this is a protected lane
  const isProtected = isLaneProtected(normalizedName);
  const isDefaultLane = DEFAULT_LANES.includes(
    normalizedName as (typeof DEFAULT_LANES)[number],
  );

  // Create lane
  const lane = await Lane.create({
    organizationId,
    jobId,
    name: normalizedName,
    order: params.order ?? 0,
    description: params.description,
    color: params.color,
    isDefault: isDefaultLane && !jobId, // Only org-level lanes can be default
    isEditable: !isProtected,
    isDeletable: !isProtected,
    isActive: true,
    createdBy,
  });

  return lane.toObject();
}

/**
 * Creates multiple lanes (bulk operation)
 */
export async function createLanes(
  params: Omit<CreateLaneParams, 'name' | 'order'> & {
    lanes: Array<{ name: string; order?: number }>;
  },
): Promise<LeanLane[]> {
  await connectToDatabase();
  if (!Lane) {
    throw new Error('Database models not available');
  }

  const organizationId = toObjectId(params.organizationId);
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }
  const jobId = toObjectId(params.jobId);

  // Validate all lane names
  const laneNames = params.lanes.map((l) => l.name);
  const validation = validateLaneNames(laneNames);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Normalize all names
  const normalizedLanes = params.lanes.map((lane) => ({
    ...lane,
    name: normalizeLaneName(lane.name),
  }));

  // Check existing lanes
  const existingLanes = await Lane.find({
    organizationId,
    jobId,
    name: { $in: normalizedLanes.map((l) => l.name) },
  }).lean();

  const existingNames = new Set(existingLanes.map((l) => l.name));
  const lanesToCreate = normalizedLanes.filter(
    (lane) => !existingNames.has(lane.name),
  );

  if (lanesToCreate.length === 0) {
    return existingLanes;
  }

  // Create lanes
  const laneData = lanesToCreate.map((lane, index) => {
    const isProtected = isLaneProtected(lane.name);
    const isDefaultLane = DEFAULT_LANES.includes(
      lane.name as (typeof DEFAULT_LANES)[number],
    );

    return {
      organizationId,
      jobId,
      name: lane.name,
      order: lane.order ?? index,
      isDefault: isDefaultLane && !jobId,
      isEditable: !isProtected,
      isDeletable: !isProtected,
      isActive: true,
      createdBy: toObjectIdOrUndefined(params.createdBy),
    };
  });

  const createdLanes = await Lane.insertMany(laneData, { ordered: false });
  return [...existingLanes, ...createdLanes.map((l) => l.toObject())];
}

/**
 * Updates a lane (rename, reorder, or update properties)
 */
export async function updateLane(
  params: UpdateLaneParams,
): Promise<ILane> {
  await connectToDatabase();
  if (!Lane || !Candidate) {
    throw new Error('Database models not available');
  }

  const organizationId = toObjectId(params.organizationId);
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }
  const jobId = toObjectId(params.jobId);
  const normalizedOldName = normalizeLaneName(params.laneName);

  // Find existing lane
  const lane = await Lane.findOne({
    organizationId,
    jobId,
    name: normalizedOldName,
    isActive: true,
  });

  if (!lane) {
    throw new Error('Lane not found');
  }

  // Check if lane is protected
  if (isLaneProtected(normalizedOldName) && params.updates.name) {
    throw new Error(`Cannot rename protected lane: ${normalizedOldName}`);
  }

    // If renaming, validate new name
    if (params.updates.name) {
      const newName = normalizeLaneName(params.updates.name);
      if (newName === normalizedOldName) {
        throw new Error('New lane name must be different from current name');
      }

      // Check if new name already exists
      const existingLane = await Lane.findOne({
        organizationId,
        jobId,
        name: newName,
      });

      if (existingLane) {
        throw new Error('Lane name already exists');
      }

      // Update lane name first
      lane.name = newName;
      await lane.save();

      // Update candidates with old lane ObjectId to new lane ObjectId
      // Note: We need to find the new lane after saving to get its _id
      const updatedLane = await Lane.findById(lane._id);
      if (updatedLane) {
        await Candidate.updateMany(
          {
            organizationId,
            jobId: jobId || undefined,
            status: lane._id, // Old lane ObjectId
          },
          { $set: { status: updatedLane._id } }, // New lane ObjectId (same _id, just updated name)
        );
      }
    }

  // Update other properties (if not already saved during rename)
  if (!params.updates.name) {
    if (params.updates.order !== undefined) {
      lane.order = params.updates.order;
    }
    if (params.updates.description !== undefined) {
      lane.description = params.updates.description;
    }
    if (params.updates.color !== undefined) {
      lane.color = params.updates.color;
    }
    await lane.save();
  } else {
    // If we renamed, update other properties separately
    if (params.updates.order !== undefined) {
      lane.order = params.updates.order;
    }
    if (params.updates.description !== undefined) {
      lane.description = params.updates.description;
    }
    if (params.updates.color !== undefined) {
      lane.color = params.updates.color;
    }
    if (
      params.updates.order !== undefined ||
      params.updates.description !== undefined ||
      params.updates.color !== undefined
    ) {
      await lane.save();
    }
  }

  // Broadcast updates if candidates were affected
  if (params.updates.name) {
    const updatedLane = await Lane.findById(lane._id);
    if (!updatedLane) {
      throw new Error('Failed to find updated lane');
    }

    const updatedCandidates = await Candidate.find({
      organizationId,
      jobId: jobId || undefined,
      status: updatedLane._id, // Use lane ObjectId, not name
    })
      .populate([
        { path: 'assignment.interviewerId', select: '_id name email' },
        { path: 'remarks.userId', select: 'name email' },
        { path: 'jobId', select: '_id description title' },
        { path: 'status', select: 'name', transform: (status: { name?: string } | null) => status?.name ?? null },
      ])
      .lean()
      .exec();

    if (updatedCandidates.length > 0 && History) {
      const candidateIds = updatedCandidates.map((c) => c._id);
      const candidateHistories: IHistory[] = await History.find({
        candidateId: { $in: candidateIds },
      })
        .populate([
          { path: 'history.assignmentBy', select: '_id name email' },
          { path: 'history.currentInterviewer', select: '_id name email' },
          { path: 'history.previousInterviewer', select: '_id name email' },
          { path: 'history.note.userId', select: '_id name email' },
        ])
        .lean()
        .exec();

      const candidatesWithHistory = updatedCandidates.map((candidate) => {
        const history = candidateHistories.find(
          (h) => h.candidateId.toString() === candidate._id.toString(),
        );
        return {
          ...candidate,
          history: history?.history || [],
        };
      });

      broadcastMultipleCandidateUpdate(candidatesWithHistory);
    }
  }

  return lane.toObject();
}

/**
 * Deletes a lane (soft delete by setting isActive to false)
 */
export async function deleteLane(
  params: DeleteLaneParams,
): Promise<void> {
  await connectToDatabase();
  if (!Lane || !Candidate || !Job || !Organization) {
    throw new Error('Database models not available');
  }

  const organizationId = toObjectId(params.organizationId);
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }
  const jobId = toObjectId(params.jobId);
  const normalizedName = normalizeLaneName(params.laneName);

  // Check if lane is protected
  if (isLaneProtected(normalizedName)) {
    throw new Error(`Cannot delete protected lane: ${normalizedName}`);
  }

  // Find lane
  const lane = await Lane.findOne({
    organizationId,
    jobId,
    name: normalizedName,
    isActive: true,
  });

  if (!lane) {
    throw new Error('Lane not found');
  }

  // Check if there are candidates in this lane
  const candidateCount = await Candidate.countDocuments({
    organizationId,
    jobId: jobId || undefined,
    status: lane._id,
  });

  if (candidateCount > 0) {
    if (!params.migrationLane) {
      // Get available lanes for migration
      const availableLanes = jobId
        ? await getJobSpecificLanes({ organizationId, jobId, includeInactive: false })
        : await getOrganizationLanes({ organizationId, includeInactive: false });

      const availableLaneNames = availableLanes
        .filter((l) => l.name !== normalizedName)
        .map((l) => l.name);

      throw new Error(
        JSON.stringify({
          message: 'Cannot delete lane: candidates are currently in this lane',
          migrationNeeded: true,
          lanes: availableLaneNames,
        }),
      );
    }

    // Migrate candidates to new lane
    const migrationLaneName = normalizeLaneName(params.migrationLane);
    const migrationLane = await Lane.findOne({
      organizationId,
      jobId,
      name: migrationLaneName,
      isActive: true,
    });

    if (!migrationLane) {
      throw new Error(`Migration lane not found: ${migrationLaneName}`);
    }

    await Candidate.updateMany(
      {
        organizationId,
        jobId: jobId || undefined,
        status: lane._id,
      },
      { $set: { status: migrationLane._id } },
    );
  }

  // Soft delete the lane
  lane.isActive = false;
  await lane.save();

  // If this is a job-specific lane, update job's lanes array and remove laneConfig
  if (jobId) {
    const job = await Job.findById(jobId);
    if (job) {
      // Remove lane from job's lanes array
      if (job.lanes) {
        const updatedLaneIds = job.lanes.filter(
          (id) => id.toString() !== lane._id.toString(),
        );
        job.lanes = updatedLaneIds;
      }

      // Remove laneConfig for this lane
      if (job.laneConfigs && Array.isArray(job.laneConfigs)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const laneConfigsArray = job.laneConfigs as any[];
        const updatedLaneConfigs = laneConfigsArray.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (config: any) => {
            const configLaneId =
              config.laneId instanceof Types.ObjectId
                ? config.laneId
                : new Types.ObjectId(String(config.laneId));
            return configLaneId.toString() !== lane._id.toString();
          },
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        job.laneConfigs = updatedLaneConfigs as any;
      }

      const jobLaneUpdate: Record<string, unknown> = {};
      if (job.lanes) {
        jobLaneUpdate.lanes = job.lanes;
      }
      if (job.laneConfigs) {
        jobLaneUpdate.laneConfigs = job.laneConfigs;
      }
      if (Object.keys(jobLaneUpdate).length > 0) {
        await Job.findByIdAndUpdate(jobId, { $set: jobLaneUpdate });
      }
    }
  } else {
    // If this is an organization-level lane, update organization's defaultLanes
    const organization = await Organization.findById(organizationId);
    if (organization && organization.defaultLanes) {
      const updatedLaneIds = organization.defaultLanes.filter(
        (id) => id.toString() !== lane._id.toString(),
      );
      await Organization.findByIdAndUpdate(organizationId, {
        $set: { defaultLanes: updatedLaneIds },
      });
    }
  }

  // Broadcast lane update
  const laneNames = jobId
    ? await getJobSpecificLanes({ organizationId, jobId, includeInactive: false })
    : await getOrganizationLanes({ organizationId, includeInactive: false });

  broadcastLaneUpdate(
    organizationId.toString(),
    laneNames.map((l) => l.name),
    jobId?.toString(),
  );
}

/**
 * Updates lane order for multiple lanes
 */
export async function updateLaneOrder(
  params: GetLanesParams & {
    laneOrders: Array<{ laneName: string; order: number }>;
  },
): Promise<LeanLane[]> {
  await connectToDatabase();
  if (!Lane) {
    throw new Error('Database models not available');
  }

  const organizationId = toObjectId(params.organizationId);
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }
  const jobId = toObjectId(params.jobId);

  if (!Lane) {
    throw new Error('Database models not available');
  }

  // TypeScript narrowing: assign to const after null check
  const LaneModel = Lane;

  // Update each lane's order
  const updatePromises = params.laneOrders.map(({ laneName, order }) =>
    LaneModel.updateOne(
      {
        organizationId,
        jobId,
        name: normalizeLaneName(laneName),
      },
      { $set: { order } },
    ),
  );

  await Promise.all(updatePromises);

  // Return updated lanes
  if (jobId) {
    return getJobSpecificLanes({ organizationId, jobId, includeInactive: false });
  }
  return getOrganizationLanes({ organizationId, includeInactive: false });
}

/**
 * Creates default lanes for an organization
 */
export async function createDefaultLanes(
  organizationId: string | Types.ObjectId,
  createdBy?: string | Types.ObjectId,
): Promise<LeanLane[]> {
  return createLanes({
    organizationId,
    jobId: null,
    createdBy,
    lanes: DEFAULT_LANES.map((name, index) => ({ name, order: index })),
  });
}

/**
 * Syncs organization's defaultLanes array with actual Lane documents
 */
export async function syncOrganizationDefaultLanes(
  organizationId: string | Types.ObjectId,
  laneNames: string[],
): Promise<{ laneIds: Types.ObjectId[]; lanes: LeanLane[] }> {
  await connectToDatabase();
  if (!Lane || !Organization) {
    throw new Error('Database models not available');
  }

  const orgId =
    typeof organizationId === 'string'
      ? new Types.ObjectId(organizationId)
      : organizationId;

  // Validate lane names
  const validation = validateLaneNames(laneNames);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Normalize all names
  const normalizedNames = laneNames.map(normalizeLaneName);

  // Get or create lanes
  const existingLanes = await Lane.find({
    organizationId: orgId,
    jobId: null,
    name: { $in: normalizedNames },
  }).lean();

  const existingLaneMap = new Map(
    existingLanes.map((lane) => [lane.name, lane]),
  );

  const laneIds: Types.ObjectId[] = [];
  const lanesToCreate: Array<{
    organizationId: Types.ObjectId;
    jobId: null;
    name: string;
    order: number;
    isDefault: boolean;
    isEditable: boolean;
    isDeletable: boolean;
    isActive: boolean;
  }> = [];

  // Process each lane in order
  for (let index = 0; index < normalizedNames.length; index += 1) {
    const laneName = normalizedNames[index];
    const existingLane = existingLaneMap.get(laneName);

    if (existingLane) {
      // Update order and ensure active
      await Lane.findByIdAndUpdate(existingLane._id, {
        order: index,
        isActive: true,
      });
      laneIds.push(existingLane._id);
    } else {
      // Will create after validation
      const isDefaultLane = DEFAULT_LANES.includes(
        laneName as (typeof DEFAULT_LANES)[number],
      );
      const isProtected = isLaneProtected(laneName);

      lanesToCreate.push({
        organizationId: orgId,
        jobId: null,
        name: laneName,
        order: index,
        isDefault: isDefaultLane,
        isEditable: !isProtected,
        isDeletable: !isProtected,
        isActive: true,
      });
    }
  }

  // Create new lanes if any
  if (lanesToCreate.length > 0) {
    const createdLanes = await Lane.insertMany(lanesToCreate, {
      ordered: false,
    });
    createdLanes.forEach((lane) => laneIds.push(lane._id));
  }

  // Deactivate lanes not in the list
  await Lane.updateMany(
    {
      organizationId: orgId,
      jobId: null,
      name: { $nin: normalizedNames },
    },
    { $set: { isActive: false } },
  );

  // Update organization
  await Organization.findByIdAndUpdate(orgId, {
    $set: {
      defaultLanes: laneIds,
      laneRestrictions: LANE_RESTRICTIONS,
    },
  });

  // Fetch all lanes for return
  const allLanes = await Lane.find({
    _id: { $in: laneIds },
    organizationId: orgId,
    jobId: null,
    isActive: true,
  })
    .sort({ order: 1 })
    .lean();

  return { laneIds, lanes: allLanes };
}

/**
 * Gets the "applied" lane ObjectId for a job
 * Prioritizes job-specific lanes, falls back to organization-level lanes
 */
export async function getJobAppliedLaneId(
  organizationId: string | Types.ObjectId,
  jobId: string | Types.ObjectId,
): Promise<Types.ObjectId | null> {
  await connectToDatabase();
  if (!Lane) {
    throw new Error('Database models not available');
  }

  const orgId = toObjectId(organizationId);
  if (!orgId) {
    throw new Error('Organization ID is required');
  }
  const jobObjectId = toObjectId(jobId);
  if (!jobObjectId) {
    throw new Error('Job ID is required');
  }

  // Try to find job-specific "applied" lane first
  let appliedLane = await Lane.findOne({
    organizationId: orgId,
    jobId: jobObjectId,
    name: 'applied',
    isActive: true,
  })
    .select('_id')
    .lean();

  // If not found, try organization-level "applied" lane
  if (!appliedLane) {
    appliedLane = await Lane.findOne({
      organizationId: orgId,
      jobId: null,
      name: 'applied',
      isActive: true,
    })
      .select('_id')
      .lean();
  }

  if (appliedLane && appliedLane._id) {
    return appliedLane._id instanceof Types.ObjectId
      ? appliedLane._id
      : new Types.ObjectId(appliedLane._id);
  }

  return null;
}

/**
 * Gets a lane ObjectId by lane name for a specific job or organization
 * Prioritizes job-specific lanes, falls back to organization-level lanes
 */
export async function getLaneIdByName(
  organizationId: string | Types.ObjectId,
  jobId: string | Types.ObjectId | null,
  laneName: string,
): Promise<Types.ObjectId | null> {
  await connectToDatabase();
  if (!Lane) {
    throw new Error('Database models not available');
  }

  const orgId = toObjectId(organizationId);
  if (!orgId) {
    throw new Error('Organization ID is required');
  }

  const normalizedName = normalizeLaneName(laneName);

  // If jobId is provided, try job-specific lane first
  if (jobId) {
    const jobObjectId = toObjectId(jobId);
    if (jobObjectId) {
      const jobLane = await Lane.findOne({
        organizationId: orgId,
        jobId: jobObjectId,
        name: normalizedName,
        isActive: true,
      })
        .select('_id')
        .lean();

      if (jobLane) {
        return jobLane._id;
      }
    }
  }

  // Fall back to organization-level lane
  const orgLane = await Lane.findOne({
    organizationId: orgId,
    jobId: null,
    name: normalizedName,
    isActive: true,
  })
    .select('_id')
    .lean();

  return orgLane ? orgLane._id : null;
}

/**
 * Syncs job's lanes array with actual Lane documents
 */
export async function syncJobLanes(
  organizationId: string | Types.ObjectId,
  jobId: string | Types.ObjectId,
  laneNames: string[],
): Promise<{ laneIds: Types.ObjectId[]; lanes: LeanLane[] }> {
  await connectToDatabase();
  if (!Lane || !Job) {
    throw new Error('Database models not available');
  }

  // TypeScript narrowing: assign to const after null check
  const LaneModel = Lane;

  const orgId =
    typeof organizationId === 'string'
      ? new Types.ObjectId(organizationId)
      : organizationId;
  const jobObjectId = toObjectId(jobId);
  if (!jobObjectId) {
    throw new Error('Job ID is required');
  }

  // Validate lane names
  const validation = validateLaneNames(laneNames);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Normalize all names
  const normalizedNames = laneNames.map(normalizeLaneName);

  // Get or create lanes
  const existingLanes = await LaneModel.find({
    organizationId: orgId,
    jobId: jobObjectId,
    name: { $in: normalizedNames },
  }).lean();

  const existingLaneMap = new Map(
    existingLanes.map((lane) => [lane.name, lane]),
  );

  const laneIds: Types.ObjectId[] = [];
  const lanesToCreate: Array<{
    organizationId: Types.ObjectId;
    jobId: Types.ObjectId;
    name: string;
    order: number;
    isDefault: boolean;
    isEditable: boolean;
    isDeletable: boolean;
    isActive: boolean;
  }> = [];

  // Process each lane in order
  for (let index = 0; index < normalizedNames.length; index += 1) {
    const laneName = normalizedNames[index];
    const existingLane = existingLaneMap.get(laneName);

    if (existingLane) {
      // Update order and ensure active
      await LaneModel.findByIdAndUpdate(existingLane._id, {
        order: index,
        isActive: true,
      });
      laneIds.push(existingLane._id);
    } else {
      // Check if this is a protected lane by checking org-level lanes
      const orgLane = await LaneModel.findOne({
        organizationId: orgId,
        jobId: null,
        name: laneName,
        isActive: true,
      });

      const isProtected = orgLane?.systemKey
        ? SYSTEM_PROTECTED_LANES.includes(
            orgLane.systemKey as (typeof SYSTEM_PROTECTED_LANES)[number],
          )
        : isLaneProtected(laneName);

      lanesToCreate.push({
        organizationId: orgId,
        jobId: jobObjectId,
        name: laneName,
        order: index,
        isDefault: false, // Job-specific lanes are never default
        isEditable: !isProtected,
        isDeletable: !isProtected,
        isActive: true,
      });
    }
  }

  // Create new lanes if any
  const newlyCreatedLaneIds: Types.ObjectId[] = [];
  if (lanesToCreate.length > 0) {
    const createdLanes = await LaneModel.insertMany(lanesToCreate, {
      ordered: false,
    });
    createdLanes.forEach((lane) => {
      laneIds.push(lane._id);
      newlyCreatedLaneIds.push(lane._id);
    });
  }

  // Deactivate lanes not in the list
  await LaneModel.updateMany(
    {
      organizationId: orgId,
      jobId: jobObjectId,
      name: { $nin: normalizedNames },
    },
    { $set: { isActive: false } },
  );

  // Get current job to manage laneConfigs
  const job = await Job.findById(jobObjectId);
  if (!job) {
    throw new Error('Job not found');
  }

  // Initialize laneConfigs array if it doesn't exist
  if (!job.laneConfigs || !Array.isArray(job.laneConfigs)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    job.laneConfigs = [] as any;
  }

  // Add default laneConfigs for newly created lanes
  if (newlyCreatedLaneIds.length > 0) {
    // Ensure laneConfigs exists
    if (!job.laneConfigs || !Array.isArray(job.laneConfigs)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      job.laneConfigs = [] as any;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const laneConfigsArray = job.laneConfigs as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    const existingLaneConfigIds = new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      laneConfigsArray.map((config: any) =>
        config.laneId instanceof Types.ObjectId
          ? config.laneId.toString()
          : String(config.laneId),
      ),
    );

    const newLaneConfigs = newlyCreatedLaneIds
      .filter(
        (laneId) => !existingLaneConfigIds.has(laneId.toString()),
      )
      .map((laneId) => ({
        laneId,
        sortBy: 'tracking.createdAt' as const,
        sortOrder: -1, // Descending (newest first)
      }));

    if (newLaneConfigs.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      job.laneConfigs = [...laneConfigsArray, ...newLaneConfigs] as any;
    }
  }

  // Partial update only — avoids re-validating unrelated legacy job fields (e.g. experience)
  const jobUpdate: {
    lanes: Types.ObjectId[];
    useCustomLanes: boolean;
    laneConfigs?: unknown;
  } = {
    lanes: laneIds,
    useCustomLanes: true,
  };
  if (newlyCreatedLaneIds.length > 0 && job.laneConfigs) {
    jobUpdate.laneConfigs = job.laneConfigs;
  }
  await Job.findByIdAndUpdate(jobObjectId, { $set: jobUpdate });

  // Fetch all lanes for return
  const allLanes = await LaneModel.find({
    _id: { $in: laneIds },
    organizationId: orgId,
    jobId: jobObjectId,
    isActive: true,
  })
    .sort({ order: 1 })
    .lean();

  return { laneIds, lanes: allLanes };
}

export async function getLaneNameById(laneId: string | Types.ObjectId): Promise<string | null> {
  await connectToDatabase();
  if (!Lane) {
    throw new Error('Database models not available');
  }

  const lane = await Lane.findById(laneId).select('name').lean();
  return lane?.name ?? null;
}