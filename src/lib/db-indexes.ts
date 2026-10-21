/**
 * Database Indexes for Analytics Performance Optimization
 * This file contains the index definitions needed for optimal analytics query performance
 */

import mongoose from 'mongoose';
import logger from './logger';

interface IndexDefinition {
  collection: string;
  index: Record<string, 1 | -1>;
  options?: {
    name?: string;
    background?: boolean;
    sparse?: boolean;
    unique?: boolean;
  };
}

/**
 * Essential indexes for analytics queries
 * These indexes are critical for performance with large datasets
 */
export const ANALYTICS_INDEXES: IndexDefinition[] = [
  // Candidates collection indexes
  {
    collection: 'candidates',
    index: {
      organizationId: 1,
      'tracking.createdAt': 1,
      isDeleted: 1,
    },
    options: {
      name: 'analytics_candidates_org_created_deleted',
      background: true,
    },
  },
  {
    collection: 'candidates',
    index: {
      organizationId: 1,
      status: 1,
      jobId: 1,
      isDeleted: 1,
    },
    options: {
      name: 'analytics_candidates_org_status_job_deleted',
      background: true,
    },
  },
  {
    collection: 'candidates',
    index: {
      organizationId: 1,
      jobId: 1,
      'tracking.createdAt': 1,
      isDeleted: 1,
    },
    options: {
      name: 'analytics_candidates_org_job_created_deleted',
      background: true,
    },
  },
  {
    collection: 'candidates',
    index: {
      'assignment.interviewerId': 1,
      organizationId: 1,
      'assignment.assignedAt': 1,
    },
    options: {
      name: 'analytics_candidates_interviewer_org_assigned',
      background: true,
      sparse: true, // Only for documents with assignment field
    },
  },

  // Jobs collection indexes
  {
    collection: 'jobs',
    index: {
      organizationId: 1,
      'tracking.createdAt': 1,
      isDeleted: 1,
    },
    options: {
      name: 'analytics_jobs_org_created_deleted',
      background: true,
    },
  },
  {
    collection: 'jobs',
    index: {
      organizationId: 1,
      status: 1,
      isPublished: 1,
      isDeleted: 1,
    },
    options: {
      name: 'analytics_jobs_org_status_published_deleted',
      background: true,
    },
  },

  // Users collection index for interviewer lookups
  {
    collection: 'users',
    index: {
      _id: 1,
      organizationId: 1,
      role: 1,
    },
    options: {
      name: 'analytics_users_id_org_role',
      background: true,
    },
  },
];

/**
 * Creates all analytics indexes
 * Should be run during application startup or as a migration
 */
export async function createAnalyticsIndexes(
  connection: mongoose.Connection,
): Promise<void> {
  const results = [];

  for (const indexDef of ANALYTICS_INDEXES) {
    try {
      const collection = connection.collection(indexDef.collection);

      // Check if index already exists
      const existingIndexes = await collection.indexes();
      const indexExists = existingIndexes.some(
        (idx) => idx.name === indexDef.options?.name,
      );

      if (indexExists) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // Create the index
      const result = await collection.createIndex(
        indexDef.index,
        indexDef.options,
      );
      results.push({
        collection: indexDef.collection,
        name: indexDef.options?.name || 'unnamed',
        result,
      });
    } catch (error) {
      logger.error(
        `Error creating index on collection ${indexDef.collection}:`,
        error,
      );
      throw error;
    }
  }
}
