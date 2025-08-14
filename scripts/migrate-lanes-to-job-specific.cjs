#!/usr/bin/env node

/**
 * Migration Script: Convert Organization Lanes to Job-Specific Lanes
 * 
 * This script safely migrates the existing global lanes system to job-specific lanes:
 * 1. Renames organization.lanes to organization.defaultLanes
 * 2. Adds laneRestrictions to organizations
 * 3. Initializes job.lanes and job.useCustomLanes fields
 * 4. Validates candidate statuses against job lanes
 * 
 * Run with: node scripts/migrate-lanes-to-job-specific.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Default lanes for fallback
const DEFAULT_LANES = [
  "applied",
  "screening", 
  "shortlisted",
  "processing",
  "accepted",
  "rejected"
];

const DEFAULT_RESTRICTIONS = {
  nonEditable: ["applied", "accepted", "rejected"],
  nonDeletable: ["applied", "accepted", "rejected"]
};

async function connectToDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

async function backupData() {
  console.log('\n📦 Starting data backup...');
  
  try {
    // Create backup collections
    const db = mongoose.connection.db;
    
    // Backup organizations
    const organizations = await db.collection('organizations').find({}).toArray();
    await db.collection('organizations_backup_lanes_migration').insertMany(organizations);
    console.log(`✅ Backed up ${organizations.length} organizations`);
    
    // Backup jobs
    const jobs = await db.collection('jobs').find({}).toArray();
    if (jobs.length > 0) {
      await db.collection('jobs_backup_lanes_migration').insertMany(jobs);
      console.log(`✅ Backed up ${jobs.length} jobs`);
    }
    
    // Backup candidates
    const candidates = await db.collection('candidates').find({}).toArray();
    if (candidates.length > 0) {
      await db.collection('candidates_backup_lanes_migration').insertMany(candidates);
      console.log(`✅ Backed up ${candidates.length} candidates`);
    }
    
    console.log('✅ Backup completed successfully');
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

async function migrateOrganizations() {
  console.log('\n🏢 Migrating organizations...');
  
  try {
    const db = mongoose.connection.db;
    const organizations = await db.collection('organizations').find({}).toArray();
    
    for (const org of organizations) {
      const updateData = {};
      
      // Migrate lanes to defaultLanes
      if (org.lanes) {
        updateData.defaultLanes = org.lanes;
        // Remove old lanes field will be done after successful migration
      } else {
        updateData.defaultLanes = DEFAULT_LANES;
      }
      
      // Add lane restrictions if not present
      if (!org.laneRestrictions) {
        updateData.laneRestrictions = DEFAULT_RESTRICTIONS;
      }
      
      await db.collection('organizations').updateOne(
        { _id: org._id },
        { $set: updateData }
      );
      
      console.log(`✅ Migrated organization: ${org.name}`);
    }
    
    console.log(`✅ Successfully migrated ${organizations.length} organizations`);
  } catch (error) {
    console.error('❌ Organization migration failed:', error);
    throw error;
  }
}

async function migrateJobs() {
  console.log('\n💼 Migrating jobs...');
  
  try {
    const db = mongoose.connection.db;
    const jobs = await db.collection('jobs').find({}).toArray();
    
    if (jobs.length === 0) {
      console.log('ℹ️ No jobs found to migrate');
      return;
    }
    
    for (const job of jobs) {
      const updateData = {};
      
      // Set default lanes from organization if not present
      if (!job.lanes) {
        // Get organization default lanes
        const org = await db.collection('organizations').findOne({ _id: job.organizationId });
        updateData.lanes = org?.defaultLanes || DEFAULT_LANES;
      }
      
      // Set useCustomLanes to false initially (use defaults)
      if (job.useCustomLanes === undefined) {
        updateData.useCustomLanes = false;
      }
      
      if (Object.keys(updateData).length > 0) {
        await db.collection('jobs').updateOne(
          { _id: job._id },
          { $set: updateData }
        );
      }
      
      console.log(`✅ Migrated job: ${job.title}`);
    }
    
    console.log(`✅ Successfully migrated ${jobs.length} jobs`);
  } catch (error) {
    console.error('❌ Job migration failed:', error);
    throw error;
  }
}

async function validateCandidates() {
  console.log('\n👥 Validating candidates...');
  
  try {
    const db = mongoose.connection.db;
    const candidates = await db.collection('candidates').find({}).toArray();
    
    if (candidates.length === 0) {
      console.log('ℹ️ No candidates found to validate');
      return;
    }
    
    let validationIssues = 0;
    const issueDetails = [];
    
    for (const candidate of candidates) {
      if (!candidate.status || !candidate.jobId) continue;
      
      // Get job lanes
      const job = await db.collection('jobs').findOne({ _id: candidate.jobId });
      if (!job) continue;
      
      let validLanes;
      if (job.useCustomLanes && job.lanes) {
        validLanes = job.lanes;
      } else {
        const org = await db.collection('organizations').findOne({ _id: job.organizationId });
        validLanes = org?.defaultLanes || DEFAULT_LANES;
      }
      
      if (!validLanes.includes(candidate.status)) {
        validationIssues++;
        issueDetails.push({
          candidateId: candidate._id,
          candidateName: candidate.name,
          jobTitle: job.title,
          currentStatus: candidate.status,
          validLanes: validLanes
        });
        
        // Auto-fix by setting to 'applied' if invalid
        await db.collection('candidates').updateOne(
          { _id: candidate._id },
          { $set: { status: 'applied' } }
        );
        
        console.log(`⚠️ Fixed candidate ${candidate.name}: ${candidate.status} → applied`);
      }
    }
    
    if (validationIssues > 0) {
      console.log(`⚠️ Fixed ${validationIssues} candidate status issues`);
      console.log('Details saved to migration-issues.json');
      
      // Save issue details for review
      const fs = require('fs');
      fs.writeFileSync('migration-issues.json', JSON.stringify(issueDetails, null, 2));
    } else {
      console.log('✅ All candidate statuses are valid');
    }
    
  } catch (error) {
    console.error('❌ Candidate validation failed:', error);
    throw error;
  }
}

async function cleanupOldFields() {
  console.log('\n🧹 Cleaning up old fields...');
  
  try {
    const db = mongoose.connection.db;
    
    // Remove old 'lanes' field from organizations (now using 'defaultLanes')
    const result = await db.collection('organizations').updateMany(
      { lanes: { $exists: true } },
      { $unset: { lanes: 1 } }
    );
    
    console.log(`✅ Removed old 'lanes' field from ${result.modifiedCount} organizations`);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

async function runMigration() {
  console.log('🚀 Starting Lanes to Job-Specific Migration');
  console.log('=============================================');
  
  try {
    await connectToDatabase();
    
    // Step 1: Backup existing data
    await backupData();
    
    // Step 2: Migrate organizations
    await migrateOrganizations();
    
    // Step 3: Migrate jobs
    await migrateJobs();
    
    // Step 4: Validate and fix candidates
    await validateCandidates();
    
    // Step 5: Cleanup old fields
    await cleanupOldFields();
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('=============================================');
    console.log('✅ Organizations: lanes → defaultLanes + laneRestrictions');
    console.log('✅ Jobs: Added lanes and useCustomLanes fields');
    console.log('✅ Candidates: Validated status against job lanes');
    console.log('✅ Backup collections created for rollback');
    console.log('\nNext steps:');
    console.log('1. Test the application thoroughly');
    console.log('2. Remove backup collections after confirming migration success');
    console.log('3. Deploy updated application code');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.log('\n🔄 Rollback instructions:');
    console.log('1. Restore from backup collections if needed');
    console.log('2. Check migration-issues.json for details');
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };