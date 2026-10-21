#!/usr/bin/env node

/**
 * Simple Database Index Creation Script
 * Uses the existing database connection setup
 */

import connectToDatabase from '../src/lib/mongodb.js';

async function createIndexes() {
  try {
    console.log('🔄 Connecting to database...');
    const connection = await connectToDatabase();
    const {db} = connection.connection;
    
    console.log('✅ Connected to database');
    
    // Essential indexes for analytics performance
    const indexes = [
      {
        collection: 'candidates',
        index: { organizationId: 1, 'tracking.createdAt': 1, isDeleted: 1 },
        name: 'analytics_candidates_org_created_deleted'
      },
      {
        collection: 'candidates', 
        index: { organizationId: 1, status: 1, jobId: 1, isDeleted: 1 },
        name: 'analytics_candidates_org_status_job_deleted'
      },
      {
        collection: 'jobs',
        index: { organizationId: 1, 'tracking.createdAt': 1, isDeleted: 1 },
        name: 'analytics_jobs_org_created_deleted'
      }
    ];
    
    console.log('🔄 Creating analytics indexes...');
    
    let created = 0;
    let existing = 0;
    
    for (const indexDef of indexes) {
      try {
        const collection = db.collection(indexDef.collection);
        
        // Check if index exists
        const existingIndexes = await collection.indexes();
        const indexExists = existingIndexes.some(idx => idx.name === indexDef.name);
        
        if (indexExists) {
          console.log(`⚠️  Index ${indexDef.name} already exists`);
          existing++;
          continue;
        }
        
        // Create index
        await collection.createIndex(indexDef.index, { 
          name: indexDef.name, 
          background: true 
        });
        
        console.log(`✅ Created index ${indexDef.name}`);
        created++;
        
      } catch (error) {
        console.error(`❌ Failed to create ${indexDef.name}:`, error.message);
      }
    }
    
    console.log(`\n📊 Summary: ${created} created, ${existing} existing`);
    console.log('🎉 Analytics indexes setup completed!');
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
  } finally {
    // Close connection
    process.exit(0);
  }
}

createIndexes();