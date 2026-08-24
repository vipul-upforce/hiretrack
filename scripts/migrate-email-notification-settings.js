/**
 * Migration script to add email notification settings to existing users and organizations
 * Run with: node scripts/migrate-email-notification-settings.js
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hiretrack';

const defaultEmailNotificationSettings = {
  global: {
    newApplications: true,
    interviewAssignments: true,
    statusUpdates: true,
    newRemarks: true,
    stepCompleted: true,
    mentions: true,
  },
  jobLevel: new Map(),
};

const defaultOrganizationEmailNotifications = {
  defaultSettings: {
    newApplications: true,
    interviewAssignments: true,
    statusUpdates: true,
    newRemarks: true,
    stepCompleted: true,
    mentions: true,
  },
  adminOverrides: new Map(),
};

async function migrateEmailNotificationSettings() {
  console.log('🚀 Starting email notification settings migration...');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const usersCollection = db.collection('users');
    const settingsCollection = db.collection('settings');

    // Step 1: Migrate user email notification settings
    console.log('\n📧 Migrating user email notification settings...');

    // Find users without email notification settings (eligible roles only)
    const usersWithoutSettings = await usersCollection.find({
      role: { $in: ['admin', 'hr', 'interviewer'] },
      emailNotificationSettings: { $exists: false },
      isDeleted: { $ne: true }
    }).toArray();

    console.log(`Found ${usersWithoutSettings.length} users without email notification settings`);

    if (usersWithoutSettings.length > 0) {
      // Add default settings to users
      const userBulkOps = usersWithoutSettings.map(user => ({
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: {
              emailNotificationSettings: defaultEmailNotificationSettings
            }
          }
        }
      }));

      const userResult = await usersCollection.bulkWrite(userBulkOps);
      console.log(`✅ Updated ${userResult.modifiedCount} users with default email notification settings`);
    }

    // Step 2: Migrate organization email notification settings
    console.log('\n🏢 Migrating organization email notification settings...');

    // Find organizations without email notification settings
    const orgsWithoutSettings = await settingsCollection.find({
      organizationEmailNotifications: { $exists: false }
    }).toArray();

    console.log(`Found ${orgsWithoutSettings.length} organizations without email notification settings`);

    if (orgsWithoutSettings.length > 0) {
      // Add default settings to organizations
      const orgBulkOps = orgsWithoutSettings.map(org => ({
        updateOne: {
          filter: { _id: org._id },
          update: {
            $set: {
              organizationEmailNotifications: defaultOrganizationEmailNotifications
            }
          }
        }
      }));

      const orgResult = await settingsCollection.bulkWrite(orgBulkOps);
      console.log(`✅ Updated ${orgResult.modifiedCount} organizations with default email notification settings`);
    }

    // Step 3: Verify migration results
    console.log('\n🔍 Verifying migration results...');

    const totalUsersWithSettings = await usersCollection.countDocuments({
      role: { $in: ['admin', 'hr', 'interviewer'] },
      emailNotificationSettings: { $exists: true },
      isDeleted: { $ne: true }
    });

    const totalOrgsWithSettings = await settingsCollection.countDocuments({
      organizationEmailNotifications: { $exists: true }
    });

    console.log(`✅ Total users with email notification settings: ${totalUsersWithSettings}`);
    console.log(`✅ Total organizations with email notification settings: ${totalOrgsWithSettings}`);

    // Step 4: Create indexes for better performance
    console.log('\n📊 Creating indexes for email notification queries...');

    try {
      // Index for email decision queries
      await usersCollection.createIndex(
        {
          organizationId: 1,
          role: 1,
          'emailNotificationSettings.global': 1
        },
        {
          name: 'email_notifications_query_idx',
          background: true
        }
      );

      // Index for job-level settings queries
      await usersCollection.createIndex(
        {
          _id: 1,
          'emailNotificationSettings.jobLevel': 1
        },
        {
          name: 'job_level_notifications_idx',
          background: true
        }
      );

      console.log('✅ Created indexes for email notification queries');
    } catch (indexError) {
      console.log('⚠️ Index creation failed (may already exist):', indexError.message);
    }

    // Step 5: Statistics and summary
    console.log('\n📈 Migration Summary:');
    console.log('='.repeat(50));

    const stats = await generateMigrationStats(db);
    console.log(stats);

    console.log('\n🎉 Email notification settings migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

async function generateMigrationStats(db) {
  const usersCollection = db.collection('users');
  const settingsCollection = db.collection('settings');

  // User statistics
  const totalUsers = await usersCollection.countDocuments({
    role: { $in: ['admin', 'hr', 'interviewer'] },
    isDeleted: { $ne: true }
  });

  const usersWithSettings = await usersCollection.countDocuments({
    role: { $in: ['admin', 'hr', 'interviewer'] },
    emailNotificationSettings: { $exists: true },
    isDeleted: { $ne: true }
  });

  const usersWithJobSettings = await usersCollection.countDocuments({
    role: { $in: ['admin', 'hr', 'interviewer'] },
    'emailNotificationSettings.jobLevel': { $exists: true, $ne: {} },
    isDeleted: { $ne: true }
  });

  // Organization statistics
  const totalOrgs = await settingsCollection.countDocuments({});
  const orgsWithSettings = await settingsCollection.countDocuments({
    organizationEmailNotifications: { $exists: true }
  });

  const orgsWithOverrides = await settingsCollection.countDocuments({
    'organizationEmailNotifications.adminOverrides': { $exists: true, $ne: {} }
  });

  return `
📊 User Statistics:
   • Total eligible users: ${totalUsers}
   • Users with notification settings: ${usersWithSettings} (${Math.round(usersWithSettings/totalUsers*100)}%)
   • Users with job-level settings: ${usersWithJobSettings}

🏢 Organization Statistics:
   • Total organizations: ${totalOrgs}
   • Organizations with notification settings: ${orgsWithSettings} (${Math.round(orgsWithSettings/totalOrgs*100)}%)
   • Organizations with admin overrides: ${orgsWithOverrides}

🎯 Migration Coverage:
   • User settings coverage: ${usersWithSettings === totalUsers ? '✅ Complete' : '⚠️ Partial'}
   • Organization settings coverage: ${orgsWithSettings === totalOrgs ? '✅ Complete' : '⚠️ Partial'}
`;
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateEmailNotificationSettings()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default migrateEmailNotificationSettings;