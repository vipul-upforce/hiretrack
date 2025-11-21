// MongoDB Migration Script for Checklist Feature
// Run this script in MongoDB shell or via Node.js script

// This script creates recommended indexes for the new collections
// and ensures optimal performance for checklist operations

db = db.getSiblingDB('your_database_name'); // Replace with your actual database name

print("Starting migration for Checklist feature...");

// 1. Create indexes for JobLaneConfig collection
print("Creating indexes for JobLaneConfig collection...");
try {
  db.joblaneconfigs.createIndex({ "jobId": 1 }, { unique: true });
  db.joblaneconfigs.createIndex({ "organizationId": 1 });
  db.joblaneconfigs.createIndex({ "updatedAt": -1 });
  print("✓ JobLaneConfig indexes created successfully");
} catch (error) {
  print("⚠️ JobLaneConfig indexes may already exist:", error.message);
}

// 2. Create indexes for ChecklistTemplate collection
print("Creating indexes for ChecklistTemplate collection...");
try {
  db.checklisttemplates.createIndex({ "organizationId": 1, "type": 1 });
  db.checklisttemplates.createIndex({ "organizationId": 1, "isActive": 1 });
  db.checklisttemplates.createIndex({ "createdBy": 1 });
  db.checklisttemplates.createIndex({ "updatedAt": -1 });
  print("✓ ChecklistTemplate indexes created successfully");
} catch (error) {
  print("⚠️ ChecklistTemplate indexes may already exist:", error.message);
}

// 3. Add indexes for existing collections to support checklist queries
print("Adding new indexes to existing collections...");
try {
  // Index for candidate checklist data queries
  db.candidates.createIndex({ "checklistData": 1 }, { sparse: true });
  
  // Index for history checklist form queries
  db.histories.createIndex({ "history.checklistForm.checklistId": 1 }, { sparse: true });
  db.histories.createIndex({ "history.checklistForm.laneId": 1 }, { sparse: true });
  
  print("✓ Additional indexes created successfully");
} catch (error) {
  print("⚠️ Some indexes may already exist:", error.message);
}

// 4. Verify collections and sample data
print("\nVerifying collections...");

const jobLaneConfigCount = db.joblaneconfigs.countDocuments();
const checklistTemplateCount = db.checklisttemplates.countDocuments();
const candidatesWithChecklistData = db.candidates.countDocuments({ "checklistData": { $exists: true } });

print(`📊 Collection Statistics:`);
print(`   - JobLaneConfigs: ${jobLaneConfigCount} documents`);
print(`   - ChecklistTemplates: ${checklistTemplateCount} documents`);
print(`   - Candidates with checklist data: ${candidatesWithChecklistData} documents`);

// 5. Create sample checklist template (optional)
print("\nCreating sample checklist template...");
try {
  const sampleTemplate = {
    organizationId: ObjectId(), // Replace with actual organization ID
    name: "Standard Interview Checklist",
    description: "Basic interview preparation and completion checklist",
    type: "incoming",
    fields: [
      {
        id: "preparation_notes",
        label: "Preparation Notes",
        type: "textarea",
        required: true,
        placeholder: "Add any preparation notes for the interview...",
        order: 0
      },
      {
        id: "documents_verified",
        label: "Documents Verified",
        type: "checkbox",
        required: true,
        order: 1
      },
      {
        id: "interview_type",
        label: "Interview Type",
        type: "select",
        required: true,
        options: ["Technical", "HR", "Managerial", "Cultural Fit"],
        order: 2
      }
    ],
    isActive: true,
    createdBy: ObjectId(), // Replace with actual user ID
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Uncomment the following line to insert sample template
  // db.checklisttemplates.insertOne(sampleTemplate);
  print("✓ Sample template structure ready (commented out - uncomment to insert)");
} catch (error) {
  print("⚠️ Sample template creation skipped:", error.message);
}

print("\n🎉 Migration completed successfully!");
print("\nNext steps:");
print("1. Restart your application to load new models");
print("2. Test checklist functionality");
print("3. Create checklist templates via UI");
print("4. Configure lane checklists for your jobs");

print("\n⚠️  Important Notes:");
print("- All existing data remains intact");
print("- New fields are optional and backwards compatible");
print("- No data loss will occur");
print("- Application restart is required to register new models");