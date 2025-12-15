#!/usr/bin/env node

/**
 * Database Migration Script: Analytics Indexes (Mongoose Version)
 * 
 * This script creates the necessary indexes for optimal analytics query performance.
 * Uses Mongoose instead of native MongoDB driver.
 * 
 * Usage:
 *   node scripts/apply-analytics-indexes.mjs
 */

import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get environment variables from .env file manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

let MONGODB_URI;
try {
  const envContent = readFileSync(join(projectRoot, '.env'), 'utf8');
  const envLines = envContent.split('\n');
  for (const line of envLines) {
    if (line.startsWith('MONGODB_URI=')) {
      MONGODB_URI = line.split('=')[1].trim();
      break;
    }
  }
} catch (error) {
  console.error('❌ Could not read .env file');
}

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env file');
  process.exit(1);
}

// Analytics indexes configuration
const ANALYTICS_INDEXES = [
  // Candidates collection indexes
  {
    collection: 'candidates',
    index: { 
      organizationId: 1, 
      'tracking.createdAt': 1, 
      isDeleted: 1 
    },
    options: { 
      name: 'analytics_candidates_org_created_deleted',
      background: true 
    }
  },
  {
    collection: 'candidates',
    index: { 
      organizationId: 1, 
      status: 1, 
      jobId: 1,
      isDeleted: 1 
    },
    options: { 
      name: 'analytics_candidates_org_status_job_deleted',
      background: true 
    }
  },
  {
    collection: 'candidates',
    index: { 
      organizationId: 1, 
      jobId: 1, 
      'tracking.createdAt': 1,
      isDeleted: 1 
    },
    options: { 
      name: 'analytics_candidates_org_job_created_deleted',
      background: true 
    }
  },
  {
    collection: 'candidates',
    index: { 
      'assignment.interviewerId': 1, 
      organizationId: 1,
      'assignment.assignedAt': 1 
    },
    options: { 
      name: 'analytics_candidates_interviewer_org_assigned',
      background: true,
      sparse: true
    }
  },

  // Jobs collection indexes
  {
    collection: 'jobs',
    index: { 
      organizationId: 1, 
      'tracking.createdAt': 1, 
      isDeleted: 1 
    },
    options: { 
      name: 'analytics_jobs_org_created_deleted',
      background: true 
    }
  },
  {
    collection: 'jobs',
    index: { 
      organizationId: 1, 
      status: 1, 
      isPublished: 1,
      isDeleted: 1 
    },
    options: { 
      name: 'analytics_jobs_org_status_published_deleted',
      background: true 
    }
  },

  // Users collection index
  {
    collection: 'users',
    index: { 
      _id: 1, 
      organizationId: 1, 
      role: 1 
    },
    options: { 
      name: 'analytics_users_id_org_role',
      background: true 
    }
  }
];

async function createAnalyticsIndexes() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const {db} = mongoose.connection;
    const results = [];
    
    console.log('🔄 Creating analytics indexes...');
    
    for (const indexDef of ANALYTICS_INDEXES) {
      try {
        const collection = db.collection(indexDef.collection);
        
        // Check if index already exists
        const existingIndexes = await collection.indexes();
        const indexExists = existingIndexes.some(idx => idx.name === indexDef.options.name);
        
        if (indexExists) {
          console.log(`⚠️  Index ${indexDef.options.name} already exists on ${indexDef.collection}`);
          results.push({
            collection: indexDef.collection,
            name: indexDef.options.name,
            status: 'already_exists'
          });
          continue;
        }
        
        // Create the index
        console.log(`🔄 Creating index ${indexDef.options.name} on ${indexDef.collection}...`);
        const result = await collection.createIndex(indexDef.index, indexDef.options);
        
        results.push({
          collection: indexDef.collection,
          name: indexDef.options.name,
          status: 'created',
          result
        });
        
        console.log(`✅ Created index ${indexDef.options.name} on ${indexDef.collection}`);
      } catch (error) {
        console.error(`❌ Failed to create index on ${indexDef.collection}:`, error.message);
        results.push({
          collection: indexDef.collection,
          name: indexDef.options.name,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    // Summary
    const created = results.filter(r => r.status === 'created').length;
    const existing = results.filter(r => r.status === 'already_exists').length;
    const failed = results.filter(r => r.status === 'failed').length;
    
    console.log('\n📊 Index Creation Summary:');
    console.log(`✅ Created: ${created}`);
    console.log(`⚠️  Already existed: ${existing}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed indexes:');
      results
        .filter(r => r.status === 'failed')
        .forEach(r => console.log(`   - ${r.collection}.${r.name}: ${r.error}`));
    }
    
    console.log('\n🎉 Analytics indexes setup completed!');
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed to create analytics indexes:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('✅ MongoDB connection closed');
  }
}

async function validateIndexes() {
  try {
    console.log('\n🔍 Validating indexes...');
    await mongoose.connect(MONGODB_URI);
    const {db} = mongoose.connection;
    
    for (const indexDef of ANALYTICS_INDEXES) {
      const collection = db.collection(indexDef.collection);
      const indexes = await collection.indexes();
      const indexExists = indexes.some(idx => idx.name === indexDef.options.name);
      
      if (indexExists) {
        console.log(`✅ ${indexDef.collection}.${indexDef.options.name} - OK`);
      } else {
        console.log(`❌ ${indexDef.collection}.${indexDef.options.name} - MISSING`);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to validate indexes:', error);
  } finally {
    await mongoose.disconnect();
  }
}

async function runPerformanceTest() {
  try {
    console.log('\n⚡ Running performance tests...');
    await mongoose.connect(MONGODB_URI);
    const {db} = mongoose.connection;
    
    // Test queries that analytics endpoints use
    const testQueries = [
      {
        collection: 'candidates',
        query: {
          organizationId: 'test-org-id',
          'tracking.createdAt': { $gte: new Date('2024-01-01'), $lte: new Date() },
          isDeleted: { $ne: true }
        },
        name: 'candidate_funnel_query'
      },
      {
        collection: 'jobs',
        query: {
          organizationId: 'test-org-id',
          'tracking.createdAt': { $gte: new Date('2024-01-01'), $lte: new Date() },
          isDeleted: { $ne: true }
        },
        name: 'job_performance_query'
      }
    ];
    
    for (const testQuery of testQueries) {
      try {
        const collection = db.collection(testQuery.collection);
        const startTime = Date.now();
        const explainResult = await collection.find(testQuery.query).explain('executionStats');
        const endTime = Date.now();
        
        const stats = explainResult.executionStats;
        const indexUsed = stats.totalKeysExamined > 0;
        
        console.log(`\n📊 Query: ${testQuery.name}`);
        console.log(`   Collection: ${testQuery.collection}`);
        console.log(`   Execution time: ${endTime - startTime}ms`);
        console.log(`   Documents examined: ${stats.totalDocsExamined}`);
        console.log(`   Keys examined: ${stats.totalKeysExamined}`);
        console.log(`   Index used: ${indexUsed ? '✅ Yes' : '❌ No'}`);
        
        if (!indexUsed) {
          console.log(`   ⚠️  Query is not using indexes efficiently!`);
        }
        
      } catch (error) {
        console.log(`❌ Failed to test query ${testQuery.name}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to run performance tests:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'create';
  
  try {
    switch (command) {
      case 'create':
        await createAnalyticsIndexes();
        break;
      case 'validate':
        await validateIndexes();
        break;
      case 'test':
        await runPerformanceTest();
        break;
      case 'all':
        await createAnalyticsIndexes();
        await validateIndexes();
        await runPerformanceTest();
        break;
      default:
        console.log('Usage: node apply-analytics-indexes.mjs [create|validate|test|all]');
        console.log('  create   - Create analytics indexes (default)');
        console.log('  validate - Validate that indexes exist');
        console.log('  test     - Run performance tests');
        console.log('  all      - Run all commands');
        process.exit(1);
    }
    
    console.log('\n✅ Operation completed successfully!');
  } catch (error) {
    console.error('\n❌ Operation failed:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();