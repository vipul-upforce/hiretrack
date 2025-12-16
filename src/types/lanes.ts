/**
 * Lane System Types
 * 
 * Centralized type definitions for the lane management system.
 * Provides clear types for lane sources, data structures, and resolution results.
 */

/**
 * Source of lane data - indicates where the lanes came from
 */
export enum LaneSource {
  /** Lanes are job-specific (job.useCustomLanes === true) */
  JOB_SPECIFIC = "JOB_SPECIFIC",
  /** Lanes come from organization defaults */
  ORGANIZATION_DEFAULT = "ORGANIZATION_DEFAULT",
  /** Fallback to hardcoded default lanes */
  HARDCODED = "HARDCODED",
}

/**
 * Lane data structure with source tracking
 */
export interface LaneData {
  /** Array of lane names (strings) */
  lanes: string[];
  /** Source of the lanes */
  source: LaneSource;
  /** Job ID if lanes are job-specific */
  jobId?: string;
  /** Organization ID */
  organizationId: string;
  /** Whether job is using custom lanes (only relevant for job-specific) */
  useCustomLanes?: boolean;
}

/**
 * Result of lane resolution with metadata
 */
export interface LaneResolutionResult {
  /** The resolved lanes */
  lanes: string[];
  /** Source of the lanes */
  source: LaneSource;
  /** Whether lanes are loading */
  isLoading: boolean;
  /** Error if any */
  error?: unknown;
  /** Function to refetch lanes */
  refetch: () => void;
  /** Job ID if applicable */
  jobId?: string;
  /** Organization ID */
  organizationId?: string;
}

/**
 * Default lanes used as fallback
 */
export const DEFAULT_LANES = [
  "applied",
  "screening",
  "shortlisted",
  "processing",
  "accepted",
  "rejected",
] as const;

/**
 * Restricted lanes that cannot be edited or deleted
 */
export const RESTRICTED_LANES = ["applied", "accepted", "rejected"] as const;

/**
 * Lane restrictions configuration
 */
export interface LaneRestrictions {
  nonEditable: string[];
  nonDeletable: string[];
}

