const { MongoClient, ObjectId } = require('mongodb');

const DATABASE_URI = 'mongodb://localhost:27017/hiretrack-prod-9Mar1';

async function populateDuplicateCandidates() {
  console.log('Starting migration: Populating unique candidates...');

  let client;
  try {
    client = new MongoClient(DATABASE_URI);
    await client.connect();
    const db = client.db();

    const candidatesCollection = db.collection('candidates');
    const duplicateCandidatesCollection = db.collection('duplicatecandidates');

    const candidates = await candidatesCollection.find({}).toArray();
    console.log(`Found ${candidates.length} candidates to process.`);

    let processedCount = 0;

    for (const candidate of candidates) {
      if (!candidate.email || !candidate.organizationId) continue;

      const email = candidate.email.toLowerCase();
      const orgId = new ObjectId(candidate.organizationId);
      const candidateId = new ObjectId(candidate._id);
      const jobId = candidate.jobId ? new ObjectId(candidate.jobId) : null;

      // 1. Try to add the candidate ONLY if the candidateId isn't already in the duplicates array
      const result = await duplicateCandidatesCollection.updateOne(
        {
          email: email,
          orgId: orgId,
          'duplicates.candidateId': { $ne: candidateId }, // Key Fix: Prevent internal duplicates
        },
        {
          $push: {
            duplicates: { candidateId, jobId },
          },
        },
      );

      // 2. If nothing was matched (either doc doesn't exist OR candidateId is already there)
      // we check if the document exists at all. If not, we upsert it.
      if (result.matchedCount === 0) {
        const docExists = await duplicateCandidatesCollection.findOne({
          email,
          orgId,
        });

        if (!docExists) {
          await duplicateCandidatesCollection.updateOne(
            { email, orgId },
            { $setOnInsert: { duplicates: [{ candidateId, jobId }] } },
            { upsert: true },
          );
        }
      }

      processedCount++;
      if (processedCount % 100 === 0)
        console.log(`Processed ${processedCount}...`);
    }

    console.log('Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (client) await client.close();
  }
}

populateDuplicateCandidates();
