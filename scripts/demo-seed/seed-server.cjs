#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Demo server DB seed — run on an installed Hiretrack host only.
 *
 * Layout (matches installer.sh):
 *   ~/.hiretrack/config.json
 *   ~/.hiretrack/APP/.env
 *   ~/.hiretrack/APP/node_modules/
 *   ~/.hiretrack/demo-seed/
 *     seed-server.cjs              ← this file
 *     generate-demo-database.cjs   ← copy from repo scripts/ (same folder)
 *     applicant-resume.pdf         ← optional; auto-detected in this folder
 *
 * Usage:
 *   cd ~/.hiretrack/APP
 *   export NODE_PATH="$PWD/node_modules"
 *   node ../demo-seed/seed-server.cjs --dry-run
 *   node ../demo-seed/seed-server.cjs --force
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const DEMO_SEED_DIR = __dirname;

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function readJson(jsonPath) {
  if (!fs.existsSync(jsonPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch {
    return null;
  }
}

function parseDbName(uri) {
  if (!uri) return 'hiretrack';
  const m = uri.match(/\/([^/?]+)(?:\?|$)/);
  return m?.[1] ? decodeURIComponent(m[1]) : 'hiretrack';
}

/** Same BASE_URL rules as installer.sh write_env_server_details(). */
function deriveBaseUrl(serverName, envBaseUrl) {
  if (envBaseUrl) return envBaseUrl.replace(/\/$/, '');
  if (!serverName || serverName === 'null') return 'http://localhost:3000';
  if (/^https?:\/\//i.test(serverName)) return serverName.replace(/\/$/, '');
  if (/^(localhost|127\.0\.0\.1)$/i.test(serverName)) return `http://${serverName}:3000`;
  return `https://${serverName}`;
}

function deriveStaffEmailDomain(serverName) {
  if (!serverName || serverName === 'null') return 'novahire.demo';
  const host = serverName.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].toLowerCase();
  if (/^(localhost|127\.0\.0\.1)$/.test(host)) return 'novahire.demo';
  return `staff.${host}`;
}

function findHiretrackHome() {
  if (process.env.HIRETRACK_HOME) return process.env.HIRETRACK_HOME;
  let dir = DEMO_SEED_DIR;
  for (let i = 0; i < 4; i += 1) {
    if (fs.existsSync(path.join(dir, 'config.json')) && fs.existsSync(path.join(dir, 'APP'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(os.homedir(), '.hiretrack');
}

function resolveServerConfig() {
  const hiretrackHome = findHiretrackHome();
  const appDir = path.join(hiretrackHome, 'APP');
  const config = readJson(path.join(hiretrackHome, 'config.json')) || {};
  const appEnv = readEnvFile(path.join(appDir, '.env'));

  const mongodbUri =
    process.env.MONGODB_URI || appEnv.MONGODB_URI || config.dbUrl || '';

  const resumeCandidates = [
    process.env.DEMO_RESUME_SOURCE_PATH,
    path.join(DEMO_SEED_DIR, 'applicant-resume.pdf'),
    path.join(hiretrackHome, 'assets', 'documents', 'applicant-resume.pdf'),
    path.join(appDir, 'public', 'demo', 'applicant-resume.pdf'),
  ].filter(Boolean);

  let resumeSourcePath = '';
  for (const p of resumeCandidates) {
    if (fs.existsSync(p)) {
      resumeSourcePath = p;
      break;
    }
  }
  if (!resumeSourcePath) {
    resumeSourcePath = path.join(DEMO_SEED_DIR, 'applicant-resume.pdf');
  }

  const serverName = config.serverName || '';

  return {
    hiretrackHome,
    appDir,
    mongodbUri,
    dbName: process.env.DEMO_DB_NAME || parseDbName(mongodbUri),
    baseUrl: deriveBaseUrl(serverName, appEnv.BASE_URL || appEnv.NEXT_PUBLIC_BASE_URL),
    serverName,
    staffEmailDomain: deriveStaffEmailDomain(serverName),
    resumeSourcePath,
    credentialsPath: path.join(hiretrackHome, 'demo-seed-credentials.json'),
  };
}

function applyEnv(cfg) {
  process.env.HIRETRACK_SEED_SERVER = '1';
  process.env.HIRETRACK_HOME = cfg.hiretrackHome;
  process.env.HIRETRACK_APP_DIR = cfg.appDir;
  process.env.HIRETRACK_CREDENTIALS_PATH = cfg.credentialsPath;
  process.env.MONGODB_URI = cfg.mongodbUri;
  process.env.DEMO_DB_NAME = cfg.dbName;
  process.env.DEMO_URL_BASE = cfg.baseUrl;
  process.env.DEMO_STAFF_EMAIL_DOMAIN = cfg.staffEmailDomain;
  process.env.DEMO_EMAIL_DOMAIN = 'hiretrack.demo';
  process.env.DEMO_RESUME_SOURCE_PATH = cfg.resumeSourcePath;
  process.env.DEMO_ORG_NAME = process.env.DEMO_ORG_NAME || 'NovaHire';
  process.env.DEMO_PORTAL_NAME = process.env.DEMO_PORTAL_NAME || 'NovaHire';
  // Demo integration keys (optional overrides; defaults live in generate-demo-database.cjs):
  // DEMO_GOOGLE_CLIENT_ID, DEMO_GOOGLE_CLIENT_SECRET,
  // DEMO_MAIN_GEMINI_API_KEY, DEMO_MAIN_GEMINI_MODEL,
  // DEMO_BULK_GROQ_API_KEY, DEMO_BULK_GEMINI_API_KEY,
  // DEMO_BULK_OPENROUTER_API_KEY, DEMO_BULK_CEREBRAS_API_KEY, DEMO_BULK_MISTRAL_API_KEY,
  // DEMO_BREVO_API_KEY, DEMO_BREVO_FROM, DEMO_BREVO_REPLY_TO
}

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: node seed-server.cjs [--dry-run] [--force]

  cd ~/.hiretrack/APP
  export NODE_PATH="$PWD/node_modules"
  node ../demo-seed/seed-server.cjs --force
`);
  process.exit(0);
}

const generatorPath = path.join(DEMO_SEED_DIR, 'generate-demo-database.cjs');
if (!fs.existsSync(generatorPath)) {
  console.error('[ ERROR ] Missing generate-demo-database.cjs in', DEMO_SEED_DIR);
  console.error('Copy scripts/generate-demo-database.cjs into ~/.hiretrack/demo-seed/');
  process.exit(1);
}

const cfg = resolveServerConfig();
const hiretrackConfig = readJson(path.join(cfg.hiretrackHome, 'config.json')) || {};

if (hiretrackConfig.deploymentType !== 'demo') {
  console.error(
    '[ ERROR ] Refusing to seed: deploymentType is not "demo" in config.json.',
  );
  console.error('          Run ./installer.sh --demo-init on a dedicated demo server first.');
  process.exit(1);
}

if (args.includes('--dry-run')) {
  console.log(JSON.stringify({ ...cfg, mongodbUri: cfg.mongodbUri ? '[set]' : '[missing]' }, null, 2));
  process.exit(0);
}

if (!cfg.mongodbUri) {
  console.error('[ ERROR ] MongoDB URL not found in config.json dbUrl or APP/.env MONGODB_URI');
  process.exit(1);
}

if (!args.includes('--force') && !args.includes('-y')) {
  console.error('\n[ WARNING ] Drops all data in MongoDB database:', cfg.dbName);
  console.error('[ WARNING ] Hiretrack home:', cfg.hiretrackHome);
  console.error('[ WARNING ] Re-run with --force\n');
  process.exit(1);
}

if (!fs.existsSync(cfg.resumeSourcePath)) {
  console.error('[ ERROR ] Resume PDF not found:', cfg.resumeSourcePath);
  console.error('Place applicant-resume.pdf in', DEMO_SEED_DIR);
  process.exit(1);
}

applyEnv(cfg);
require(generatorPath);
