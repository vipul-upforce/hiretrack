#!/usr/bin/env node

const path = require('path');

/**
 * Reconcile CV batch documents: dedupe items[], recompute counts, fix status, clear stale errors.
 *
 * Run from project root:
 *   node scripts/reconcile-cv-batches.cjs
 *
 * Optional:
 *   DRY_RUN=1          — log only, no writes
 *   ORGANIZATION_ID=…  — limit to one org
 *   BATCH_ID=…         — limit to one batch
 */
const projectRoot = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(projectRoot, '.env') });
require('dotenv').config({ path: path.join(projectRoot, '.env.local'), override: true });

const mongoose = require('mongoose');

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const ORGANIZATION_ID = process.env.ORGANIZATION_ID?.trim() || '';
const BATCH_ID = process.env.BATCH_ID?.trim() || '';

const DISPLAY_STATUS_RANK = {
  pending: 1,
  failed: 2,
  failure: 2,
  success: 3,
};

function dedupeItemsByFilename(items) {
  const byFilename = new Map();
  for (const item of items) {
    if (!item?.filename) continue;
    const existing = byFilename.get(item.filename);
    if (!existing) {
      byFilename.set(item.filename, item);
      continue;
    }
    const itemRank = DISPLAY_STATUS_RANK[item.status] ?? 0;
    const existingRank = DISPLAY_STATUS_RANK[existing.status] ?? 0;
    if (itemRank >= existingRank) {
      byFilename.set(item.filename, item);
    }
  }
  return Array.from(byFilename.values());
}

function sanitizeItem(item) {
  const next = { ...item };
  if (next.status === 'success') {
    delete next.error;
    if (!next.message) {
      next.message = 'Successfully processed';
    }
  }
  if (next.status === 'failed') {
    next.candidateId = undefined;
  }
  return next;
}

function syncPendingItemsWithItems(pendingItems, dedupedItems) {
  if (!pendingItems?.length) {
    return pendingItems;
  }
  const byFilename = new Map(dedupedItems.map((item) => [item.filename, item]));
  return pendingItems.map((pending) => {
    const match = byFilename.get(pending.filename);
    if (!match) {
      return pending;
    }
    if (match.status === 'success') {
      return {
        ...pending,
        status: 'processed',
        processedAt: pending.processedAt || match.processedAt || new Date(),
        error: undefined,
      };
    }
    if (match.status === 'failed') {
      return {
        ...pending,
        status: 'failed',
        processedAt: pending.processedAt || match.processedAt || new Date(),
        error: match.error || pending.error,
      };
    }
    return pending;
  });
}

function resolveBatchStatus(batch, dedupedItems, pendingItems) {
  const hasPendingDeferred = (pendingItems || []).some((p) => p.status === 'pending');
  const hasPendingItems = dedupedItems.some((i) => i.status === 'pending');
  if (hasPendingDeferred || hasPendingItems) {
    return 'pending';
  }
  if (batch.status === 'failed') {
    return 'failed';
  }
  return 'completed';
}

function reconcileBatch(doc) {
  const items = Array.isArray(doc.items) ? doc.items : [];
  const deduped = dedupeItemsByFilename(items).map(sanitizeItem);
  const pendingItems = syncPendingItemsWithItems(doc.pendingItems, deduped);

  const successCount = deduped.filter((i) => i.status === 'success').length;
  const failureCount = deduped.filter((i) => i.status === 'failed').length;

  const filenameSet = new Set();
  deduped.forEach((i) => filenameSet.add(i.filename));
  (pendingItems || []).forEach((p) => {
    if (p.filename) filenameSet.add(p.filename);
  });

  const totalFiles = Math.max(
    filenameSet.size,
    deduped.length,
    (pendingItems || []).length,
    doc.totalFiles || 0,
  );

  const status = resolveBatchStatus(doc, deduped, pendingItems);
  const completedAt =
    status === 'completed' || status === 'failed'
      ? doc.completedAt || doc.updatedAt || new Date()
      : undefined;

  const next = {
    items: deduped,
    pendingItems,
    totalFiles,
    successCount,
    failureCount,
    status,
    completedAt,
  };

  const changed =
    items.length !== deduped.length
    || doc.successCount !== successCount
    || doc.failureCount !== failureCount
    || doc.totalFiles !== totalFiles
    || doc.status !== status
    || JSON.stringify(items) !== JSON.stringify(deduped);

  return { next, changed };
}

function maskUri(uri) {
  if (!uri || typeof uri !== 'string') return '(not set)';
  try {
    const u = new URL(uri.replace(/^mongodb(\+srv)?:/, 'https:'));
    const db = u.pathname && u.pathname !== '/' ? u.pathname.replace(/^\//, '') : '(default)';
    return `${u.hostname}${u.port ? ':' + u.port : ''}/${db}`;
  } catch {
    return '(invalid uri)';
  }
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required (.env or .env.local)');
  }

  console.log(`Reconcile CV batches${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log(`  Database: ${maskUri(mongoUri)}`);
  if (ORGANIZATION_ID) console.log(`  Org filter: ${ORGANIZATION_ID}`);
  if (BATCH_ID) console.log(`  Batch filter: ${BATCH_ID}`);

  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  const coll = db.collection('cvbatches');

  const query = {};
  if (ORGANIZATION_ID) {
    query.organizationId = new mongoose.Types.ObjectId(ORGANIZATION_ID);
  }
  if (BATCH_ID) {
    query._id = new mongoose.Types.ObjectId(BATCH_ID);
  }

  let scanned = 0;
  let updated = 0;
  const bulk = [];

  const cursor = coll.find(query);
  for await (const doc of cursor) {
    scanned += 1;
    const { next, changed } = reconcileBatch(doc);
    if (!changed) {
      continue;
    }
    updated += 1;
    console.log(
      `  ${doc._id} status ${doc.status} -> ${next.status} | counts ${doc.successCount}/${doc.failureCount}/${doc.totalFiles} -> ${next.successCount}/${next.failureCount}/${next.totalFiles} | items ${doc.items?.length ?? 0} -> ${next.items.length}`,
    );
    if (!DRY_RUN) {
      bulk.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: next },
        },
      });
    }
    if (bulk.length >= 200) {
      await coll.bulkWrite(bulk);
      bulk.length = 0;
    }
  }

  if (!DRY_RUN && bulk.length > 0) {
    await coll.bulkWrite(bulk);
  }

  await mongoose.disconnect();
  console.log(`Done. Scanned ${scanned}, ${DRY_RUN ? 'would update' : 'updated'} ${updated}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
