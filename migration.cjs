/* eslint-disable no-console */
require('dotenv').config({ path: '.env.local' });

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is missing in environment variables.');
  process.exit(1);
}

const DEFAULT_LANE_NAMES = [
  'applied',
  'screening',
  'shortlisted',
  'processing',
  'accepted',
  'rejected',
];

const SYSTEM_PROTECTED_LANES = new Set(['applied', 'accepted', 'rejected']);

const DEFAULT_LANE_COLORS = {
  applied: '#3B82F6',
  screening: '#8B5CF6',
  shortlisted: '#06B6D4',
  processing: '#F59E0B',
  accepted: '#22C55E',
  rejected: '#EF4444',
};

function normalizeLaneName(name) {
  if (typeof name !== 'string') {
    return '';
  }
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}

function uniqueNames(names) {
  const output = [];
  const seen = new Set();

  for (const name of names) {
    const normalized = normalizeLaneName(name);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

function buildLaneDoc({
  organizationId,
  jobId = null,
  laneName,
  order,
  isDefault = false,
  createdBy,
}) {
  const systemKey = SYSTEM_PROTECTED_LANES.has(laneName) ? laneName : null;
  const isRestricted = Boolean(systemKey);

  return {
    organizationId,
    jobId,
    name: laneName,
    systemKey,
    color: DEFAULT_LANE_COLORS[laneName],
    order,
    isDefault,
    isEditable: !isRestricted,
    isDeletable: !isRestricted,
    isActive: true,
    metadata: {},
    ...(createdBy ? { createdBy } : {}),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function createIndexSafely(lanesCollection, key, options) {
  try {
    await lanesCollection.createIndex(key, options);
  } catch (error) {
    if (
      error &&
      (error.code === 85 ||
        error.codeName === 'IndexOptionsConflict' ||
        error.code === 67 ||
        error.codeName === 'CannotCreateIndex')
    ) {
      console.warn(
        `Skipping index creation due to DB index compatibility/conflict: ${JSON.stringify(key)} (${error.codeName || error.code})`,
      );
      return;
    }
    throw error;
  }
}

async function ensureIndexes(lanesCollection) {
  await createIndexSafely(
    lanesCollection,
    { organizationId: 1, name: 1 },
    {
      unique: true,
      partialFilterExpression: { jobId: null },
      name: 'org_name_unique_job_null',
      background: true,
    },
  );

  await createIndexSafely(
    lanesCollection,
    { organizationId: 1, jobId: 1, name: 1 },
    {
      unique: true,
      partialFilterExpression: { jobId: { $ne: null } },
      name: 'org_job_name_unique_job_specific',
      background: true,
    },
  );

  await createIndexSafely(
    lanesCollection,
    { organizationId: 1, isActive: 1, order: 1 },
    { partialFilterExpression: { jobId: null }, background: true },
  );

  await createIndexSafely(
    lanesCollection,
    { jobId: 1, isActive: 1, order: 1 },
    { partialFilterExpression: { jobId: { $ne: null } }, background: true },
  );
}

async function getOrCreateOrgLane({
  lanesCollection,
  organizationId,
  laneName,
  order,
  createdBy,
}) {
  const normalizedName = normalizeLaneName(laneName);
  let laneDoc = await lanesCollection.findOne({
    organizationId,
    jobId: null,
    name: normalizedName,
  });

  if (laneDoc) {
    return laneDoc;
  }

  const doc = buildLaneDoc({
    organizationId,
    jobId: null,
    laneName: normalizedName,
    order,
    isDefault: true,
    createdBy,
  });

  try {
    const result = await lanesCollection.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  } catch (error) {
    if (error && error.code === 11000) {
      laneDoc = await lanesCollection.findOne({
        organizationId,
        jobId: null,
        name: normalizedName,
      });
      if (laneDoc) {
        return laneDoc;
      }
    }
    throw error;
  }
}

async function getOrCreateJobLane({
  lanesCollection,
  organizationId,
  jobId,
  laneName,
  order,
  createdBy,
}) {
  const normalizedName = normalizeLaneName(laneName);
  let laneDoc = await lanesCollection.findOne({
    organizationId,
    jobId,
    name: normalizedName,
  });

  if (laneDoc) {
    return laneDoc;
  }

  const orgTemplate = await lanesCollection.findOne({
    organizationId,
    jobId: null,
    name: normalizedName,
  });

  const doc = {
    ...buildLaneDoc({
      organizationId,
      jobId,
      laneName: normalizedName,
      order,
      isDefault: false,
      createdBy,
    }),
    description: orgTemplate?.description,
    color: orgTemplate?.color ?? DEFAULT_LANE_COLORS[normalizedName],
    isEditable:
      typeof orgTemplate?.isEditable === 'boolean'
        ? orgTemplate.isEditable
        : !SYSTEM_PROTECTED_LANES.has(normalizedName),
    isDeletable:
      typeof orgTemplate?.isDeletable === 'boolean'
        ? orgTemplate.isDeletable
        : !SYSTEM_PROTECTED_LANES.has(normalizedName),
    systemKey:
      orgTemplate?.systemKey ??
      (SYSTEM_PROTECTED_LANES.has(normalizedName) ? normalizedName : null),
  };

  try {
    const result = await lanesCollection.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  } catch (error) {
    if (error && error.code === 11000) {
      laneDoc = await lanesCollection.findOne({
        organizationId,
        jobId,
        name: normalizedName,
      });
      if (laneDoc) {
        return laneDoc;
      }
    }
    throw error;
  }
}

async function backupAndRemoveLegacyLaneDocs(db) {
  const lanesCollection = db.collection('lanes');
  const backupCollection = db.collection('lanes_legacy_backup');

  const legacyDocs = await lanesCollection.find({ lanes: { $exists: true } }).toArray();
  if (legacyDocs.length === 0) {
    return 0;
  }

  const alreadyBackedUpCount = await backupCollection.countDocuments();
  if (alreadyBackedUpCount === 0) {
    await backupCollection.insertMany(
      legacyDocs.map((doc) => ({ ...doc, backedUpAt: new Date() })),
      { ordered: false },
    );
  }

  const legacyIds = legacyDocs.map((doc) => doc._id).filter(Boolean);
  if (legacyIds.length > 0) {
    await lanesCollection.deleteMany({ _id: { $in: legacyIds } });
  }

  return legacyDocs.length;
}

async function migrateOrganizations({ organizationsCollection, lanesCollection }) {
  const organizations = await organizationsCollection.find({}).toArray();
  const orgLaneMaps = new Map();
  let migratedOrganizations = 0;

  for (const org of organizations) {
    const organizationId = org._id;
    const rawDefaultLanes = Array.isArray(org.defaultLanes) ? org.defaultLanes : [];
    const laneNamesFromDefaults = rawDefaultLanes.filter((lane) => typeof lane === 'string');
    const laneNamesFromCards = Array.isArray(org.openJobCards)
      ? org.openJobCards.filter((lane) => typeof lane === 'string')
      : [];

    const chosenLaneNames = uniqueNames([
      ...laneNamesFromDefaults,
      ...laneNamesFromCards,
      ...DEFAULT_LANE_NAMES,
    ]);

    const laneDocs = [];
    for (let index = 0; index < chosenLaneNames.length; index += 1) {
      const laneName = chosenLaneNames[index];
      // eslint-disable-next-line no-await-in-loop
      const laneDoc = await getOrCreateOrgLane({
        lanesCollection,
        organizationId,
        laneName,
        order: index,
        createdBy: org.adminId,
      });
      laneDocs.push(laneDoc);
    }

    const laneIds = laneDocs.map((lane) => lane._id);
    const laneMap = new Map(laneDocs.map((lane) => [lane.name, lane._id]));
    orgLaneMaps.set(organizationId.toString(), laneMap);

    const needsUpdate =
      !Array.isArray(org.defaultLanes) ||
      org.defaultLanes.some((lane) => !(lane instanceof ObjectId)) ||
      org.defaultLanes.length !== laneIds.length ||
      org.defaultLanes.some((laneId, idx) => laneId?.toString() !== laneIds[idx]?.toString());

    if (needsUpdate) {
      // eslint-disable-next-line no-await-in-loop
      await organizationsCollection.updateOne(
        { _id: organizationId },
        {
          $set: {
            defaultLanes: laneIds,
            updatedAt: new Date(),
          },
        },
      );
      migratedOrganizations += 1;
    }
  }

  return { orgLaneMaps, migratedOrganizations, totalOrganizations: organizations.length };
}

async function migrateJobs({ jobsCollection, lanesCollection, orgLaneMaps }) {
  const jobs = await jobsCollection.find({}).toArray();
  const jobLaneMaps = new Map();
  let migratedJobs = 0;

  for (const job of jobs) {
    const jobId = job._id;
    const organizationId = job.organizationId;
    if (!organizationId) {
      continue;
    }

    const oldLaneNames = Array.isArray(job.lanes)
      ? job.lanes.filter((lane) => typeof lane === 'string')
      : [];
    const hasCustomStringLanes = oldLaneNames.length > 0;

    if (!hasCustomStringLanes) {
      const laneMap = orgLaneMaps.get(organizationId.toString()) || new Map();
      jobLaneMaps.set(jobId.toString(), laneMap);
      continue;
    }

    const normalized = uniqueNames(oldLaneNames);
    const laneDocs = [];

    for (let index = 0; index < normalized.length; index += 1) {
      const laneName = normalized[index];
      // eslint-disable-next-line no-await-in-loop
      const laneDoc = await getOrCreateJobLane({
        lanesCollection,
        organizationId,
        jobId,
        laneName,
        order: index,
        createdBy: job.createdBy,
      });
      laneDocs.push(laneDoc);
    }

    const laneIds = laneDocs.map((lane) => lane._id);
    const laneMap = new Map(laneDocs.map((lane) => [lane.name, lane._id]));
    jobLaneMaps.set(jobId.toString(), laneMap);

    // eslint-disable-next-line no-await-in-loop
    await jobsCollection.updateOne(
      { _id: jobId },
      {
        $set: {
          lanes: laneIds,
          useCustomLanes: true,
          updatedAt: new Date(),
        },
      },
    );
    migratedJobs += 1;
  }

  return { jobLaneMaps, migratedJobs, totalJobs: jobs.length };
}

async function migrateCandidates({
  candidatesCollection,
  jobsCollection,
  orgLaneMaps,
  jobLaneMaps,
}) {
  const candidates = await candidatesCollection.find({}).toArray();
  let migratedCandidates = 0;
  let unresolvedStatuses = 0;

  for (const candidate of candidates) {
    if (typeof candidate.status !== 'string') {
      continue;
    }

    const candidateId = candidate._id;
    const normalizedStatus = normalizeLaneName(candidate.status);
    if (!normalizedStatus) {
      continue;
    }

    let laneId = null;

    if (candidate.jobId) {
      const jobLaneMap = jobLaneMaps.get(candidate.jobId.toString());
      if (jobLaneMap?.has(normalizedStatus)) {
        laneId = jobLaneMap.get(normalizedStatus);
      } else {
        // eslint-disable-next-line no-await-in-loop
        const job = await jobsCollection.findOne(
          { _id: candidate.jobId },
          { projection: { organizationId: 1 } },
        );
        const orgId = job?.organizationId || candidate.organizationId;
        if (orgId) {
          const orgLaneMap = orgLaneMaps.get(orgId.toString());
          laneId = orgLaneMap?.get(normalizedStatus) || null;
        }
      }
    } else if (candidate.organizationId) {
      const orgLaneMap = orgLaneMaps.get(candidate.organizationId.toString());
      laneId = orgLaneMap?.get(normalizedStatus) || null;
    }

    if (!laneId) {
      unresolvedStatuses += 1;
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    await candidatesCollection.updateOne(
      { _id: candidateId },
      {
        $set: {
          status: laneId,
          updatedAt: new Date(),
        },
      },
    );
    migratedCandidates += 1;
  }

  return { migratedCandidates, unresolvedStatuses, totalCandidates: candidates.length };
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  try {
    const db = client.db();
    const organizationsCollection = db.collection('organizations');
    const jobsCollection = db.collection('jobs');
    const candidatesCollection = db.collection('candidates');
    const lanesCollection = db.collection('lanes');

    console.log('Starting migration...');

    const removedLegacyCount = await backupAndRemoveLegacyLaneDocs(db);
    console.log(`Legacy lane docs backed up and removed: ${removedLegacyCount}`);

    const orgResult = await migrateOrganizations({
      organizationsCollection,
      lanesCollection,
    });
    console.log(
      `Organizations migrated: ${orgResult.migratedOrganizations}/${orgResult.totalOrganizations}`,
    );

    const jobResult = await migrateJobs({
      jobsCollection,
      lanesCollection,
      orgLaneMaps: orgResult.orgLaneMaps,
    });
    console.log(`Jobs migrated: ${jobResult.migratedJobs}/${jobResult.totalJobs}`);

    const candidateResult = await migrateCandidates({
      candidatesCollection,
      jobsCollection,
      orgLaneMaps: orgResult.orgLaneMaps,
      jobLaneMaps: jobResult.jobLaneMaps,
    });
    console.log(
      `Candidates migrated: ${candidateResult.migratedCandidates}/${candidateResult.totalCandidates}`,
    );
    console.log(`Candidates with unresolved status mapping: ${candidateResult.unresolvedStatuses}`);

    await ensureIndexes(lanesCollection);
    console.log('Lane indexes ensured.');

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();
