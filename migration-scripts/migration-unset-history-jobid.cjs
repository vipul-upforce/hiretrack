/**
 * One-off migration: Remove `jobId` from all History documents.
 * Run after switching history to candidateId-only. Safe to run multiple times.
 *
 * Usage (from project root):
 *   MONGODB_URI="mongodb://..." node migration-scripts/migration-unset-history-jobid.cjs
 * Or with .env:
 *   node -r dotenv/config migration-scripts/migration-unset-history-jobid.cjs
 */
const { MongoClient } = require('mongodb');

const DATABASE_URI =
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/hiretrack-upforce-prod-backup';

async function unsetHistoryJobId() {
  console.log('Migration: Unset jobId from History collection...');
  console.log('URI:', DATABASE_URI.replace(/\/\/[^@]+@/, '//***@'));

  let client;
  try {
    client = new MongoClient(DATABASE_URI);
    await client.connect();
    const db = client.db();

    const collection = db.collection('histories');
    const countBefore = await collection.countDocuments({
      jobId: { $exists: true },
    });
    console.log(`Documents with jobId: ${countBefore}`);

    if (countBefore === 0) {
      console.log('Nothing to update. Done.');
      return;
    }

    const result = await collection.updateMany(
      { jobId: { $exists: true } },
      { $unset: { jobId: 1 } },
    );

    console.log(`Modified: ${result.modifiedCount}`);
    console.log('Migration completed.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

unsetHistoryJobId();
