// Node.js script to migrate candidate data and add relevantExperience field
// Run with: node migrate-relevant-experience.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
// require('dotenv').config(); // Load environment variables from .env file

async function migrateRelevantExperience() {
  try {
    // Connect to MongoDB using connection string from environment variables
    const connectionString = "mongodb://vipul:ZgB%214%5E.%24f446vQp@64.227.170.154:27017/hiretrack-1609?authSource=admin"
    await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB database');
    
    // Define a simple candidate schema for migration purposes
    const candidateSchema = new mongoose.Schema({
      name: String,
      email: String,
      experience: Number,
      relevantExperience: Number
      // Other fields are not needed for this migration
    }, { strict: false });
    
    // Create a model using the schema
    const Candidate = mongoose.model('Candidate', candidateSchema);
    
    // Count total candidates
    const totalCandidates = await Candidate.countDocuments({});
    console.log(`Total number of candidate documents: ${totalCandidates}`);
    
    // Count candidates without relevantExperience field
    const candidatesWithoutRelevantExp = await Candidate.countDocuments({ relevantExperience: { $exists: false } });
    console.log(`Candidates without relevantExperience field: ${candidatesWithoutRelevantExp}`);
    
    if (candidatesWithoutRelevantExp === 0) {
      console.log('All candidates already have the relevantExperience field. No migration needed.');
    } else {
      // Update all candidates without the relevantExperience field
      // Set relevantExperience equal to experience for existing records
      const updateResult = await Candidate.updateMany(
        { relevantExperience: { $exists: false } },
        [
          { 
            $set: { 
              relevantExperience: { $ifNull: ["$experience", 0] } 
            } 
          }
        ]
      );
      
      console.log(`Migration completed. Updated ${updateResult.modifiedCount} documents.`);
      
      // Verify that all documents now have the relevantExperience field
      const remainingCandidatesWithoutRelevantExp = await Candidate.countDocuments({ relevantExperience: { $exists: false } });
      console.log(`Remaining candidates without relevantExperience field: ${remainingCandidatesWithoutRelevantExp}`);
    }
    
    // Disconnect from the database
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateRelevantExperience();
