// MongoDB migration script to add relevantExperience field to all candidate documents
// Run this script using the MongoDB shell: mongo your_database_name migration-add-relevant-experience.js

/**
 * This script adds the relevantExperience field to all candidate documents in the database.
 * For existing records, it sets the relevantExperience field equal to the experience field.
 * The relevantExperience field is required, so we need to ensure all documents have it.
 */

// Connect to the candidates collection
const candidatesCollection = db.getCollection('candidates');

// Print the total number of candidate documents
const totalCandidates = candidatesCollection.countDocuments({});
print(`Total number of candidate documents: ${totalCandidates}`);

// Find all candidates that don't have the relevantExperience field
const candidatesWithoutRelevantExp = candidatesCollection.countDocuments({ relevantExperience: { $exists: false } });
print(`Candidates without relevantExperience field: ${candidatesWithoutRelevantExp}`);

// Update all candidates without the relevantExperience field
// Set relevantExperience equal to experience for existing records
const updateResult = candidatesCollection.updateMany(
  { relevantExperience: { $exists: false } },
  [
    { 
      $set: { 
        relevantExperience: { $ifNull: ["$experience", 0] } 
      } 
    }
  ]
);

print(`Migration completed. Updated ${updateResult.modifiedCount} documents.`);

// Verify that all documents now have the relevantExperience field
const remainingCandidatesWithoutRelevantExp = candidatesCollection.countDocuments({ relevantExperience: { $exists: false } });
print(`Remaining candidates without relevantExperience field: ${remainingCandidatesWithoutRelevantExp}`);

// If using Mongoose with Node.js, you would use the following code instead:
/*
const mongoose = require('mongoose');

async function migrateRelevantExperience() {
  try {
    // Connect to your MongoDB database
    await mongoose.connect('mongodb://your_connection_string', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Get the Candidate model
    const Candidate = mongoose.model('Candidate');
    
    // Find all candidates without the relevantExperience field
    const totalCandidates = await Candidate.countDocuments({});
    console.log(`Total number of candidate documents: ${totalCandidates}`);
    
    const candidatesWithoutRelevantExp = await Candidate.countDocuments({ relevantExperience: { $exists: false } });
    console.log(`Candidates without relevantExperience field: ${candidatesWithoutRelevantExp}`);
    
    // Update all candidates without the relevantExperience field
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
    
    // Disconnect from the database
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateRelevantExperience();
*/
