const { MongoClient, ObjectId } = require('mongodb');
const mongoose = require('mongoose'); // Using mongoose for ObjectId only

const DATABASE_URI =
  'mongodb+srv://rm5901960:GIBsjuuMSULwSne9@cluster0.vgmpoc7.mongodb.net/hiretrackk';

async function populateDuplicateCandidates() {
  console.log(
    'Starting migration: Populating duplicate candidates (self-contained Node.js script)...',
  );

  const MONGODB_URI = DATABASE_URI;

  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable is not set.');
    process.exit(1);
  }

  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Database connected successfully.');

    const db = client.db(); // Gets the database specified in the MONGODB_URI

    const candidatesCollection = db.collection('candidates');
    const duplicateCandidatesCollection = db.collection('duplicatecandidates');

    const candidates = await candidatesCollection.find({}).toArray();
    console.log(`Found ${candidates.length} candidates to process.`);

    let processedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    for (const candidate of candidates) {
      if (!candidate.email || !candidate.organizationId) {
        console.warn(
          `Skipping candidate ${candidate._id} due to missing email or organizationId.`,
        );
        continue;
      }

      const query = {
        email: candidate.email.toLowerCase(),
        orgId:
          candidate.organizationId instanceof ObjectId
            ? candidate.organizationId
            : new ObjectId(candidate.organizationId),
      };

      const newDuplicateEntry = {
        candidateId:
          candidate._id instanceof ObjectId
            ? candidate._id
            : new ObjectId(candidate._id),
        jobId: candidate.jobId
          ? candidate.jobId instanceof ObjectId
            ? candidate.jobId
            : new ObjectId(candidate.jobId)
          : null,
      };

      const updateResult = await duplicateCandidatesCollection.updateOne(
        query,
        { $addToSet: { duplicates: newDuplicateEntry } },
        { upsert: true },
      );

      processedCount++;

      if (updateResult.upsertedId) {
        createdCount++;
      } else if (updateResult.modifiedCount > 0) {
        updatedCount++;
      }

      if (processedCount % 100 === 0) {
        console.log(`Processed ${processedCount} candidates...`);
      }
    }

    console.log('Migration completed!');
    console.log(`Total candidates processed: ${processedCount}`);
    console.log(`New DuplicateCandidate documents created: ${createdCount}`);
    console.log(
      `Existing DuplicateCandidate documents updated: ${updatedCount}`,
    );
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('Database connection closed.');
    }
  }
}

populateDuplicateCandidates();
