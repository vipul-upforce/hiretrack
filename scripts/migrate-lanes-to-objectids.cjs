#!/usr/bin/env node
/**
 * MongoDB migration: khushbu-test → merges/CEL-devlop (lanes as ObjectIds)
 *
 * Migrates:
 * - Organization.defaultLanes: [String] → [ObjectId] (refs to Lane docs)
 * - Job.lanes: [String] → [ObjectId], useCustomLanes aligned
 * - Candidate.status: String → ObjectId (ref to Lane)
 * - Candidate.status on custom-lane jobs: org-level Lane ObjectId → job-specific Lane ObjectId (Phase 3b)
 * - JobLaneConfig.laneConfigs[].laneId: lane name → Lane _id string
 * - Candidate.checklistData keys: lane name → Lane _id string (optional)
 *
 * Usage:
 *   node scripts/migrate-lanes-to-objectids.cjs
 *
 * Environment:
 *   MONGODB_URI  - MongoDB connection string (e.g. from .env)
 *
 * Idempotent: safe to re-run; finds existing Lane docs by (organizationId, jobId, name).
 */

const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

// Load .env from project root (same as Next.js)
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is required. Set it in .env or the environment.');
  process.exit(1);
}

const DEFAULT_LANES = [
  'applied',
  'screening',
  'shortlisted',
  'processing',
  'accepted',
  'rejected',
];

const SYSTEM_PROTECTED = ['applied', 'accepted', 'rejected'];

const COLLECTIONS = {
  LANES: 'lanes',
  LANES_LEGACY: 'lanes_legacy',
  ORGANIZATIONS: 'organizations',
  JOBS: 'jobs',
  CANDIDATES: 'candidates',
  JOB_LANE_CONFIGS: 'joblaneconfigs',
};

function normalizeLaneName(str) {
  if (typeof str !== 'string') return '';
  return str.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 50);
}

function laneProps(name) {
  const n = normalizeLaneName(name);
  const isProtected = SYSTEM_PROTECTED.includes(n);
  return {
    name: n,
    systemKey: isProtected ? n : null,
    isEditable: !isProtected,
    isDeletable: !isProtected,
  };
}

function isObjectId(v) {
  if (v == null) return false;
  if (v instanceof ObjectId) return true;
  if (typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v)) return true;
  return false;
}

function toObjectId(v) {
  if (v instanceof ObjectId) return v;
  if (typeof v === 'string') return new ObjectId(v);
  return new ObjectId(String(v));
}

/**
 * Returns true if the value looks like the OLD schema (string lane name).
 */
function isStringLaneName(v) {
  if (v == null) return false;
  return typeof v === 'string' && v.length > 0 && !isObjectId(v);
}

/**
 * Returns true if the array is old schema (array of strings).
 */
function isStringArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  return typeof arr[0] === 'string' && !isObjectId(arr[0]);
}

/**
 * Returns true when job.lanes already stores ObjectId references.
 */
function isObjectIdArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  return arr.every((x) => isObjectId(x));
}

/**
 * Resolve a job-specific lane document by normalized lane name.
 */
async function findJobLaneByName(lanesCol, orgId, jobId, jobLaneIds, name) {
  const normalized = normalizeLaneName(name);
  if (!normalized) return null;

  if (Array.isArray(jobLaneIds) && jobLaneIds.length > 0) {
    const docs = await lanesCol
      .find({ _id: { $in: jobLaneIds }, name: normalized })
      .limit(1)
      .toArray();
    if (docs[0]) return docs[0];
  }

  return lanesCol.findOne({
    organizationId: orgId,
    jobId,
    name: normalized,
  });
}

async function run() {
  const client = new MongoClient(MONGODB_URI);
  const report = {
    organizations: { updated: 0, skipped: 0, errors: 0 },
    jobs: { updated: 0, skipped: 0, errors: 0 },
    candidates: { updated: 0, skipped: 0, errors: 0, remappedToJobLane: 0 },
    jobLaneConfigs: { updated: 0, skipped: 0, errors: 0 },
    lanesCreated: 0,
    lanesBackedUp: false,
  };

  try {
    await client.connect();
    const db = client.db();
    const lanesCol = db.collection(COLLECTIONS.LANES);
    const orgsCol = db.collection(COLLECTIONS.ORGANIZATIONS);
    const jobsCol = db.collection(COLLECTIONS.JOBS);
    const candidatesCol = db.collection(COLLECTIONS.CANDIDATES);
    const configsCol = db.collection(COLLECTIONS.JOB_LANE_CONFIGS);

    const now = new Date();

    // ---------- Phase 1: Backup lanes (if old schema) and create org-level lanes ----------
    const existingLanes = await lanesCol.find({}).toArray();
    const hasAnyOldStyle = existingLanes.some(
      (doc) => doc.userId != null && Array.isArray(doc.lanes),
    );
    const hasAnyNewStyle = existingLanes.some(
      (doc) => doc.organizationId != null && doc.name != null,
    );
    // Only backup+clear if collection looks like OLD schema only (no new-format docs).
    const hasOldLaneSchema =
      existingLanes.length > 0 && hasAnyOldStyle && !hasAnyNewStyle;

    if (hasOldLaneSchema && existingLanes.length > 0) {
      console.log('Backing up existing lanes → lanes_legacy...');
      await db.collection(COLLECTIONS.LANES_LEGACY).insertMany(existingLanes);
      await lanesCol.deleteMany({});
      report.lanesBackedUp = true;
      console.log('Backup done. Old lanes collection cleared.');
    }

    // Cache: orgId -> { name -> Lane _id } for org-level lanes
    const orgLaneMap = new Map();

    const orgs = await orgsCol.find({}).toArray();
    for (const org of orgs) {
      try {
        const rawDefault = org.defaultLanes;
        let names = Array.isArray(rawDefault)
          ? rawDefault.map((x) => (typeof x === 'string' ? x : String(x)))
          : [...DEFAULT_LANES];

        // Already migrated?
        if (names.length > 0 && isObjectId(names[0])) {
          report.organizations.skipped++;
          continue;
        }

        names = names.map(normalizeLaneName).filter(Boolean);
        if (names.length === 0) names = [...DEFAULT_LANES];

        const laneIds = [];
        const orgId = org._id;

        for (let order = 0; order < names.length; order++) {
          const name = names[order];
          let lane = await lanesCol.findOne({
            organizationId: orgId,
            jobId: null,
            name,
          });

          if (!lane) {
            const { systemKey, isEditable, isDeletable } = laneProps(name);
            const insertResult = await lanesCol.insertOne({
              organizationId: orgId,
              jobId: null,
              name,
              order,
              isDefault: true,
              isEditable,
              isDeletable,
              systemKey,
              isActive: true,
              createdAt: now,
              updatedAt: now,
            });
            lane = { _id: insertResult.insertedId };
            report.lanesCreated++;
          }
          laneIds.push(lane._id);
        }

        await orgsCol.updateOne(
          { _id: org._id },
          { $set: { defaultLanes: laneIds } },
        );
        orgLaneMap.set(orgId.toString(), Object.fromEntries(names.map((n, i) => [n, laneIds[i]])));
        report.organizations.updated++;
      } catch (err) {
        console.error('Organization migration error:', org._id, err.message);
        report.organizations.errors++;
      }
    }

    console.log('Phase 1 done: organizations and org-level lanes.');

    // ---------- Phase 2: Jobs ----------
    const jobs = await jobsCol.find({}).toArray();
    for (const job of jobs) {
      try {
        const rawLanes = job.lanes;
        const useCustom = job.useCustomLanes === true;
        const hasStringLanes = Array.isArray(rawLanes) && isStringArray(rawLanes);
        const hasObjectIdLanes = isObjectIdArray(rawLanes);

        if (!useCustom) {
          await jobsCol.updateOne(
            { _id: job._id },
            {
              $set: {
                useCustomLanes: false,
                lanes: [],
              },
            },
          );
          report.jobs.updated++;
          continue;
        }

        // Already migrated custom lanes — do not reset job.lanes.
        if (hasObjectIdLanes) {
          report.jobs.skipped++;
          continue;
        }

        if (!hasStringLanes) {
          report.jobs.skipped++;
          continue;
        }

        const names = rawLanes.map((x) => normalizeLaneName(String(x))).filter(Boolean);
        const laneIds = [];
        const orgId = job.organizationId;
        const jobId = job._id;

        for (let order = 0; order < names.length; order++) {
          const name = names[order];
          let lane = await lanesCol.findOne({
            organizationId: orgId,
            jobId,
            name,
          });

          if (!lane) {
            const { systemKey, isEditable, isDeletable } = laneProps(name);
            const insertResult = await lanesCol.insertOne({
              organizationId: orgId,
              jobId,
              name,
              order,
              isDefault: false,
              isEditable,
              isDeletable,
              systemKey,
              isActive: true,
              createdAt: now,
              updatedAt: now,
            });
            lane = { _id: insertResult.insertedId };
            report.lanesCreated++;
          }
          laneIds.push(lane._id);
        }

        await jobsCol.updateOne(
          { _id: job._id },
          { $set: { lanes: laneIds, useCustomLanes: true } },
        );
        report.jobs.updated++;
      } catch (err) {
        console.error('Job migration error:', job._id, err.message);
        report.jobs.errors++;
      }
    }

    console.log('Phase 2 done: jobs.');

    // ---------- Phase 3: Candidates (status string → Lane ObjectId) ----------
    const cursor = candidatesCol.find({});
    while (await cursor.hasNext()) {
      const candidate = await cursor.next();
      try {
        const statusVal = candidate.status;
        if (statusVal == null) {
          report.candidates.skipped++;
          continue;
        }
        if (isObjectId(statusVal)) {
          report.candidates.skipped++;
          continue;
        }

        const statusStr = normalizeLaneName(String(statusVal));
        if (!statusStr) {
          report.candidates.skipped++;
          continue;
        }

        let lane = null;
        const orgId = candidate.organizationId
          ? toObjectId(candidate.organizationId)
          : null;
        const jobId = candidate.jobId ? toObjectId(candidate.jobId) : null;
        let job = null;

        if (jobId) {
          job = await jobsCol.findOne({ _id: jobId });
          if (
            job &&
            job.useCustomLanes &&
            Array.isArray(job.lanes) &&
            job.lanes.length > 0
          ) {
            const laneDocs = await lanesCol
              .find({ _id: { $in: job.lanes }, name: statusStr })
              .limit(1)
              .toArray();
            lane = laneDocs[0] || null;
          }
          // Org-level fallback only for non-custom-lane jobs.
          if (!lane && orgId && !(job && job.useCustomLanes)) {
            lane = await lanesCol.findOne({
              organizationId: orgId,
              jobId: null,
              name: statusStr,
            });
          }
        }
        if (!lane && orgId && !jobId) {
          // For candidates without a job, allow mapping to an org-level lane
          lane = await lanesCol.findOne({
            organizationId: orgId,
            jobId: null,
            name: statusStr,
          });
        }

        if (!lane) {
          // Fallback: create a job-specific lane for this status
          // to avoid data loss for legacy/custom statuses (e.g. "rrrr").
          if (!orgId || !jobId) {
            console.warn(
              'Candidate status lane not found and missing orgId or jobId, skipping:',
              candidate._id,
              'status=',
              statusStr,
            );
            report.candidates.skipped++;
            continue;
          }

          let fallbackLane = await lanesCol.findOne({
            organizationId: orgId,
            jobId,
            name: statusStr,
          });

          if (!fallbackLane) {
            const { systemKey, isEditable, isDeletable } = laneProps(statusStr);
            const order =
              (await lanesCol.countDocuments({
                organizationId: orgId,
                jobId,
              })) || 0;

            const insertResult = await lanesCol.insertOne({
              organizationId: orgId,
              jobId,
              name: statusStr,
              order,
              isDefault: false,
              isEditable,
              isDeletable,
              systemKey,
              isActive: true,
              createdAt: now,
              updatedAt: now,
            });
            fallbackLane = { _id: insertResult.insertedId };
            report.lanesCreated++;
            console.log(
              'Created fallback job-specific lane for legacy status:',
              statusStr,
              'jobId=',
              jobId.toString(),
            );
          }

          lane = fallbackLane;

          // Ensure the job's lanes array includes this new lane
          await jobsCol.updateOne(
            { _id: jobId },
            {
              $addToSet: { lanes: lane._id },
              $set: { useCustomLanes: true },
            },
          );
        }

        await candidatesCol.updateOne(
          { _id: candidate._id },
          { $set: { status: lane._id } },
        );
        report.candidates.updated++;
      } catch (err) {
        console.error('Candidate migration error:', candidate._id, err.message);
        report.candidates.errors++;
      }
    }

    console.log('Phase 3 done: candidates.');

    // ---------- Phase 3b: Remap org-level lane ObjectIds → job-specific lanes ----------
    // Fixes custom-lane jobs where candidate.status points at org lanes (counts work, cards empty).
    const customLaneJobs = await jobsCol
      .find({
        useCustomLanes: true,
        lanes: { $exists: true, $ne: [] },
      })
      .toArray();

    for (const job of customLaneJobs) {
      try {
        const orgId = job.organizationId ? toObjectId(job.organizationId) : null;
        const jobId = job._id;
        const jobLaneIds = (job.lanes || []).map((id) => toObjectId(id));
        if (!orgId || jobLaneIds.length === 0) continue;

        const jobLaneIdSet = new Set(jobLaneIds.map((id) => id.toString()));
        const jobLaneDocs = await lanesCol
          .find({ _id: { $in: jobLaneIds } })
          .toArray();
        const jobLaneByName = new Map(
          jobLaneDocs.map((laneDoc) => [laneDoc.name, laneDoc._id]),
        );

        const jobCandidates = await candidatesCol.find({ jobId }).toArray();
        for (const candidate of jobCandidates) {
          const statusVal = candidate.status;
          if (!isObjectId(statusVal)) continue;

          const statusId = toObjectId(statusVal);
          if (jobLaneIdSet.has(statusId.toString())) continue;

          const currentLane = await lanesCol.findOne({ _id: statusId });
          if (!currentLane?.name) continue;

          let targetLaneId = jobLaneByName.get(currentLane.name);
          if (!targetLaneId) {
            const resolved = await findJobLaneByName(
              lanesCol,
              orgId,
              jobId,
              jobLaneIds,
              currentLane.name,
            );
            if (!resolved?._id) continue;
            targetLaneId = resolved._id;
            jobLaneByName.set(currentLane.name, targetLaneId);
          }

          if (targetLaneId.toString() === statusId.toString()) continue;

          await candidatesCol.updateOne(
            { _id: candidate._id },
            { $set: { status: targetLaneId } },
          );
          report.candidates.remappedToJobLane++;
        }
      } catch (err) {
        console.error('Phase 3b job remap error:', job._id, err.message);
        report.candidates.errors++;
      }
    }

    if (report.candidates.remappedToJobLane > 0) {
      console.log(
        'Phase 3b done: remapped candidates to job lanes:',
        report.candidates.remappedToJobLane,
      );
    } else {
      console.log('Phase 3b done: no candidate status remaps needed.');
    }

    // ---------- Phase 4: JobLaneConfig laneConfigs[].laneId ----------
    const configs = await configsCol.find({}).toArray();
    for (const config of configs) {
      try {
        const laneConfigs = config.laneConfigs;
        if (!Array.isArray(laneConfigs) || laneConfigs.length === 0) {
          report.jobLaneConfigs.skipped++;
          continue;
        }

        const jobId = config.jobId ? toObjectId(config.jobId) : null;
        const orgId = config.organizationId ? toObjectId(config.organizationId) : null;
        if (!jobId || !orgId) {
          report.jobLaneConfigs.skipped++;
          continue;
        }

        const job = await jobsCol.findOne({ _id: jobId });
        let nameToLaneId = new Map();

        const resolveLaneId = async (nameOrId) => {
          if (isObjectId(nameOrId)) return toObjectId(nameOrId);
          const n = normalizeLaneName(String(nameOrId));
          if (nameToLaneId.has(n)) return nameToLaneId.get(n);
          let lane = null;
          if (job && job.useCustomLanes && Array.isArray(job.lanes) && job.lanes.length > 0) {
            const docs = await lanesCol
              .find({ _id: { $in: job.lanes }, name: n })
              .limit(1)
              .toArray();
            lane = docs[0] || null;
          }
          if (!lane && orgId && !(job && job.useCustomLanes)) {
            lane = await lanesCol.findOne({
              organizationId: orgId,
              jobId: null,
              name: n,
            });
          }
          if (lane) nameToLaneId.set(n, lane._id);
          return lane ? lane._id : null;
        };

        let changed = false;
        const updated = [];
        for (const lc of laneConfigs) {
          const currentId = lc.laneId;
          const resolved = await resolveLaneId(currentId);
          if (resolved) {
            updated.push({
              ...lc,
              laneId: resolved.toString(),
              laneName: lc.laneName || (await lanesCol.findOne({ _id: resolved }).then((d) => d?.name)),
            });
            if (String(resolved) !== String(currentId)) changed = true;
          } else {
            updated.push(lc);
          }
        }

        if (changed) {
          await configsCol.updateOne(
            { _id: config._id },
            { $set: { laneConfigs: updated } },
          );
          report.jobLaneConfigs.updated++;
        } else {
          report.jobLaneConfigs.skipped++;
        }
      } catch (err) {
        console.error('JobLaneConfig migration error:', config._id, err.message);
        report.jobLaneConfigs.errors++;
      }
    }

    console.log('Phase 4 done: JobLaneConfig.');

    // ---------- Phase 4b (optional): Candidate checklistData keys ----------
    // If checklistData keys are lane names, remap to Lane _id strings.
    const candCursor2 = candidatesCol.find({
      checklistData: { $exists: true, $type: 'object' },
    });
    let checklistDataUpdated = 0;
    while (await candCursor2.hasNext()) {
      const c = await candCursor2.next();
      const data = c.checklistData;
      if (!data || typeof data !== 'object' || Object.keys(data).length === 0) continue;

      const keys = Object.keys(data);
      const nameToId = new Map();
      const orgId = c.organizationId ? toObjectId(c.organizationId) : null;
      const jobId = c.jobId ? toObjectId(c.jobId) : null;
      let job = null;
      if (jobId) job = await jobsCol.findOne({ _id: jobId });

      const resolveKey = async (key) => {
        if (isObjectId(key)) return toObjectId(key).toString();
        const n = normalizeLaneName(key);
        if (nameToId.has(n)) return nameToId.get(n);
        let lane = null;
        if (job && job.useCustomLanes && Array.isArray(job.lanes) && job.lanes.length > 0) {
          const docs = await lanesCol
            .find({ _id: { $in: job.lanes }, name: n })
            .limit(1)
            .toArray();
          lane = docs[0] || null;
        }
        if (!lane && orgId && !(job && job.useCustomLanes)) {
          lane = await lanesCol.findOne({
            organizationId: orgId,
            jobId: null,
            name: n,
          });
        }
        const id = lane ? lane._id.toString() : null;
        if (id) nameToId.set(n, id);
        return id || key;
      };

      const newData = {};
      let changed = false;
      for (const key of keys) {
        const newKey = await resolveKey(key);
        const value = data[key];
        // Avoid data loss: if two keys map to same newKey (e.g. "Applied" and "applied"), merge.
        if (newKey in newData && value && typeof value === 'object') {
          const existing = newData[newKey];
          if (existing && typeof existing === 'object') {
            newData[newKey] = { ...existing, ...value };
          } else {
            newData[newKey] = value;
          }
        } else {
          newData[newKey] = value;
        }
        if (newKey !== key) changed = true;
      }
      if (changed) {
        await candidatesCol.updateOne(
          { _id: c._id },
          { $set: { checklistData: newData } },
        );
        checklistDataUpdated++;
      }
    }

    if (checklistDataUpdated > 0) {
      console.log('Phase 4b done: checklistData keys updated:', checklistDataUpdated);
    }

    // ---------- Report ----------
    console.log('\n--- Migration report ---');
    console.log('Lanes backup (old collection):', report.lanesBackedUp);
    console.log('Lanes created:', report.lanesCreated);
    console.log('Organizations: updated', report.organizations.updated, 'skipped', report.organizations.skipped, 'errors', report.organizations.errors);
    console.log('Jobs: updated', report.jobs.updated, 'skipped', report.jobs.skipped, 'errors', report.jobs.errors);
    console.log('Candidates: updated', report.candidates.updated, 'remappedToJobLane', report.candidates.remappedToJobLane, 'skipped', report.candidates.skipped, 'errors', report.candidates.errors);
    console.log('JobLaneConfig: updated', report.jobLaneConfigs.updated, 'skipped', report.jobLaneConfigs.skipped, 'errors', report.jobLaneConfigs.errors);
    if (checklistDataUpdated > 0) {
      console.log('ChecklistData keys updated:', checklistDataUpdated);
    }
    console.log('--- Done ---');
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
