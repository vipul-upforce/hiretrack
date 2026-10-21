#!/usr/bin/env node

const path = require('path');

/**
 * Sanitize Emails & Disconnect Communication Integrations
 *
 * Use this script to:
 * 1. Keep existing emails but insert "1" before the TLD so they don't deliver
 *    (e.g. vipul@upforce1.tech → vipul@upforce1.1tech).
 * 2. Clear email config (SMTP, Resend, Brevo) and disconnect communication APIs:
 *    Google Calendar, Zoom, Microsoft Teams (clear tokens and connection state).
 *
 * Uses only MONGODB_URI from your existing .env (no extra env vars). Run from
 * any directory:   node scripts/sanitize-emails-and-disconnect-integrations.cjs
 *
 * Optional: DRY_RUN=1 to log changes without writing.
 */
const projectRoot = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(projectRoot, '.env') });
require('dotenv').config({
  path: path.join(projectRoot, '.env.local'),
  override: true,
});

const mongoose = require('mongoose');

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

/** Return a safe short description of the URI for logging (no credentials). */
function maskUri(uri) {
  if (!uri || typeof uri !== 'string') return '(not set)';
  try {
    const u = new URL(uri.replace(/^mongodb(\+srv)?:/, 'https:'));
    const db =
      u.pathname && u.pathname !== '/'
        ? u.pathname.replace(/^\//, '')
        : '(default)';
    return `${u.hostname}${u.port ? `:${u.port}` : ''}/${db}`;
  } catch {
    return '(invalid uri)';
  }
}

/**
 * Insert "1" before the TLD so the domain no longer delivers (e.g. user@company.com → user@company.1com).
 * Keeps the existing local part and domain shape for readability.
 */
function domainInsert1(email) {
  if (!email || typeof email !== 'string') return email;
  const at = email.indexOf('@');
  if (at === -1) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const lastDot = domain.lastIndexOf('.');
  if (lastDot === -1) return `${local}@${domain}1`;
  const beforeTld = domain.slice(0, lastDot + 1);
  const tld = domain.slice(lastDot + 1);
  return `${local}@${beforeTld}1${tld}`;
}

async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error(
      'MONGODB_URI environment variable is required (check .env and .env.local)',
    );
  }
  console.log(`  Database: ${maskUri(mongoUri)}`);
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');
}

/**
 * Sanitize emails in a collection: keep existing email, insert "1" before TLD (batched).
 */
async function sanitizeCollection(
  db,
  collectionName,
  idField,
  emailField,
  prefix,
) {
  const coll = db.collection(collectionName);
  const cursor = coll.find({ [emailField]: { $exists: true, $ne: '' } });
  let count = 0;
  const batchSize = 500;
  let bulkOps = [];

  for await (const doc of cursor) {
    const current = doc[emailField];
    const newEmail = domainInsert1(current);
    if (current === newEmail) continue;
    bulkOps.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { [emailField]: newEmail } },
      },
    });
    if (bulkOps.length >= batchSize) {
      if (!DRY_RUN) await coll.bulkWrite(bulkOps);
      count += bulkOps.length;
      console.log(`  ${collectionName}: ${count} updated so far`);
      bulkOps = [];
    }
  }

  if (bulkOps.length > 0) {
    if (!DRY_RUN) await coll.bulkWrite(bulkOps);
    count += bulkOps.length;
  }

  return count;
}

/**
 * Sanitize EmailHistory: apply domain-insert-1 to sentByEmail, recipientEmail, cc, bcc, replyTo.
 */
async function sanitizeEmailHistory(db) {
  const coll = db.collection('emailhistories');
  const cursor = coll.find({});
  let count = 0;
  const batchSize = 200;
  let bulkOps = [];

  for await (const doc of cursor) {
    const updates = {};
    if (doc.sentByEmail) updates.sentByEmail = domainInsert1(doc.sentByEmail);
    if (doc.recipientEmail)
      updates.recipientEmail = domainInsert1(doc.recipientEmail);
    if (doc.replyTo) updates.replyTo = domainInsert1(doc.replyTo);
    if (Array.isArray(doc.cc) && doc.cc.length)
      updates.cc = doc.cc.map(domainInsert1);
    if (Array.isArray(doc.bcc) && doc.bcc.length)
      updates.bcc = doc.bcc.map(domainInsert1);

    if (Object.keys(updates).length === 0) continue;

    bulkOps.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: updates },
      },
    });

    if (bulkOps.length >= batchSize) {
      if (!DRY_RUN) await coll.bulkWrite(bulkOps);
      count += bulkOps.length;
      bulkOps = [];
    }
  }

  if (bulkOps.length > 0) {
    if (!DRY_RUN) await coll.bulkWrite(bulkOps);
    count += bulkOps.length;
  }

  return count;
}

/**
 * Disconnect email config and communication APIs for all organizations:
 * - mailConfig (SMTP, Resend, Brevo) cleared so no emails can be sent
 * - Google Calendar, Zoom, Microsoft Teams disconnected
 */
async function disconnectCommunicationIntegrations(db) {
  const coll = db.collection('settings');
  const settings = await coll.find({}).toArray();
  if (!settings.length) {
    console.log('  No settings documents found.');
    return 0;
  }

  const update = {
    $set: {
      'mailConfig.mailProvider': '',
      'mailConfig.smtp_host': '',
      'mailConfig.smtp_port': '',
      'mailConfig.smtp_user': '',
      'mailConfig.smtp_password': '',
      'mailConfig.smtp_from': '',
      'mailConfig.resend_api_key': '',
      'mailConfig.resend_from': '',
      'mailConfig.resend_reply_to': '',
      'mailConfig.brevo_api_key': '',
      'mailConfig.brevo_from': '',
      'mailConfig.brevo_reply_to': '',
      'googleCalendar.isConnected': false,
      'googleCalendar.accessToken': '',
      'googleCalendar.refreshToken': '',
      'googleCalendar.clientId': '',
      'googleCalendar.clientSecret': '',
      'googleCalendar.expiryDate': null,
      'googleCalendar.connectedEmail': '',
      'zoom.isConnected': false,
      'zoom.accessToken': '',
      'zoom.accountId': '',
      'zoom.clientId': '',
      'zoom.clientSecret': '',
      'zoom.expiryDate': null,
      'zoom.connectedEmail': '',
      'microsoftTeams.isConnected': false,
      'microsoftTeams.accessToken': '',
      'microsoftTeams.refreshToken': '',
      'microsoftTeams.tenantId': '',
      'microsoftTeams.clientId': '',
      'microsoftTeams.clientSecret': '',
      'microsoftTeams.expiryDate': null,
      'microsoftTeams.connectedEmail': '',
    },
  };

  if (DRY_RUN) {
    console.log(
      '  [DRY RUN] Would disconnect integrations for',
      settings.length,
      'org(s).',
    );
    return settings.length;
  }

  const result = await coll.updateMany({}, update);
  return result.modifiedCount;
}

async function run() {
  console.log('\n  DRY_RUN =', DRY_RUN);
  if (DRY_RUN) {
    console.log('  ⚠️  NO CHANGES WILL BE WRITTEN TO THE DATABASE\n');
  } else {
    console.log('  ✅ Writing to database.\n');
  }

  await connectToDatabase();
  const { db } = mongoose.connection;

  try {
    // 1. Users
    console.log('📧 Sanitizing users.email...');
    const usersUpdated = await sanitizeCollection(
      db,
      'users',
      '_id',
      'email',
      'user',
    );
    console.log(
      `  users: ${usersUpdated} document(s) ${DRY_RUN ? 'would be ' : ''}updated.\n`,
    );

    // 2. Candidates
    console.log('📧 Sanitizing candidates.email...');
    const candidatesUpdated = await sanitizeCollection(
      db,
      'candidates',
      '_id',
      'email',
      'candidate',
    );
    console.log(
      `  candidates: ${candidatesUpdated} document(s) ${DRY_RUN ? 'would be ' : ''}updated.\n`,
    );

    // 3. Candidate accounts (portal logins)
    console.log('📧 Sanitizing candidateaccounts.email...');
    const candidateAccountsUpdated = await sanitizeCollection(
      db,
      'candidateaccounts',
      '_id',
      'email',
      'candidate-account',
    );
    console.log(
      `  candidateaccounts: ${candidateAccountsUpdated} document(s) ${DRY_RUN ? 'would be ' : ''}updated.\n`,
    );

    // 4. Duplicate candidates (consistency)
    try {
      console.log('📧 Sanitizing duplicatecandidates.email...');
      const dupUpdated = await sanitizeCollection(
        db,
        'duplicatecandidates',
        '_id',
        'email',
        'duplicate',
      );
      console.log(
        `  duplicatecandidates: ${dupUpdated} document(s) ${DRY_RUN ? 'would be ' : ''}updated.\n`,
      );
    } catch (e) {
      console.log(
        '  duplicatecandidates: collection may not exist, skipping.',
        e.message,
        '\n',
      );
    }

    // 5. Email history (same domain-insert-1 transform)
    console.log(
      '📧 Sanitizing emailhistories (sentByEmail, recipientEmail, cc, bcc, replyTo)...',
    );
    const emailHistoryUpdated = await sanitizeEmailHistory(db);
    console.log(
      `  emailhistories: ${emailHistoryUpdated} document(s) ${DRY_RUN ? 'would be ' : ''}updated.\n`,
    );

    // 6. Disconnect email config + communication APIs
    console.log(
      '🔌 Clearing email config (SMTP/Resend/Brevo) and disconnecting Google Calendar, Zoom, Microsoft Teams...',
    );
    const settingsUpdated = await disconnectCommunicationIntegrations(db);
    console.log(
      `  settings: ${settingsUpdated} document(s) ${DRY_RUN ? 'would be ' : ''}updated.\n`,
    );

    console.log('✅ Done.');
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

run().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
