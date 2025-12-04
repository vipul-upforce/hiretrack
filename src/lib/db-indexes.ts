/**
 * Database Indexes for Analytics Performance Optimization
 * This file contains the index definitions needed for optimal analytics query performance
 */

import mongoose from 'mongoose';

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
export async function createAnalyticsIndexes(connection: mongoose.Connection): Promise<void> {
  console.log('🔄 Creating analytics indexes...');

  const results = [];

  for (const indexDef of ANALYTICS_INDEXES) {
    try {
      const collection = connection.collection(indexDef.collection);

      // Check if index already exists
      const existingIndexes = await collection.indexes();
      const indexExists = existingIndexes.some((idx) => idx.name === indexDef.options?.name);

      if (indexExists) {
        console.log(`✅ Index ${indexDef.options?.name} already exists on ${indexDef.collection}`);
        continue;
      }

      // Create the index
      const result = await collection.createIndex(indexDef.index, indexDef.options);
      results.push({
        collection: indexDef.collection,
        name: indexDef.options?.name || 'unnamed',
        result,
      });

      console.log(`✅ Created index ${indexDef.options?.name} on ${indexDef.collection}`);
    } catch (error) {
      console.error(`❌ Failed to create index on ${indexDef.collection}:`, error);
      throw error;
    }
  }

  console.log(`🎉 Successfully created ${results.length} analytics indexes`);
}

/**
 * Drops all analytics indexes (for cleanup/testing)
 */
export async function dropAnalyticsIndexes(connection: mongoose.Connection): Promise<void> {
  console.log('🔄 Dropping analytics indexes...');

  for (const indexDef of ANALYTICS_INDEXES) {
    try {
      const collection = connection.collection(indexDef.collection);

      if (indexDef.options?.name) {
        await collection.dropIndex(indexDef.options.name);
        console.log(`✅ Dropped index ${indexDef.options.name} from ${indexDef.collection}`);
      }
    } catch (error:any) {
      // Index might not exist, which is fine
      console.log(`⚠️ Could not drop index from ${indexDef.collection}: ${error.message}`);
    }
  }

  console.log('🎉 Finished dropping analytics indexes');
}

/**
 * Checks the status of analytics indexes
 */
export async function checkAnalyticsIndexes(connection: mongoose.Connection): Promise<{
  collection: string;
  indexName: string;
  exists: boolean;
  stats?: any;
}[]> {
  const results = [];

  for (const indexDef of ANALYTICS_INDEXES) {
    try {
      const collection = connection.collection(indexDef.collection);
      const existingIndexes = await collection.indexes();
      const indexExists = existingIndexes.some((idx) => idx.name === indexDef.options?.name);

      let stats = null;
      if (indexExists && indexDef.options?.name) {
        try {
          stats = await (collection as any).indexStats({ name: indexDef.options.name });
        } catch (e) {
          // Index stats might not be available in all MongoDB versions
        }
      }

      results.push({
        collection: indexDef.collection,
        indexName: indexDef.options?.name || 'unnamed',
        exists: indexExists,
        stats,
      });
    } catch (error: unknown) {
      results.push({
        collection: indexDef.collection,
        indexName: indexDef.options?.name || 'unnamed',
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Validates query performance with explain plans
 */
export async function validateQueryPerformance(connection: mongoose.Connection): Promise<any[]> {
  const testQueries = [
    // Test candidate funnel query
    {
      collection: 'candidates',
      query: {
        organizationId: 'test-org-id',
        'tracking.createdAt': { $gte: new Date('2024-01-01'), $lte: new Date() },
        isDeleted: { $ne: true },
      },
      name: 'candidate_funnel_query',
    },
    // Test job performance query
    {
      collection: 'jobs',
      query: {
        organizationId: 'test-org-id',
        'tracking.createdAt': { $gte: new Date('2024-01-01'), $lte: new Date() },
        isDeleted: { $ne: true },
      },
      name: 'job_performance_query',
    },
    // Test interview assignment query
    {
      collection: 'candidates',
      query: {
        organizationId: 'test-org-id',
        'assignment.interviewerId': { $exists: true, $ne: null },
        isDeleted: { $ne: true },
      },
      name: 'interview_assignment_query',
    },
  ];

  const results = [];

  for (const testQuery of testQueries) {
    try {
      const collection = connection.collection(testQuery.collection);
      const explainResult = await collection.find(testQuery.query).explain('executionStats');

      results.push({
        name: testQuery.name,
        collection: testQuery.collection,
        executionStats: explainResult.executionStats,
        indexUsed: explainResult.executionStats?.totalKeysExamined > 0,
        performance: {
          totalDocsExamined: explainResult.executionStats?.totalDocsExamined,
          totalKeysExamined: explainResult.executionStats?.totalKeysExamined,
          executionTimeMillis: explainResult.executionStats?.executionTimeMillis,
        },
      });
    } catch (error: unknown) {
      results.push({
        name: testQuery.name,
        collection: testQuery.collection,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
