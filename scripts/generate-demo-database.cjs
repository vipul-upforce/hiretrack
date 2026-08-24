#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const CryptoJS = require('crypto-js');
const { MongoClient, ObjectId } = require('mongodb');
const dotenv = require('dotenv');

const IS_SERVER_SEED = process.env.HIRETRACK_SEED_SERVER === '1';

const PROJECT_ROOT = IS_SERVER_SEED
  ? process.env.HIRETRACK_APP_DIR
  : path.resolve(__dirname, '..');

if (!IS_SERVER_SEED) {
  dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });
  dotenv.config({ path: path.join(PROJECT_ROOT, '.env.local'), override: true });
}

const SOURCE_RESUME_PATH = process.env.DEMO_RESUME_SOURCE_PATH || '';

/** Isolated sandbox DB locally; on server uses DB name from Mongo URI (via seed-server.cjs). */
const DEMO_DB_NAME =
  process.env.DEMO_DB_NAME ||
  (IS_SERVER_SEED ? '' : 'hiretrack__isolated_sandbox_seed__v1');
const MONGODB_URI = process.env.MONGODB_URI;

const ORG_NAME = process.env.DEMO_ORG_NAME || 'NovaHire';
const PORTAL_NAME = process.env.DEMO_PORTAL_NAME || ORG_NAME;

/** Google Calendar / Meet OAuth (demo). Set via env on seed hosts. */
const DEMO_GOOGLE_CLIENT_ID = process.env.DEMO_GOOGLE_CLIENT_ID || '';
const DEMO_GOOGLE_CLIENT_SECRET = process.env.DEMO_GOOGLE_CLIENT_SECRET || '';

/** Main AI provider (candidate evaluation). */
const DEMO_MAIN_GEMINI_API_KEY = process.env.DEMO_MAIN_GEMINI_API_KEY || '';
const DEMO_MAIN_GEMINI_MODEL =
  process.env.DEMO_MAIN_GEMINI_MODEL || 'gemini-2.5-flash-lite';

/** Bulk CV AI pool providers. */
const DEMO_BULK_GROQ_API_KEY = process.env.DEMO_BULK_GROQ_API_KEY || '';
const DEMO_BULK_GEMINI_API_KEY = process.env.DEMO_BULK_GEMINI_API_KEY || '';
const DEMO_BULK_OPENROUTER_API_KEY = process.env.DEMO_BULK_OPENROUTER_API_KEY || '';
const DEMO_BULK_CEREBRAS_API_KEY = process.env.DEMO_BULK_CEREBRAS_API_KEY || '';
const DEMO_BULK_MISTRAL_API_KEY = process.env.DEMO_BULK_MISTRAL_API_KEY || '';

/** Brevo transactional email (demo). */
const DEMO_BREVO_API_KEY = process.env.DEMO_BREVO_API_KEY || '';
const DEMO_BREVO_FROM = process.env.DEMO_BREVO_FROM || 'noreply@localhost';
const DEMO_BREVO_REPLY_TO = process.env.DEMO_BREVO_REPLY_TO || 'noreply@localhost';

const DEMO_EMAIL_DOMAIN =
  process.env.DEMO_EMAIL_DOMAIN || 'hiretrack.demo';
const DEMO_STAFF_EMAIL_DOMAIN =
  process.env.DEMO_STAFF_EMAIL_DOMAIN ||
  (IS_SERVER_SEED ? 'novahire.demo' : 'novahire.demo');
const DEMO_URL_BASE =
  process.env.DEMO_URL_BASE ||
  (IS_SERVER_SEED ? 'http://localhost:3000' : 'https://sandbox.hiretrack.demo.invalid');
if (!MONGODB_URI) {
  console.error(
    IS_SERVER_SEED
      ? 'MONGODB_URI is required (set by seed-server.cjs from config.json / APP/.env)'
      : 'MONGODB_URI is required in .env/.env.local',
  );
  process.exit(1);
}

const DEMO_JOB_COUNT = 7;
/** Per-job candidate counts — first two roles are high-volume (~300 each). */
const JOB_CANDIDATE_TARGETS = [300, 300, 70, 55, 45, 40, 35];

const LANE_PIPELINE = [
  'applied',
  'screening',
  'shortlisted',
  'processing',
  'accepted',
];

const REMARK_SNIPPETS = [
  'Communicates clearly and backs answers with concrete delivery examples.',
  'Strong fundamentals; would benefit from deeper system design discussion.',
  'Good culture fit signals from prior cross-functional work.',
  'Salary expectations are within the approved band for this level.',
  'Notice period may affect start-date planning — confirm during HR round.',
  'Panel feedback was positive on problem-solving approach.',
];

const FOLLOW_UP_NOTES = [
  'Call candidate to confirm notice period and expected joining date.',
  'Send take-home assignment and follow up by end of week.',
  'Reconnect after panel feedback — pending hiring manager decision.',
  'Schedule second round with engineering lead.',
  'Request updated salary breakup before moving to offer stage.',
  'Ping candidate for availability before scheduling panel round.',
];

const CHECKLIST_VISIBILITY_ROLES = ['admin', 'hr', 'interviewer'];

/** Organization tag catalog — subset applied to a small fraction of candidates. */
const ORG_TAGS = [
  { title: 'High Potential', color: '#22C55E' },
  { title: 'Needs Review', color: '#F59E0B' },
  { title: 'Strong Communicator', color: '#3B82F6' },
  { title: 'Salary Mismatch', color: '#EB2F96' },
  { title: 'Referral', color: '#8B5CF6' },
  { title: 'Passive Candidate', color: '#64748B' },
];

const STRENGTHS_POOL = [
  'Ownership',
  'Problem Solving',
  'Communication',
  'Team Collaboration',
  'Technical Depth',
  'Delivery Focus',
];

const IMPROVEMENT_POOL = [
  'System design depth',
  'Domain knowledge',
  'Stakeholder management',
  'Test automation coverage',
  'Documentation habits',
];

const RECOMMENDATIONS = [
  'Strong fit — proceed to offer stage',
  'Good profile — recommend panel interview',
  'Promising — hold for comparison with current pipeline',
  'Borderline — needs senior reviewer sign-off',
  'Not recommended at this time',
];
const JOB_TEMPLATES = [
  {
    title: 'Senior Fullstack Engineer',
    description:
      'Build and scale hiring workflows across frontend and backend systems.',
    skills: ['TypeScript', 'React', 'Node.js', 'MongoDB', 'Docker'],
    experience: { min: 4, max: 8, inText: '4-8 years' },
    salary: { min: 18, max: 32, inText: '18-32 LPA', isPrivate: false },
    evaluationWeights: { skills: 30, experience: 30, affordability: 20, overall: 20 },
  },
  {
    title: 'Product Designer',
    description:
      'Own candidate experience and dashboard UX for recruiting teams.',
    skills: ['Figma', 'Design Systems', 'User Research', 'Prototyping'],
    experience: { min: 3, max: 6, inText: '3-6 years' },
    salary: { min: 14, max: 24, inText: '14-24 LPA', isPrivate: false },
    evaluationWeights: { skills: 35, experience: 25, affordability: 20, overall: 20 },
  },
  {
    title: 'DevOps Engineer',
    description:
      'Own CI/CD pipelines, infrastructure as code, and production reliability.',
    skills: ['Docker', 'AWS', 'Kubernetes', 'Terraform', 'CI/CD'],
    experience: { min: 3, max: 7, inText: '3-7 years' },
    salary: { min: 16, max: 28, inText: '16-28 LPA', isPrivate: false },
    evaluationWeights: { skills: 35, experience: 30, affordability: 15, overall: 20 },
  },
  {
    title: 'QA Automation Engineer',
    description:
      'Design and maintain end-to-end test suites for core hiring workflows.',
    skills: ['Cypress', 'Jest', 'TypeScript', 'REST', 'Playwright'],
    experience: { min: 2, max: 5, inText: '2-5 years' },
    salary: { min: 10, max: 18, inText: '10-18 LPA', isPrivate: false },
    evaluationWeights: { skills: 40, experience: 20, affordability: 20, overall: 20 },
  },
  {
    title: 'Data Analyst',
    description:
      'Turn hiring funnel data into actionable insights for recruiting teams.',
    skills: ['SQL', 'PostgreSQL', 'Python', 'Tableau', 'Excel'],
    experience: { min: 2, max: 5, inText: '2-5 years' },
    salary: { min: 9, max: 16, inText: '9-16 LPA', isPrivate: false },
    evaluationWeights: { skills: 30, experience: 25, affordability: 25, overall: 20 },
  },
  {
    title: 'Technical Product Manager',
    description:
      'Define roadmap for ATS features and partner with engineering on delivery.',
    skills: ['Product Strategy', 'Agile', 'User Research', 'Roadmapping', 'Jira'],
    experience: { min: 4, max: 9, inText: '4-9 years' },
    salary: { min: 20, max: 35, inText: '20-35 LPA', isPrivate: true },
    evaluationWeights: { skills: 25, experience: 35, affordability: 20, overall: 20 },
  },
  {
    title: 'Backend Engineer (Node.js)',
    description:
      'Build APIs, background jobs, and integrations for the hiring platform.',
    skills: ['Node.js', 'Express', 'MongoDB', 'Redis', 'GraphQL'],
    experience: { min: 3, max: 6, inText: '3-6 years' },
    salary: { min: 15, max: 26, inText: '15-26 LPA', isPrivate: false },
    evaluationWeights: { skills: 35, experience: 25, affordability: 20, overall: 20 },
  },
];

const DEFAULT_LANES = [
  { name: 'applied', color: '#3B82F6', systemKey: 'applied' },
  { name: 'screening', color: '#8B5CF6', systemKey: null },
  { name: 'shortlisted', color: '#06B6D4', systemKey: null },
  { name: 'processing', color: '#F59E0B', systemKey: null },
  { name: 'accepted', color: '#22C55E', systemKey: 'accepted' },
  { name: 'rejected', color: '#EF4444', systemKey: 'rejected' },
];

const SKILL_POOL = [
  'JavaScript',
  'TypeScript',
  'React',
  'Next.js',
  'Node.js',
  'Express',
  'MongoDB',
  'PostgreSQL',
  'Redis',
  'Docker',
  'AWS',
  'Jest',
  'Cypress',
  'GraphQL',
  'REST',
];

const FIRST_NAMES = [
  'Aarav',
  'Isha',
  'Vihaan',
  'Ananya',
  'Arjun',
  'Meera',
  'Kabir',
  'Diya',
  'Rohan',
  'Priya',
  'Riya',
  'Karan',
  'Neha',
  'Samar',
  'Nisha',
];

const LAST_NAMES = [
  'Sharma',
  'Verma',
  'Gupta',
  'Iyer',
  'Mehta',
  'Patel',
  'Nair',
  'Reddy',
  'Kapoor',
  'Singh',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany(arr, count) {
  const cloned = [...arr];
  const result = [];
  while (result.length < count && cloned.length > 0) {
    const idx = Math.floor(Math.random() * cloned.length);
    result.push(cloned.splice(idx, 1)[0]);
  }
  return result;
}

/** ~2% of candidates receive 1–3 tags from the org catalog. */
function buildCandidateTags(orgTags) {
  if (Math.random() > 0.02) {
    return undefined;
  }
  const count = 1 + Math.floor(Math.random() * 3);
  return pickMany(orgTags, count);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/** Passwords are generated per seed run and written to demo-seed-credentials.json (gitignored). */

/** Meets app password rules: upper, lower, digit, special (@$!%*?&), min 12 chars. */
function generateDemoPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@$!%*?&';
  const all = upper + lower + digits + special;

  const required = [
    upper[crypto.randomInt(upper.length)],
    lower[crypto.randomInt(lower.length)],
    digits[crypto.randomInt(digits.length)],
    special[crypto.randomInt(special.length)],
  ];

  const chars = [...required];
  while (chars.length < 12) {
    chars.push(all[crypto.randomInt(all.length)]);
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

function resolveDemoPassword() {
  return generateDemoPassword();
}

async function assignUniquePasswords(entries) {

  return Promise.all(
    entries.map(async (entry) => {
      const rawPassword = resolveDemoPassword(entry.email);
      return {
        ...entry,
        password: await bcrypt.hash(rawPassword, 10),
        rawPassword,
      };
    }),
  );
}

/** Build a non-deliverable demo mailbox — defaults to candidate/outbound domain. */
/** Mirrors `src/lib/jwtSecretGenerator.ts` for encrypting seeded secrets. */
function generateOrgJwtSecret(organizationId) {
  if (!organizationId) {
    throw new Error('organizationId is required');
  }
  let saltedId = organizationId
    .replace(/a/gi, '@')
    .replace(/e/gi, '3')
    .replace(/i/gi, '!')
    .replace(/o/gi, '0')
    .replace(/u/gi, '_')
    .replace(/s/gi, '$')
    .replace(/t/gi, '7')
    .replace(/n/gi, 'N')
    .replace(/m/gi, '2')
    .replace(/l/gi, '1')
    .replace(/k/gi, '9')
    .replace(/j/gi, '8')
    .replace(/h/gi, '7');
  const first = organizationId.charAt(0);
  const last = organizationId.charAt(organizationId.length - 1);
  return `${first}${saltedId}${last}_${organizationId.length}`;
}

function encryptDemoSecret(plaintext, organizationId) {
  if (!plaintext) return '';
  return CryptoJS.AES.encrypt(
    plaintext,
    generateOrgJwtSecret(organizationId),
  ).toString();
}

function demoEmail(localPart, domain = DEMO_EMAIL_DOMAIN) {
  const safe = String(localPart)
    .toLowerCase()
    .replace(/[^a-z0-9._+-]+/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return `${safe || 'user'}@${domain}`;
}

function demoStaffEmail(displayName) {
  return demoEmail(
    displayName.replace(/\s+/g, '.').toLowerCase(),
    DEMO_STAFF_EMAIL_DOMAIN,
  );
}

function demoCandidateEmail(firstName, lastName, index) {
  return demoEmail(`${slugify(firstName)}.${slugify(lastName)}.${index}`);
}

/** Non-resolvable LinkedIn-style URL — no real profile slug or PII in path. */
function demoLinkedInUrl() {
  const token = crypto.randomBytes(8).toString('hex');
  return `${DEMO_URL_BASE}/linkedin/in/demo-${token}`;
}

function demoMeetingUrl(provider, slug) {
  const paths = {
    google: `meet/${slug}`,
    teams: `teams/${slug}`,
    zoom: `zoom/${slug}`,
  };
  return `${DEMO_URL_BASE}/${paths[provider] || paths.google}`;
}

/** Synthetic phone — 555 prefix is never assigned to real subscribers. */
function randomPhone() {
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `+91-555-01${suffix}`;
}

/** Latest allowed timestamp for history — end of yesterday (local time). */
function getMaxHistoryDate() {
  const endOfYesterday = new Date();
  endOfYesterday.setHours(0, 0, 0, 0);
  endOfYesterday.setMilliseconds(endOfYesterday.getMilliseconds() - 1);
  return endOfYesterday;
}

function clampToMaxDate(date, maxDate) {
  return date.getTime() > maxDate.getTime() ? new Date(maxDate) : date;
}

function advanceCursor(cursor, hours, maxDate) {
  return clampToMaxDate(addHours(cursor, hours), maxDate);
}

function randomDateInPast(days, maxDate = getMaxHistoryDate()) {
  const max = maxDate.getTime();
  const min = max - days * 24 * 60 * 60 * 1000;
  const delta = Math.floor(Math.random() * (max - min));
  return new Date(min + delta);
}

const JOB_POSITION_FORM_ID = 'h3qmln24v';
const CANDIDATE_FORM_ID = 'g2xh8hoe1';

function makeCustomFieldDefinition({
  label,
  type,
  options,
  required = false,
  privateField = false,
  privateInterviewer = false,
  showOnCard = false,
  jobId,
  defaultValue,
}) {
  return {
    id: crypto.randomUUID(),
    label,
    type,
    options: options || [],
    persistance: 'permanent',
    defaultValue: defaultValue ?? (type === 'multiSelect' ? [] : ''),
    required,
    private: privateField,
    privateInt: privateInterviewer,
    showOnCard,
    ...(jobId ? { jobId: jobId.toString() } : {}),
  };
}

function buildOrganizationCustomFields(jobs) {
  const jobPositionFields = [
    makeCustomFieldDefinition({
      label: 'Department',
      type: 'select',
      options: ['Engineering', 'Product', 'Design', 'Data', 'Operations'],
      showOnCard: true,
    }),
    makeCustomFieldDefinition({
      label: 'Employment Type',
      type: 'select',
      options: ['Full-time', 'Contract', 'Internship'],
      required: true,
    }),
    makeCustomFieldDefinition({
      label: 'Hiring Priority',
      type: 'select',
      options: ['High', 'Medium', 'Low'],
      showOnCard: true,
    }),
    makeCustomFieldDefinition({
      label: 'Team Size',
      type: 'number',
    }),
    makeCustomFieldDefinition({
      label: 'Work Location Policy',
      type: 'select',
      options: ['Remote-first', 'Hybrid (3 days office)', 'On-site'],
      showOnCard: true,
    }),
  ];

  const candidateFields = [
    makeCustomFieldDefinition({
      label: 'Work Authorization',
      type: 'select',
      options: ['Indian Citizen', 'OCI / PIO', 'Work Permit Required'],
      required: true,
    }),
    makeCustomFieldDefinition({
      label: 'Preferred Work Mode',
      type: 'select',
      options: ['Remote', 'Hybrid', 'On-site'],
      showOnCard: true,
    }),
    makeCustomFieldDefinition({
      label: 'Earliest Joining Date',
      type: 'date',
    }),
    makeCustomFieldDefinition({
      label: 'LinkedIn Profile',
      type: 'text',
    }),
    makeCustomFieldDefinition({
      label: 'Willing to Relocate',
      type: 'radio',
      options: ['Yes', 'No'],
      showOnCard: true,
    }),
    makeCustomFieldDefinition({
      label: 'Primary Skills (self-reported)',
      type: 'multiSelect',
      options: SKILL_POOL,
    }),
    makeCustomFieldDefinition({
      label: 'Internal HR Notes',
      type: 'textarea',
      privateInterviewer: true,
    }),
    makeCustomFieldDefinition({
      label: 'Personal Reference Contact',
      type: 'text',
      privateField: true,
    }),
  ];

  jobs.slice(0, 3).forEach((job) => {
    candidateFields.push(
      makeCustomFieldDefinition({
        label: `Role Fit Notes — ${job.title}`,
        type: 'textarea',
        jobId: job._id,
      }),
    );
  });

  return {
    [JOB_POSITION_FORM_ID]: {
      formName: 'Job Position',
      fields: jobPositionFields,
    },
    [CANDIDATE_FORM_ID]: {
      formName: 'Candidate',
      fields: candidateFields,
    },
  };
}

function departmentForJobTitle(title) {
  if (title.includes('Designer')) return 'Design';
  if (title.includes('Product Manager')) return 'Product';
  if (title.includes('Data')) return 'Data';
  if (
    title.includes('DevOps') ||
    title.includes('QA') ||
    title.includes('Engineer')
  ) {
    return 'Engineering';
  }
  return pick(['Engineering', 'Product', 'Operations']);
}

function buildJobCustomFieldValues(job) {
  return {
    Department: departmentForJobTitle(job.title),
    'Employment Type': pick(['Full-time', 'Full-time', 'Contract']),
    'Hiring Priority':
      job.status === 'draft' ? 'Low' : pick(['High', 'Medium', 'Medium', 'Low']),
    'Team Size': 4 + Math.floor(Math.random() * 12),
    'Work Location Policy': pick([
      'Remote-first',
      'Hybrid (3 days office)',
      'On-site',
    ]),
  };
}

function formatDateOffset(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

function buildCandidateCustomFieldValues(
  orgCustomFields,
  job,
  firstName,
  lastName,
  statusName,
) {
  const fillChance = statusName === 'applied' ? 0.45 : 0.78;
  if (Math.random() > fillChance) {
    return {};
  }

  const form = orgCustomFields[CANDIDATE_FORM_ID];
  if (!form?.fields?.length) {
    return {};
  }

  const jobIdStr = job._id.toString();
  const applicableFields = form.fields.filter(
    (field) => !field.candidateId && (!field.jobId || field.jobId === jobIdStr),
  );

  const values = {};

  applicableFields.forEach((field) => {
    if (field.privateInt && Math.random() > 0.4) {
      return;
    }
    if (field.private && Math.random() > 0.3) {
      return;
    }

    switch (field.type) {
      case 'select':
      case 'radio':
        values[field.label] = pick(field.options);
        break;
      case 'multiSelect':
        values[field.label] = pickMany(
          field.options,
          2 + Math.floor(Math.random() * 3),
        );
        break;
      case 'date':
        values[field.label] = formatDateOffset(15 + Math.floor(Math.random() * 75));
        break;
      case 'number':
        values[field.label] = 1 + Math.floor(Math.random() * 10);
        break;
      case 'textarea':
        values[field.label] = pick([
          'Strong alignment with role requirements from recent project work.',
          'Good communication during initial screening; proceed to technical round.',
          'Referred by employee — priority follow-up recommended.',
          'Needs deeper evaluation on system design in the next interview.',
        ]);
        break;
      default:
        if (field.label === 'LinkedIn Profile') {
          values[field.label] = demoLinkedInUrl();
        } else if (field.label === 'Personal Reference Contact') {
          const refToken = crypto.randomBytes(4).toString('hex');
          values[field.label] = `Demo Ref ${refToken} — ${randomPhone()}`;
        } else {
          values[field.label] = `${firstName} ${lastName}`;
        }
    }
  });

  return values;
}

function buildJobs(orgId, laneDocs, now) {
  const laneIds = laneDocs.map((lane) => lane._id);

  return JOB_TEMPLATES.slice(0, DEMO_JOB_COUNT).map((template, index) => ({
    _id: new ObjectId(),
    organizationId: orgId,
    title: template.title,
    description: template.description,
    skills: template.skills,
    experience: template.experience,
    links: [],
    salary: template.salary,
    status: index === DEMO_JOB_COUNT - 1 ? 'draft' : 'open',
    isPublished: index !== DEMO_JOB_COUNT - 1,
    attachments: { files: [], images: [] },
    tracking: {
      createdAt: randomDateInPast(60 + index * 5),
      updatedAt: randomDateInPast(10),
    },
    customFields: {},
    useCustomLanes: false,
    lanes: laneIds,
    isDeleted: false,
    promptForStatusChangeReason: true,
    evaluationWeights: template.evaluationWeights,
    createdAt: now,
    updatedAt: now,
  }));
}

function scoreInt(min = 0, max = 10) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function laneIndex(statusName) {
  if (statusName === 'rejected') {
    return 5;
  }
  const idx = LANE_PIPELINE.indexOf(statusName);
  return idx === -1 ? 0 : idx;
}

function pickStatusForCandidate() {
  const roll = Math.random();
  if (roll < 0.26) return 'applied';
  if (roll < 0.42) return 'screening';
  if (roll < 0.56) return 'shortlisted';
  if (roll < 0.7) return 'processing';
  if (roll < 0.84) return 'accepted';
  return 'rejected';
}

function lanesTraversedToReach(statusName) {
  if (statusName === 'applied') {
    return ['applied'];
  }

  if (statusName === 'rejected') {
    const exitPoints = ['screening', 'shortlisted', 'processing'];
    const lastPipelineLane = pick(exitPoints);
    const lastIdx = LANE_PIPELINE.indexOf(lastPipelineLane);
    return [...LANE_PIPELINE.slice(0, lastIdx + 1), 'rejected'];
  }

  const idx = LANE_PIPELINE.indexOf(statusName);
  return LANE_PIPELINE.slice(0, idx + 1);
}

function addHours(baseDate, hours) {
  return new Date(baseDate.getTime() + hours * 60 * 60 * 1000);
}

/** CTC values are stored in LPA (lakhs). Mostly whole numbers; ~35% use one decimal. */
function randomLpa(minLpa, maxLpa) {
  const min = Math.min(minLpa, maxLpa);
  const max = Math.max(minLpa, maxLpa);
  const value = min + Math.random() * (max - min);
  const rounded = Math.random() < 0.35
    ? Math.round(value * 10) / 10
    : Math.round(value);
  return Math.min(99, Math.max(0, rounded));
}

function buildCandidateCtc(jobSalary) {
  const bandMin = jobSalary.min;
  const bandMax = jobSalary.max;
  const seniorRole = bandMin >= 14;

  // Most applicants report single-digit LPA; senior-band roles sometimes show low-teens.
  if (!seniorRole || Math.random() < 0.62) {
    const currentCTC = randomLpa(4, 9);
    const expectedCTC = randomLpa(currentCTC, Math.min(11, currentCTC + 3));
    return {
      currentCTC,
      expectedCTC: Math.max(expectedCTC, currentCTC),
    };
  }

  const currentCTC = randomLpa(Math.max(8, bandMin - 5), bandMax - 1);
  const expectedCTC = randomLpa(
    currentCTC,
    Math.min(bandMax + 2, currentCTC + 4),
  );

  return {
    currentCTC,
    expectedCTC: Math.max(expectedCTC, currentCTC),
  };
}

/**
 * Controls how far a candidate progressed operationally — most shortlisted+
 * candidates do NOT have a meeting on the calendar yet.
 */
function buildCandidateEngagement(statusName) {
  const stage = laneIndex(statusName);

  if (stage < 2) {
    return {
      hasRemark: stage >= 1 && Math.random() < 0.55,
      hasAssignment: false,
      hasScheduledMeeting: false,
      hasMeetingResponse: false,
      hasEmailSent: false,
    };
  }

  const roll = Math.random();

  if (roll < 0.48) {
    return {
      hasRemark: Math.random() < 0.7,
      hasAssignment: false,
      hasScheduledMeeting: false,
      hasMeetingResponse: false,
      hasEmailSent: false,
    };
  }

  if (roll < 0.78) {
    return {
      hasRemark: true,
      hasAssignment: true,
      hasScheduledMeeting: false,
      hasMeetingResponse: false,
      hasEmailSent: stage >= 3 && Math.random() < 0.25,
    };
  }

  return {
    hasRemark: true,
    hasAssignment: true,
    hasScheduledMeeting: true,
    hasMeetingResponse: stage >= 3 && Math.random() < 0.72,
    hasEmailSent: stage >= 3 && Math.random() < 0.55,
  };
}

function buildMeetingLinks(candidateName, jobTitle, candidateEmail) {
  const slug = crypto.randomBytes(6).toString('hex');
  const meetCode = `${slug.slice(0, 3)}-${slug.slice(3, 6)}-${slug.slice(6, 9)}`;
  const teamsSlug = crypto.randomBytes(6).toString('hex');
  const zoomId = `demo${crypto.randomBytes(5).toString('hex')}`;
  const guestEmail =
    candidateEmail || demoEmail(`guest.${slugify(candidateName)}`);

  return {
    google: {
      eventId: `gcal_${slug}`,
      meetingLink: demoMeetingUrl('google', meetCode),
      htmlLink: `${DEMO_URL_BASE}/calendar/eventedit`,
      summary: `Interview: ${candidateName} — ${jobTitle}`,
      description: 'Technical interview round scheduled via Google Calendar.',
      attendeeResponses: [
        {
          email: guestEmail,
          name: candidateName,
          responseStatus: pick(['accepted', 'accepted', 'tentative', 'needsAction']),
          lastUpdated: new Date(),
          notificationSent: true,
        },
      ],
      lastSyncedAt: new Date(),
    },
    teams: {
      meetingId: `teams_${teamsSlug}`,
      meetingLink: demoMeetingUrl('teams', teamsSlug),
      eventId: `teams_evt_${teamsSlug}`,
      htmlLink: `${DEMO_URL_BASE}/calendar`,
      summary: `Panel discussion — ${jobTitle}`,
      description: 'Interview scheduled through Microsoft Teams integration.',
      lastSyncedAt: new Date(),
    },
    zoom: {
      meetingId: zoomId,
      meetingLink: demoMeetingUrl('zoom', zoomId),
      summary: `Zoom interview — ${jobTitle}`,
      description: 'Video interview scheduled via Zoom.',
      guestEmails: [guestEmail],
      lastSyncedAt: new Date(),
    },
  };
}

function buildScores(statusName) {
  if (laneIndex(statusName) < 2) {
    return undefined;
  }

  const overall = scoreInt(4, 9);
  const skills = scoreInt(4, 10);
  const experience = scoreInt(3, 9);
  const affordability = scoreInt(2, 8);

  return {
    overall,
    experience,
    skills,
    affordability,
    strengths: pickMany(STRENGTHS_POOL, 2),
    areas_for_improvement: pickMany(IMPROVEMENT_POOL, 2),
    recommendation: pick(RECOMMENDATIONS),
    notes:
      'AI evaluation completed from resume and job description match. Scores reflect skills overlap, relevant experience, and compensation alignment.',
    confidenceScores: {
      overall: Number((0.55 + overall * 0.04).toFixed(2)),
      skills: Number((0.5 + skills * 0.045).toFixed(2)),
      experience: Number((0.5 + experience * 0.045).toFixed(2)),
      affordability: Number((0.45 + affordability * 0.05).toFixed(2)),
    },
  };
}

/**
 * Builds candidate.remarks — source of truth for Remark Added history entries.
 */
function buildCandidateRemarks(
  engagement,
  statusName,
  createdAt,
  maxHistoryDate,
  hrUserId,
  interviewerUserId,
) {
  if (!engagement.hasRemark) {
    return [];
  }

  const stage = laneIndex(statusName);
  const remarkCount = stage >= 4 && Math.random() > 0.45 ? 2 : 1;
  const remarks = [];
  let cursor = advanceCursor(
    createdAt,
    24 + Math.floor(Math.random() * 48),
    maxHistoryDate,
  );

  for (let i = 0; i < remarkCount; i += 1) {
    if (i > 0) {
      cursor = advanceCursor(
        cursor,
        12 + Math.floor(Math.random() * 48),
        maxHistoryDate,
      );
    }

    if (cursor.getTime() <= createdAt.getTime()) {
      break;
    }

    remarks.push({
      description: pick(REMARK_SNIPPETS),
      date: cursor.toISOString(),
      rating: pick([3, 4, 4, 5]),
      userId: i === 0 && !engagement.hasAssignment ? hrUserId : interviewerUserId,
    });
  }

  return remarks;
}

function makeChecklistField({ id, label, type, order, options, required = false }) {
  return {
    id,
    label,
    type,
    required,
    order,
    ...(options ? { options } : {}),
    visibleOnForm: CHECKLIST_VISIBILITY_ROLES,
    visibleInHistory: CHECKLIST_VISIBILITY_ROLES,
  };
}

function makeChecklist({ id, name, description, fields, isMandatory, createdBy, createdAt }) {
  return {
    id,
    name,
    description,
    fields,
    isMandatory,
    createdBy,
    createdAt,
    updatedAt: createdAt,
  };
}

/**
 * Job indices that ship with lane checklists in the demo sandbox.
 */
const JOB_CHECKLIST_SPECS = {
  0: [
    {
      laneName: 'screening',
      incoming: {
        id: 'chk_sf_screen_in',
        name: 'Recruiter screening gate',
        description: 'Initial profile and communication review before HR screen.',
        isMandatory: true,
        fields: [
          makeChecklistField({
            id: 'sf_scr_profile',
            label: 'Profile reviewed',
            type: 'checkbox',
            order: 1,
            required: true,
          }),
          makeChecklistField({
            id: 'sf_scr_comm',
            label: 'Communication assessment',
            type: 'select',
            order: 2,
            options: ['Excellent', 'Good', 'Average', 'Needs follow-up'],
            required: true,
          }),
          makeChecklistField({
            id: 'sf_scr_notes',
            label: 'Screening notes',
            type: 'textarea',
            order: 3,
          }),
        ],
      },
      outgoing: {
        id: 'chk_sf_screen_out',
        name: 'Screening sign-off',
        description: 'Confirm readiness to move beyond screening.',
        isMandatory: true,
        fields: [
          makeChecklistField({
            id: 'sf_scr_recommend',
            label: 'Recommend for next round',
            type: 'select',
            order: 1,
            options: ['Yes', 'Hold', 'No'],
            required: true,
          }),
          makeChecklistField({
            id: 'sf_scr_owner',
            label: 'Next-round owner',
            type: 'text',
            order: 2,
          }),
        ],
      },
    },
    {
      laneName: 'shortlisted',
      incoming: {
        id: 'chk_sf_short_in',
        name: 'Shortlist validation',
        description: 'Hiring manager validation before interview loop.',
        isMandatory: false,
        fields: [
          makeChecklistField({
            id: 'sf_short_mgr',
            label: 'Hiring manager approval',
            type: 'checkbox',
            order: 1,
            required: true,
          }),
          makeChecklistField({
            id: 'sf_short_comp',
            label: 'Comp band verified',
            type: 'select',
            order: 2,
            options: ['Within band', 'Needs exception', 'Not assessed'],
          }),
        ],
      },
    },
  ],
  1: [
    {
      laneName: 'screening',
      incoming: {
        id: 'chk_pd_screen_in',
        name: 'Portfolio review checklist',
        description: 'Design portfolio and case-study review before screen.',
        isMandatory: true,
        fields: [
          makeChecklistField({
            id: 'pd_portfolio',
            label: 'Portfolio link reviewed',
            type: 'checkbox',
            order: 1,
            required: true,
          }),
          makeChecklistField({
            id: 'pd_case_study',
            label: 'Case study quality',
            type: 'select',
            order: 2,
            options: ['Strong', 'Adequate', 'Weak'],
            required: true,
          }),
          makeChecklistField({
            id: 'pd_notes',
            label: 'Design review notes',
            type: 'textarea',
            order: 3,
          }),
        ],
      },
    },
    {
      laneName: 'processing',
      outgoing: {
        id: 'chk_pd_proc_out',
        name: 'Offer readiness checklist',
        description: 'Pre-offer documentation and approvals.',
        isMandatory: true,
        fields: [
          makeChecklistField({
            id: 'pd_offer_docs',
            label: 'Documents collected',
            type: 'multiSelect',
            order: 1,
            options: ['ID proof', 'Salary slips', 'Offer letter', 'References'],
            required: true,
          }),
          makeChecklistField({
            id: 'pd_offer_approved',
            label: 'Offer approved by HR head',
            type: 'checkbox',
            order: 2,
            required: true,
          }),
        ],
      },
    },
  ],
  2: [
    {
      laneName: 'shortlisted',
      incoming: {
        id: 'chk_do_short_in',
        name: 'Technical shortlist review',
        description: 'Infra and automation depth check before interviews.',
        isMandatory: true,
        fields: [
          makeChecklistField({
            id: 'do_infra',
            label: 'Infra experience validated',
            type: 'checkbox',
            order: 1,
            required: true,
          }),
          makeChecklistField({
            id: 'do_tools',
            label: 'Primary toolchain',
            type: 'select',
            order: 2,
            options: ['AWS + Terraform', 'GCP + Pulumi', 'Azure + ARM', 'Hybrid'],
          }),
        ],
      },
      outgoing: {
        id: 'chk_do_short_out',
        name: 'Shortlist approval',
        description: 'Panel readiness confirmation.',
        isMandatory: false,
        fields: [
          makeChecklistField({
            id: 'do_panel',
            label: 'Panel slot confirmed',
            type: 'checkbox',
            order: 1,
          }),
          makeChecklistField({
            id: 'do_priority',
            label: 'Interview priority',
            type: 'select',
            order: 2,
            options: ['High', 'Medium', 'Low'],
          }),
        ],
      },
    },
  ],
  3: [
    {
      laneName: 'screening',
      incoming: {
        id: 'chk_qa_screen_in',
        name: 'QA screening checklist',
        description: 'Automation depth and tooling review before interviews.',
        isMandatory: true,
        fields: [
          makeChecklistField({
            id: 'qa_automation',
            label: 'Automation framework experience',
            type: 'select',
            order: 1,
            options: ['Strong', 'Moderate', 'Limited'],
            required: true,
          }),
          makeChecklistField({
            id: 'qa_ci',
            label: 'CI integration reviewed',
            type: 'checkbox',
            order: 2,
            required: true,
          }),
        ],
      },
    },
    {
      laneName: 'processing',
      outgoing: {
        id: 'chk_qa_proc_out',
        name: 'QA offer readiness',
        description: 'Final checks before offer rollout.',
        isMandatory: false,
        fields: [
          makeChecklistField({
            id: 'qa_refs',
            label: 'References checked',
            type: 'checkbox',
            order: 1,
          }),
          makeChecklistField({
            id: 'qa_start',
            label: 'Earliest start date',
            type: 'date',
            order: 2,
          }),
        ],
      },
    },
  ],
  4: [
    {
      laneName: 'shortlisted',
      incoming: {
        id: 'chk_da_short_in',
        name: 'Analyst shortlist review',
        description: 'SQL and dashboard portfolio validation.',
        isMandatory: true,
        fields: [
          makeChecklistField({
            id: 'da_sql',
            label: 'SQL proficiency',
            type: 'select',
            order: 1,
            options: ['Advanced', 'Intermediate', 'Basic'],
            required: true,
          }),
          makeChecklistField({
            id: 'da_portfolio',
            label: 'Sample dashboard reviewed',
            type: 'checkbox',
            order: 2,
            required: true,
          }),
        ],
      },
    },
  ],
};

function buildJobLaneConfigs(jobs, laneDocs, orgId, createdBy, now) {
  return jobs
    .map((job, jobIndex) => {
      const spec = JOB_CHECKLIST_SPECS[jobIndex];
      if (!spec) {
        return null;
      }

      return {
        _id: new ObjectId(),
        jobId: job._id,
        organizationId: orgId,
        laneConfigs: spec.map(({ laneName, incoming, outgoing }) => {
          const laneConfig = {
            // UI matches lane configs by kanban column id (lane name), not ObjectId.
            laneId: laneName,
            laneName,
          };

          if (incoming) {
            laneConfig.incomingChecklist = makeChecklist({
              ...incoming,
              createdBy,
              createdAt: now,
            });
          }

          if (outgoing) {
            laneConfig.outgoingChecklist = makeChecklist({
              ...outgoing,
              createdBy,
              createdAt: now,
            });
          }

          return laneConfig;
        }),
        createdAt: now,
        updatedAt: now,
      };
    })
    .filter(Boolean);
}

function hasMovedPastLane(statusName, traversed, laneName) {
  const lanePos = traversed.indexOf(laneName);
  if (lanePos === -1) {
    return false;
  }

  if (statusName === 'rejected') {
    return lanePos < traversed.length - 1;
  }

  return LANE_PIPELINE.indexOf(statusName) > LANE_PIPELINE.indexOf(laneName);
}

function buildChecklistFieldValue(field, candidateName) {
  switch (field.type) {
    case 'checkbox':
      return true;
    case 'number':
      return pick([3, 4, 5]);
    case 'select':
    case 'radio':
      return pick(field.options || ['Yes']);
    case 'multiSelect':
      return pickMany(field.options || ['Complete'], 1 + Math.floor(Math.random() * 2));
    case 'textarea':
      return pick([
        'Candidate meets baseline criteria for this stage.',
        'Positive signals from resume and initial conversation.',
        `${candidateName} demonstrated relevant experience for the role.`,
      ]);
    case 'date':
      return randomDateInPast(20).toISOString().split('T')[0];
    case 'text':
      if (field.label.toLowerCase().includes('owner')) {
        return pick(['Arjun Kapoor', 'Priya Sharma']);
      }
      return candidateName;
    default:
      return 'Complete';
  }
}

function buildChecklistResponses(checklist, candidateName) {
  const responses = {};

  checklist.fields.forEach((field) => {
    responses[field.id] = {
      value: buildChecklistFieldValue(field, candidateName),
      fieldLabel: field.label,
      fieldType: field.type,
      visibleInHistory: field.visibleInHistory,
    };
  });

  return responses;
}

function buildChecklistCompletion({
  checklist,
  checklistType,
  laneName,
  laneId,
  completedAt,
  completedByUser,
  candidateName,
}) {
  const responses = buildChecklistResponses(checklist, candidateName);
  const completedAtIso = completedAt.toISOString();

  return {
    data: {
      checklistId: checklist.id,
      completedAt: completedAtIso,
      completedBy: completedByUser._id.toString(),
      responses,
    },
    historyEntry: {
      dateTime: completedAtIso,
      title: `Completed ${checklistType} checklist for ${laneName} lane`,
      checklistForm: {
        checklistId: checklist.id,
        checklistName: checklist.name,
        checklistType,
        laneId,
        laneName,
        responses,
        completedAt,
        completedBy: {
          _id: completedByUser._id,
          name: completedByUser.name,
          email: completedByUser.email,
        },
      },
      currentInterviewer: null,
      previousInterviewer: null,
      assignmentBy: completedByUser._id,
      attachments: [],
    },
  };
}

/**
 * Builds candidate.checklistData and matching checklist history entries
 * from the job's lane configuration.
 */
function buildCandidateChecklists({
  statusName,
  createdAt,
  maxHistoryDate,
  jobLaneConfig,
  candidateName,
  completedByUser,
}) {
  if (!jobLaneConfig) {
    return { checklistData: {}, historyEntries: [] };
  }

  const traversed = lanesTraversedToReach(statusName);
  const checklistData = {};
  const historyEntries = [];
  let cursor = advanceCursor(
    createdAt,
    18 + Math.floor(Math.random() * 24),
    maxHistoryDate,
  );

  for (const laneConfig of jobLaneConfig.laneConfigs) {
    const { laneName, laneId, incomingChecklist, outgoingChecklist } = laneConfig;

    if (!traversed.includes(laneName)) {
      continue;
    }

    if (incomingChecklist) {
      cursor = advanceCursor(cursor, 4 + Math.floor(Math.random() * 12), maxHistoryDate);
      const incoming = buildChecklistCompletion({
        checklist: incomingChecklist,
        checklistType: 'incoming',
        laneName,
        laneId,
        completedAt: cursor,
        completedByUser,
        candidateName,
      });

      if (!checklistData[laneId]) {
        checklistData[laneId] = {};
      }
      checklistData[laneId].incoming = incoming.data;
      historyEntries.push(incoming.historyEntry);
    }

    if (outgoingChecklist && hasMovedPastLane(statusName, traversed, laneName)) {
      cursor = advanceCursor(cursor, 6 + Math.floor(Math.random() * 16), maxHistoryDate);
      const outgoing = buildChecklistCompletion({
        checklist: outgoingChecklist,
        checklistType: 'outgoing',
        laneName,
        laneId,
        completedAt: cursor,
        completedByUser,
        candidateName,
      });

      if (!checklistData[laneId]) {
        checklistData[laneId] = {};
      }
      checklistData[laneId].outgoing = outgoing.data;
      historyEntries.push(outgoing.historyEntry);
    }
  }

  return { checklistData, historyEntries };
}

function shouldHaveFollowUp(statusName) {
  const stage = laneIndex(statusName);
  if (stage < 1) {
    return false;
  }
  if (statusName === 'rejected') {
    return Math.random() < 0.08;
  }
  return Math.random() < 0.16;
}

function buildCandidateFollowUp(statusName, createdAt, maxHistoryDate, hrUser) {
  if (!shouldHaveFollowUp(statusName)) {
    return null;
  }

  const note = pick(FOLLOW_UP_NOTES);
  const createdHistoryAt = advanceCursor(
    createdAt,
    48 + Math.floor(Math.random() * 120),
    maxHistoryDate,
  );
  const followUpDate = addHours(new Date(), 12 + Math.floor(Math.random() * 96));

  return {
    followUp: {
      note,
      date: followUpDate,
      userId: hrUser._id,
    },
    historyEntry: {
      dateTime: createdHistoryAt.toISOString(),
      title: 'Followup Created',
      previousInterviewer: null,
      currentInterviewer: null,
      assignmentBy: hrUser._id,
      note: {
        description: note,
        date: followUpDate.toISOString(),
        rating: 0,
        userId: null,
      },
      attachments: [],
    },
  };
}

function buildCandidateHistory({
  statusName,
  createdAt,
  candidateName,
  candidateEmail,
  jobTitle,
  hrUserId,
  interviewerUserId,
  interviewerName,
  hrName,
  engagement,
  remarks,
  maxHistoryDate,
}) {
  const traversed = lanesTraversedToReach(statusName);
  const entries = [];
  let cursor = clampToMaxDate(new Date(createdAt), maxHistoryDate);

  const pushEntry = (entry) => {
    entries.push({
      ...entry,
      dateTime: clampToMaxDate(new Date(entry.dateTime), maxHistoryDate).toISOString(),
    });
  };

  pushEntry({
    dateTime: cursor.toISOString(),
    title: 'Candidate Added',
    previousInterviewer: null,
    currentInterviewer: null,
    assignmentBy: hrUserId,
    attachments: [],
  });

  if (traversed.length > 1) {
    for (let i = 1; i < traversed.length; i += 1) {
      const previousValue = traversed[i - 1];
      const currentValue = traversed[i];
      cursor = advanceCursor(cursor, 12 + Math.floor(Math.random() * 60), maxHistoryDate);

      pushEntry({
        dateTime: cursor.toISOString(),
        title: 'Updated Status',
        previousInterviewer: null,
        currentInterviewer: null,
        assignmentBy: hrUserId,
        note: {
          description: [
            {
              title: 'Updated Status',
              previousValue,
              currentValue,
            },
          ],
          date: cursor.toISOString(),
          rating: 0,
          userId: hrUserId,
        },
        attachments: [],
      });
    }
  }

  for (const remark of remarks) {
    const remarkDate = clampToMaxDate(new Date(remark.date), maxHistoryDate);
    if (remarkDate.getTime() > cursor.getTime()) {
      cursor = remarkDate;
    }

    pushEntry({
      dateTime: remarkDate.toISOString(),
      title: 'Remark Added',
      previousInterviewer: null,
      currentInterviewer: null,
      assignmentBy: hrUserId,
      remark: {
        id: crypto.randomUUID(),
        isPrivate: false,
        description: remark.description,
        date: remark.date,
        rating: remark.rating,
        userId: remark.userId,
      },
      note: {
        description: '',
        date: '',
        rating: 0,
        userId: null,
      },
      attachments: [],
    });
  }

  if (engagement.hasAssignment) {
    cursor = advanceCursor(cursor, 6 + Math.floor(Math.random() * 18), maxHistoryDate);

    let noteDescription = 'Assigned for profile review and initial feedback.';
    if (engagement.hasScheduledMeeting) {
      const meetings = buildMeetingLinks(candidateName, jobTitle, candidateEmail);
      const provider = pick(['google', 'teams', 'zoom']);
      if (provider === 'google') {
        noteDescription = `Google Meet meeting link: ${meetings.google.meetingLink}\n\nPlease review resume before the scheduled slot.`;
      } else if (provider === 'teams') {
        noteDescription = `Microsoft Teams meeting link: ${meetings.teams.meetingLink}\n\nPlease review resume before the scheduled slot.`;
      } else {
        noteDescription = `Zoom meeting link: ${meetings.zoom.meetingLink}\n\nPlease review resume before the scheduled slot.`;
      }
    }

    pushEntry({
      dateTime: cursor.toISOString(),
      title: `Assigned to ${interviewerName} : Assigned by ${hrName}`,
      previousInterviewer: null,
      currentInterviewer: interviewerUserId,
      assignmentBy: hrUserId,
      note: {
        description: noteDescription,
        date: '',
        rating: 0,
        userId: null,
        isPrivate: false,
      },
      attachments: [],
    });

    if (engagement.hasScheduledMeeting) {
      const meetingTime = addHours(cursor, 24 + Math.floor(Math.random() * 72));
      cursor = advanceCursor(meetingTime, -2, maxHistoryDate);
      pushEntry({
        dateTime: cursor.toISOString(),
        title: 'Interview scheduled — calendar invite sent',
        previousInterviewer: null,
        currentInterviewer: interviewerUserId,
        assignmentBy: hrUserId,
        note: {
          description: `Calendar invite sent for ${jobTitle} interview on ${meetingTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.`,
          date: cursor.toISOString(),
          rating: 0,
          userId: hrUserId,
        },
        attachments: [],
      });
    }
  }

  if (engagement.hasMeetingResponse) {
    cursor = advanceCursor(cursor, 4 + Math.floor(Math.random() * 12), maxHistoryDate);
    const responseStatus = pick(['accepted', 'accepted', 'tentative']);
    pushEntry({
      dateTime: cursor.toISOString(),
      title: `Meeting invite ${responseStatus}`,
      previousInterviewer: null,
      currentInterviewer: null,
      assignmentBy: null,
      note: {
        description: `${candidateName} (${candidateEmail}) ${responseStatus === 'accepted' ? 'accepted' : 'tentatively accepted'} the interview invitation`,
        date: cursor.toISOString(),
        rating: 0,
        userId: null,
      },
      attachments: [],
    });
  }

  if (engagement.hasEmailSent) {
    cursor = advanceCursor(cursor, 10 + Math.floor(Math.random() * 30), maxHistoryDate);
    pushEntry({
      dateTime: cursor.toISOString(),
      title: `Interview update — ${jobTitle}`,
      previousInterviewer: null,
      currentInterviewer: interviewerUserId,
      assignmentBy: hrUserId,
      note: {
        description: `Email sent to candidate by ${hrName}`,
        date: cursor.toISOString(),
        rating: 0,
        userId: hrUserId,
      },
      attachments: [],
    });
  }

  if (laneIndex(statusName) >= 4 && engagement.hasAssignment) {
    cursor = advanceCursor(cursor, 8 + Math.floor(Math.random() * 20), maxHistoryDate);
    pushEntry({
      dateTime: cursor.toISOString(),
      title: 'Offer discussion — documents requested',
      previousInterviewer: null,
      currentInterviewer: interviewerUserId,
      assignmentBy: hrUserId,
      note: {
        description:
          'Requested compensation breakup, notice period confirmation, and last three payslips.',
        date: cursor.toISOString(),
        rating: 0,
        userId: hrUserId,
      },
      attachments: [],
    });
  }

  entries.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  return entries;
}

function buildAssignment(
  engagement,
  interviewerUserId,
  candidateName,
  jobTitle,
  assignedAt,
  candidateEmail,
) {
  if (!engagement.hasAssignment) {
    return null;
  }

  const base = {
    interviewerId: interviewerUserId,
    assignedAt,
    time: engagement.hasScheduledMeeting
      ? addHours(assignedAt, 48 + Math.floor(Math.random() * 96))
      : null,
  };

  if (!engagement.hasScheduledMeeting) {
    return base;
  }

  const meetings = buildMeetingLinks(candidateName, jobTitle, candidateEmail);
  const provider = pick(['google', 'teams', 'zoom']);

  if (provider === 'google') {
    return { ...base, googleMeet: meetings.google };
  }
  if (provider === 'teams') {
    return { ...base, microsoftTeams: meetings.teams };
  }
  return { ...base, zoomMeet: meetings.zoom };
}

function buildResumeMeta(sharedResumeBase, firstName, lastName) {
  return {
    ...sharedResumeBase,
    id: crypto.randomUUID(),
    name: `${firstName}_${lastName}_Resume.pdf`,
  };
}

function buildEmailHistoryDoc({
  orgId,
  sender,
  candidate,
  job,
  subject,
  body,
  sentAt,
}) {
  return {
    _id: new ObjectId(),
    organizationId: orgId,
    sentBy: sender._id,
    sentByEmail: sender.email,
    sentByName: sender.name,
    recipientType: 'candidate',
    recipientId: candidate._id,
    recipientEmail: candidate.email,
    recipientName: candidate.name,
    subject,
    body,
    cc: [],
    bcc: [],
    replyTo: sender.email,
    attachments: [],
    status: 'sent',
    provider: 'brevo',
    metadata: {
      candidateId: candidate._id,
      jobId: job._id,
      templateUsed: 'interview-invite',
      eventType: 'candidate_email',
    },
    sentAt,
    createdAt: sentAt,
    updatedAt: sentAt,
  };
}

async function insertInBatches(collection, docs, batchSize = 250) {
  for (let i = 0; i < docs.length; i += batchSize) {
    await collection.insertMany(docs.slice(i, i + batchSize), { ordered: false });
  }
}

function ensureSharedResume() {
  if (!fs.existsSync(SOURCE_RESUME_PATH)) {
    throw new Error(
      `Resume file not found: ${SOURCE_RESUME_PATH}. Set DEMO_RESUME_SOURCE_PATH to override.`,
    );
  }

  const assetsDocumentsDir = path.join(PROJECT_ROOT, '..', 'assets', 'documents');
  fs.mkdirSync(assetsDocumentsDir, { recursive: true });

  const targetFileName = 'applicant-resume.pdf';
  const targetAbsolutePath = path.join(assetsDocumentsDir, targetFileName);
  fs.copyFileSync(SOURCE_RESUME_PATH, targetAbsolutePath);

  const stats = fs.statSync(targetAbsolutePath);
  const pathName = path.join('..', 'assets', 'documents', targetFileName);

  return {
    id: crypto.randomUUID(),
    name: targetFileName,
    url: `/api/files?pathName=${pathName}`,
    type: 'application/pdf',
    size: stats.size,
  };
}

async function createIndexSafely(collection, key, options) {
  try {
    await collection.createIndex(key, options);
  } catch (error) {
    if (
      error &&
      (error.code === 85 ||
        error.code === 67 ||
        error.codeName === 'IndexOptionsConflict' ||
        error.codeName === 'CannotCreateIndex')
    ) {
      console.warn(
        `Skipping index ${options.name || JSON.stringify(key)}: ${error.codeName || error.message}`,
      );
      return;
    }
    throw error;
  }
}

/**
 * Best-effort indexes for demo DB. Uses $type instead of $ne: null because some
 * MongoDB versions reject $ne in partial filter expressions.
 */
async function createIndexes(db) {
  await createIndexSafely(
    db.collection('settings'),
    { organizationId: 1 },
    { name: 'idx_settings_orgId', background: true, unique: true },
  );

  await createIndexSafely(
    db.collection('lanes'),
    { organizationId: 1, name: 1 },
    {
      name: 'org_name_unique_job_null',
      unique: true,
      partialFilterExpression: { jobId: null },
      background: true,
    },
  );

  await createIndexSafely(
    db.collection('lanes'),
    { organizationId: 1, jobId: 1, name: 1 },
    {
      name: 'org_job_name_unique_job_specific',
      unique: true,
      partialFilterExpression: { jobId: { $type: 'objectId' } },
      background: true,
    },
  );

  await createIndexSafely(
    db.collection('candidates'),
    { jobId: 1, 'tracking.createdAt': -1 },
    { name: 'idx_jobId_createdAt', background: true },
  );

  await createIndexSafely(
    db.collection('candidates'),
    { organizationId: 1, status: 1, isDeleted: 1 },
    { name: 'idx_orgId_status_deleted', background: true },
  );

  await createIndexSafely(
    db.collection('candidates'),
    { email: 1 },
    { name: 'idx_email', background: true },
  );
}

async function main() {
  console.log(`\nGenerating demo database: ${DEMO_DB_NAME}`);
  console.log(`Using resume source: ${SOURCE_RESUME_PATH}`);

  const sharedResume = ensureSharedResume();
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  try {
    const db = client.db(DEMO_DB_NAME);
    await db.dropDatabase();
    await createIndexes(db);

    const now = new Date();
    const orgId = new ObjectId();

    const org = {
      _id: orgId,
      name: ORG_NAME,
      adminId: null,
      defaultLanes: [],
      laneRestrictions: {
        nonEditable: ['applied', 'accepted', 'rejected'],
        nonDeletable: ['applied', 'accepted', 'rejected'],
      },
      openJobCards: DEFAULT_LANES.map((lane) => lane.name),
      customFields: {},
      tags: ORG_TAGS,
      createdAt: now,
      updatedAt: now,
    };

    const adminUserId = new ObjectId();
    const hrUserId = new ObjectId();
    const interviewerUserIds = [new ObjectId(), new ObjectId(), new ObjectId()];

    const interviewerSeeds = [
      { _id: interviewerUserIds[0], name: 'Arjun Kapoor' },
      { _id: interviewerUserIds[1], name: 'Neha Verma' },
      { _id: interviewerUserIds[2], name: 'Karan Desai' },
    ];

    const userSeeds = [
      {
        _id: adminUserId,
        organizationId: orgId,
        name: 'Rahul Mehta',
        email: demoStaffEmail('Rahul Mehta'),
        role: 'admin',
        refreshTokens: [],
        tokenVersion: 1,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: hrUserId,
        organizationId: orgId,
        name: 'Priya Sharma',
        email: demoStaffEmail('Priya Sharma'),
        role: 'hr',
        refreshTokens: [],
        tokenVersion: 1,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      },
      ...interviewerSeeds.map((seed) => ({
        _id: seed._id,
        organizationId: orgId,
        name: seed.name,
        email: demoStaffEmail(seed.name),
        role: 'interviewer',
        refreshTokens: [],
        tokenVersion: 1,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      })),
    ];

    const usersWithPasswords = await assignUniquePasswords(userSeeds);
    const users = usersWithPasswords.map(({ rawPassword, ...user }) => user);

    const interviewers = users.filter((user) => user.role === 'interviewer');

    org.adminId = adminUserId;

    const laneDocs = DEFAULT_LANES.map((lane, order) => {
      const restricted = lane.systemKey !== null;
      return {
        _id: new ObjectId(),
        organizationId: orgId,
        jobId: null,
        name: lane.name,
        systemKey: lane.systemKey,
        color: lane.color,
        order,
        isDefault: true,
        isEditable: !restricted,
        isDeletable: !restricted,
        isActive: true,
        metadata: {},
        createdBy: adminUserId,
        createdAt: now,
        updatedAt: now,
      };
    });

    org.defaultLanes = laneDocs.map((lane) => lane._id);

    const jobs = buildJobs(orgId, laneDocs, now);
    const organizationCustomFields = buildOrganizationCustomFields(jobs);
    org.customFields = organizationCustomFields;
    jobs.forEach((job) => {
      job.customFields = buildJobCustomFieldValues(job);
    });

    const jobLaneConfigDocs = buildJobLaneConfigs(
      jobs,
      laneDocs,
      orgId,
      adminUserId,
      now,
    );
    const jobLaneConfigByJobId = new Map(
      jobLaneConfigDocs.map((config) => [config.jobId.toString(), config]),
    );

    const orgIdStr = orgId.toString();

    const settingsDoc = {
      _id: new ObjectId(),
      organizationId: orgId.toString(),
      multipleOrg: false,
      fileStorage: {
        storageType: 'local',
        cloudinaryCloudName: '',
        cloudinaryApiSecret: '',
        cloudinaryApiKey: '',
        awsRegion: '',
        awsAccessKeyId: '',
        awsSecretAccessKey: '',
        awsBucketName: '',
      },
      mailConfig: {
        mailProvider: 'brevo',
        smtp_host: '',
        smtp_port: '',
        smtp_user: '',
        smtp_password: '',
        smtp_from: '',
        resend_api_key: '',
        resend_from: '',
        resend_reply_to: '',
        brevo_api_key: DEMO_BREVO_API_KEY,
        brevo_from: DEMO_BREVO_FROM,
        brevo_reply_to: DEMO_BREVO_REPLY_TO,
      },
      portalConfigs: {
        portalLogo: null,
        portalLogoDark: null,
        portalFavicon: null,
        portalHeader: null,
        portalFooter: null,
        portalName: PORTAL_NAME,
        primaryColor: '#6366f1',
        secondaryColor: '#8b5cf6',
      },
      aiProviders: {
        activeProvider: 'gemini',
        gemini: {
          api_key: encryptDemoSecret(DEMO_MAIN_GEMINI_API_KEY, orgIdStr),
          model: DEMO_MAIN_GEMINI_MODEL,
          customModel: '',
        },
        openai: { api_key: '', model: 'gpt-4o-mini', customModel: '' },
        anthropic: { api_key: '', model: 'claude-3-5-sonnet-20241022', customModel: '' },
        perplexity: { api_key: '', model: 'sonar-pro', customModel: '' },
      },
      bulkCvAi: {
        cvUploadPool: 'bulk',
        doclingParseUrl: '',
        groq: {
          api_key: encryptDemoSecret(DEMO_BULK_GROQ_API_KEY, orgIdStr),
          model: 'llama-3.1-8b-instant',
          customModel: '',
        },
        gemini: {
          api_key: encryptDemoSecret(DEMO_BULK_GEMINI_API_KEY, orgIdStr),
          model: 'gemini-2.5-flash-lite',
          customModel: '',
        },
        deepseek: { api_key: '', model: 'deepseek-chat', customModel: '' },
        openrouter: {
          api_key: encryptDemoSecret(DEMO_BULK_OPENROUTER_API_KEY, orgIdStr),
          model: 'openai/gpt-4o-mini',
          customModel: '',
        },
        cerebras: {
          api_key: encryptDemoSecret(DEMO_BULK_CEREBRAS_API_KEY, orgIdStr),
          model: 'gpt-oss-120b',
          customModel: '',
        },
        mistral: {
          api_key: encryptDemoSecret(DEMO_BULK_MISTRAL_API_KEY, orgIdStr),
          model: 'mistral-small-latest',
          customModel: '',
        },
      },
      timeZone: { name: 'Asia/Kolkata', offset: '+05:30' },
      emailTemplates: {},
      twoFA: { enable2FA: false },
      googleCalendar: {
        isConnected: false,
        clientId: DEMO_GOOGLE_CLIENT_ID,
        clientSecret: encryptDemoSecret(DEMO_GOOGLE_CLIENT_SECRET, orgIdStr),
        accessToken: '',
        refreshToken: '',
        expiryDate: null,
        connectedEmail: '',
      },
      zoom: {
        isConnected: true,
        accountId: 'zoom-account',
        clientId: 'zoom-client-id',
        clientSecret: '',
        accessToken: '',
        expiryDate: Date.now() + 3600000,
        connectedEmail: interviewers[0].email,
      },
      microsoftTeams: {
        isConnected: true,
        tenantId: 'hiretrack-demo-tenant',
        clientId: 'teams-client-id',
        clientSecret: '',
        accessToken: '',
        refreshToken: '',
        expiryDate: Date.now() + 3600000,
        connectedEmail: users[0].email,
      },
      onboardingStatus: { isCompleted: true, completedSteps: ['org', 'team', 'jobs'], skippedSteps: [], doNotShowAgain: true, currentStep: 3, lastUpdated: now },
      captcha: { enableCaptcha: false, captchaType: 'v2', captchaVariant: 'checkbox', siteKey: '', secretKey: '' },
      organizationEmailNotifications: { defaultSettings: {}, adminOverrides: {} },
      evaluationConfig: { temperature: 0.1, customPrompt: null, autoEvaluateAllCandidates: false, maxPdfPages: 4, enableComparativeRanking: false, enableConfidenceScores: true, enableRedFlagsDetection: true, enableSkillsMatrix: true },
      createdAt: now,
      updatedAt: now,
    };

    const candidateAccountSeeds = [
      { name: 'Sneha Patel', email: demoEmail('sneha.patel') },
      { name: 'Vikram Singh', email: demoEmail('vikram.singh') },
      { name: 'Ananya Iyer', email: demoEmail('ananya.iyer') },
    ];

    const candidateAccountSeedsWithIds = candidateAccountSeeds.map((account) => ({
      _id: new ObjectId(),
      organizationId: orgId,
      role: 'candidate',
      name: account.name,
      email: account.email,
      refreshTokens: [],
      tokenVersion: 1,
      isDeleted: false,
      appliedApplications: [],
      createdAt: now,
      updatedAt: now,
    }));

    const candidateAccountsWithPasswords = await assignUniquePasswords(
      candidateAccountSeedsWithIds,
    );
    const candidateAccounts = candidateAccountsWithPasswords.map(
      ({ rawPassword, ...account }) => account,
    );

    const laneByName = Object.fromEntries(laneDocs.map((lane) => [lane.name, lane._id]));
    const candidateDocs = [];
    const historyDocs = [];
    const emailHistoryDocs = [];
    let globalCandidateIndex = 0;

    const hrUser = users[1];
    const maxHistoryDate = getMaxHistoryDate();

    for (let jobIndex = 0; jobIndex < jobs.length; jobIndex += 1) {
      const selectedJob = jobs[jobIndex];
      const targetCount = JOB_CANDIDATE_TARGETS[jobIndex] || 30;

      for (let j = 0; j < targetCount; j += 1) {
        globalCandidateIndex += 1;
        const first = pick(FIRST_NAMES);
        const last = pick(LAST_NAMES);
        const name = `${first} ${last}`;
        const email = demoCandidateEmail(first, last, globalCandidateIndex);
        const statusName = pickStatusForCandidate();
        const createdAt = randomDateInPast(150, maxHistoryDate);
        const candidateId = new ObjectId();
        const interviewerUser = pick(interviewers);
        const interviewerUserId = interviewerUser._id;

        const skills = pickMany(
          [...SKILL_POOL, ...selectedJob.skills],
          4 + Math.floor(Math.random() * 3),
        );
        const experienceYears = Math.max(
          selectedJob.experience.min,
          1 + Math.floor(Math.random() * (selectedJob.experience.max || 10)),
        );
        const relevantExperience = Math.max(
          1,
          experienceYears - Math.floor(Math.random() * 2),
        );

        const engagement = buildCandidateEngagement(statusName);
        const { currentCTC, expectedCTC } = buildCandidateCtc(selectedJob.salary);
        const remarks = buildCandidateRemarks(
          engagement,
          statusName,
          createdAt,
          maxHistoryDate,
          hrUserId,
          interviewerUserId,
        );

        const followUpResult = buildCandidateFollowUp(
          statusName,
          createdAt,
          maxHistoryDate,
          hrUser,
        );

        const { checklistData, historyEntries: checklistHistoryEntries } =
          buildCandidateChecklists({
            statusName,
            createdAt,
            maxHistoryDate,
            jobLaneConfig: jobLaneConfigByJobId.get(selectedJob._id.toString()),
            candidateName: name,
            completedByUser: hrUser,
          });

        let history = buildCandidateHistory({
          statusName,
          createdAt,
          candidateName: name,
          candidateEmail: email,
          jobTitle: selectedJob.title,
          hrUserId,
          interviewerUserId,
          interviewerName: interviewerUser.name,
          hrName: hrUser.name,
          engagement,
          remarks,
          maxHistoryDate,
        });

        if (followUpResult) {
          history.push(followUpResult.historyEntry);
        }
        if (checklistHistoryEntries.length > 0) {
          history.push(...checklistHistoryEntries);
        }
        history.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
        history = history.map((entry) => ({
          ...entry,
          dateTime: clampToMaxDate(new Date(entry.dateTime), maxHistoryDate).toISOString(),
        }));

        const updatedAt = history.length > 0
          ? new Date(history[history.length - 1].dateTime)
          : createdAt;

        const assignedAt = clampToMaxDate(
          addHours(createdAt, 24 + Math.floor(Math.random() * 168)),
          maxHistoryDate,
        );

        const assignment = buildAssignment(
          engagement,
          interviewerUserId,
          name,
          selectedJob.title,
          assignedAt,
          email,
        );

        const scores = buildScores(statusName);

        const candidateDoc = {
          _id: candidateId,
          jobId: selectedJob._id,
          organizationId: orgId.toString(),
          name,
          email,
          contact: randomPhone(),
          location: pick(['Bengaluru', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi', 'Chennai', 'Gurugram']),
          experience: experienceYears,
          relevantExperience,
          skills,
          expectedCTC,
          currentCTC,
          noticePeriod: pick([15, 30, 45, 60, 90]),
          resume: buildResumeMeta(sharedResume, first, last),
          remarks,
          attachments: [],
          status: laneByName[statusName],
          tracking: {
            createdAt,
            updatedAt,
            assignedToJobDate: createdAt,
          },
          assignment,
          customFields: buildCandidateCustomFieldValues(
            organizationCustomFields,
            selectedJob,
            first,
            last,
            statusName,
          ),
          checklistData,
          isDeleted: false,
          createdAt,
          updatedAt,
        };

        if (followUpResult) {
          candidateDoc.followUp = followUpResult.followUp;
        }

        if (scores) {
          candidateDoc.scores = scores;
        }

        const tags = buildCandidateTags(ORG_TAGS);
        if (tags?.length) {
          candidateDoc.tags = tags;
        }

        candidateDocs.push(candidateDoc);

        historyDocs.push({
          _id: new ObjectId(),
          candidateId: candidateId.toString(),
          jobId: selectedJob._id,
          history,
        });

        if (engagement.hasEmailSent) {
          const sentAt = clampToMaxDate(
            addHours(createdAt, 72 + Math.floor(Math.random() * 120)),
            maxHistoryDate,
          );
          emailHistoryDocs.push(
            buildEmailHistoryDoc({
              orgId,
              sender: hrUser,
              candidate: { _id: candidateId, name, email },
              job: selectedJob,
              subject: `Interview update — ${selectedJob.title}`,
              body: `<p>Hi ${first},</p><p>Thank you for your interest in the <strong>${selectedJob.title}</strong> role at ${ORG_NAME}. Your profile has progressed to the next stage.</p><p>Our team will share calendar details shortly.</p><p>Regards,<br/>${hrUser.name}<br/>Talent Acquisition</p>`,
              sentAt,
            }),
          );
        }
      }
    }

    await db.collection('organizations').insertOne(org);
    await db.collection('users').insertMany(users);
    await db.collection('lanes').insertMany(laneDocs);
    await db.collection('jobs').insertMany(jobs);
    if (jobLaneConfigDocs.length > 0) {
      await db.collection('joblaneconfigs').insertMany(jobLaneConfigDocs);
    }
    await db.collection('settings').insertOne(settingsDoc);
    await db.collection('candidateaccounts').insertMany(candidateAccounts);
    await insertInBatches(db.collection('candidates'), candidateDocs);
    await insertInBatches(db.collection('histories'), historyDocs);
    if (emailHistoryDocs.length > 0) {
      await insertInBatches(db.collection('emailhistories'), emailHistoryDocs);
    }

    const candidatesByJob = jobs.map((job, index) => ({
      title: job.title,
      count: JOB_CANDIDATE_TARGETS[index] || 0,
    }));

    const credentials = {
      database: DEMO_DB_NAME,
      users: usersWithPasswords.map(({ role, email, rawPassword }) => ({
        role,
        email,
        password: rawPassword,
      })),
      candidateAccounts: candidateAccountsWithPasswords.map(
        ({ role, email, rawPassword }) => ({
          role,
          email,
          password: rawPassword,
        }),
      ),
      sharedResume: {
        source: SOURCE_RESUME_PATH,
        storedAs: sharedResume.name,
        url: sharedResume.url,
      },
    };

    const credsPath =
      process.env.HIRETRACK_CREDENTIALS_PATH ||
      path.join(PROJECT_ROOT, 'demo-seed-credentials.json');
    fs.writeFileSync(credsPath, JSON.stringify(credentials, null, 2), 'utf8');

    console.log('\nDemo DB generation complete.');
    console.log(`DB: ${DEMO_DB_NAME}`);
    console.log(`Organization: ${org.name}`);
    console.log(
      'Demo integrations: Brevo email, Google OAuth client, Gemini main AI, bulk CV pool (Groq, Gemini, OpenRouter, Cerebras, Mistral)',
    );
    console.log(`Jobs: ${jobs.length}`);
    console.log(`Jobs with checklists: ${jobLaneConfigDocs.length}`);
    jobLaneConfigDocs.forEach((config) => {
      const job = jobs.find((j) => j._id.toString() === config.jobId.toString());
      const laneSummary = config.laneConfigs
        .map((lc) => {
          const parts = [];
          if (lc.incomingChecklist) parts.push('in');
          if (lc.outgoingChecklist) parts.push('out');
          return `${lc.laneName} (${parts.join('+')})`;
        })
        .join(', ');
      console.log(`  - ${job?.title ?? config.jobId}: ${laneSummary}`);
    });
    console.log(`Candidates: ${candidateDocs.length}`);
    console.log(
      `Candidates with follow-up: ${candidateDocs.filter((c) => c.followUp).length}`,
    );
    console.log(
      `Candidates with checklist data: ${candidateDocs.filter((c) => Object.keys(c.checklistData || {}).length > 0).length}`,
    );
    console.log(
      `Candidates with tags: ${candidateDocs.filter((c) => c.tags?.length).length}`,
    );
    console.log(`Organization tags: ${ORG_TAGS.length}`);
    console.log(`Staff email domain: ${DEMO_STAFF_EMAIL_DOMAIN}`);
    console.log(`Candidate email domain: ${DEMO_EMAIL_DOMAIN} (non-deliverable)`);
    console.log(`Interviewers: ${interviewers.map((user) => user.email).join(', ')}`);
    console.log(`Email history records: ${emailHistoryDocs.length}`);
    console.log('Candidates per job:');
    candidatesByJob.forEach((row) => {
      console.log(`  - ${row.title}: ${row.count}`);
    });
    console.log(`Candidate Accounts: ${candidateAccounts.length}`);
    console.log(`Credentials file: ${credsPath}`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('\nDemo DB generation failed:', error);
  process.exit(1);
});
