import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import moment from 'moment-timezone';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logsRateLimiter } from '@/lib/rateLimiter';
import { logger } from '@/lib/logger/logger.server';

const execFileAsync = util.promisify(execFile);

const HIRETRACK_DIR = path.join(os.homedir(), '.hiretrack');
const HIRETRACK_CONFIG_PATH = path.join(HIRETRACK_DIR, 'config.json');
const SCRIPT_PATH = path.join(HIRETRACK_DIR, 'installer.sh');
const SNAPSHOT_SCRIPT = path.join(HIRETRACK_DIR, 'take-snapshot.js');
const LOG_DIR = path.join(HIRETRACK_DIR, 'logs');
const CRON_LOG_FILE = path.join(LOG_DIR, 'cron_update.log');
const SNAPSHOT_LOG_FILE = path.join(LOG_DIR, 'snapshot.log');

/**
 * Validates a timezone string dynamically using the runtime's Intl API.
 */
function isValidTimezone(tz: string): boolean {
  try {
    if (!tz || typeof tz !== 'string') return false;
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Mirrors installer `setup_cron`: wall clock in maintenance TZ → same instant in
 * server-local timezone → cron minute and hour (GNU `%M %H` style).
 */
function maintenanceZonedTimeToServerCronMinuteHour(
  maintenanceTz: string,
  hour: number,
  minute: number,
): string {
  const wall = moment().tz(maintenanceTz).set({
    hour,
    minute,
    second: 0,
    millisecond: 0,
  });
  const d = wall.toDate();
  const mm = String(d.getMinutes()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  return `${mm} ${hh}`;
}

/**
 * Same line-removal filter as installer `setup_cron` (grep -v ...).
 */
function stripHiretrackManagedCronLines(crontext: string): string {
  return crontext
    .split('\n')
    .filter(
      (line) =>
        !line.includes('hiretrack-autoupdate') &&
        !line.includes('hiretrack-snapshot') &&
        !line.includes('take-snapshot.js') &&
        !line.includes('installer.sh --update') &&
        !line.includes('pm2 resurrect'),
    )
    .join('\n');
}

async function resolvePm2Bin(): Promise<string> {
  try {
    const { stdout } = await execFileAsync('/bin/sh', [
      '-c',
      'command -v pm2 2>/dev/null || echo /usr/local/bin/pm2',
    ]);
    const line = (stdout ?? '').trim().split('\n')[0]?.trim();
    return line || '/usr/local/bin/pm2';
  } catch {
    return '/usr/local/bin/pm2';
  }
}

async function readMaintenanceTimezoneFromConfig(): Promise<string | null> {
  try {
    const raw = await fs.readFile(HIRETRACK_CONFIG_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'maintenanceTimezone' in parsed
    ) {
      const v = (parsed as { maintenanceTimezone: unknown })
        .maintenanceTimezone;
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (trimmed && isValidTimezone(trimmed)) {
          return trimmed;
        }
      }
    }
  } catch {
    // missing or unreadable config
  }
  return null;
}

async function persistMaintenanceTimezone(tz: string): Promise<void> {
  try {
    const raw = await fs.readFile(HIRETRACK_CONFIG_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return;
    }
    const next = { ...parsed, maintenanceTimezone: tz };
    await fs.writeFile(
      HIRETRACK_CONFIG_PATH,
      `${JSON.stringify(next, null, 2)}\n`,
      'utf8',
    );
  } catch {
    // no config or parse error — skip
  }
}

/**
 * GET: Returns current schedule maintenance timezone.
 * Prefers `maintenanceTimezone` in ~/.hiretrack/config.json (set on POST);
 * falls back to legacy crontab `TZ=` line.
 */
async function getCronTimezone(request: NextRequest) {
  const user = await getAuthenticatedUser(request, 'admin');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const fromConfig = await readMaintenanceTimezoneFromConfig();
    if (fromConfig) {
      return NextResponse.json({ timezone: fromConfig });
    }

    let currentCron = '';
    try {
      const { stdout } = await execFileAsync('crontab', ['-l']);
      currentCron = stdout ?? '';
    } catch {
      currentCron = '';
    }

    const tzLine = currentCron
      .split('\n')
      .find((line) => line.startsWith('TZ='));

    let timezone = tzLine ? tzLine.replace(/^TZ=/, '').trim() : '';

    if (!isValidTimezone(timezone)) {
      timezone = 'UTC';
    }

    return NextResponse.json({ timezone });
  } catch (error) {
    logger.error('getCronTimezone failed', { error });
    return NextResponse.json(
      { error: 'Failed to read schedule maintenance timezone' },
      { status: 500 },
    );
  }
}

/**
 * POST: Same outcome as installer `setup_cron` — recomputes snapshot (02:00)
 * and auto-update (02:15) in the chosen IANA zone, maps to server-local cron
 * fields, and rewrites hiretrack + pm2 lines in crontab.
 */
async function updateCronTimezone(request: NextRequest) {
  const user = await getAuthenticatedUser(request, 'admin');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const tzRaw =
    body && typeof body === 'object' && 'timezone' in body
      ? (body as { timezone: unknown }).timezone
      : undefined;

  if (typeof tzRaw !== 'string' || !isValidTimezone(tzRaw)) {
    return NextResponse.json(
      {
        error:
          'Invalid timezone. Must be a valid IANA string (e.g., UTC, Asia/Kolkata).',
      },
      { status: 400 },
    );
  }

  const timezone = tzRaw;

  if (process.platform === 'win32') {
    return NextResponse.json(
      {
        error:
          'Schedule maintenance timezone is only supported on Linux and macOS hosts.',
      },
      { status: 501 },
    );
  }

  try {
    let currentCron = '';
    try {
      const { stdout } = await execFileAsync('crontab', ['-l']);
      currentCron = stdout ?? '';
    } catch {
      currentCron = '';
    }

    const snapCron = maintenanceZonedTimeToServerCronMinuteHour(
      timezone,
      2,
      0,
    );
    const updCron = maintenanceZonedTimeToServerCronMinuteHour(
      timezone,
      2,
      15,
    );

    const pm2Bin = await resolvePm2Bin();
    const pm2RebootLine = `@reboot ${pm2Bin} resurrect >> ${path.join(os.homedir(), 'pm2-startup.log')} 2>&1`;

    const snapshotCronEntry = `${snapCron} * * * PATH=/usr/local/bin:/usr/bin:/bin node ${SNAPSHOT_SCRIPT} >> ${SNAPSHOT_LOG_FILE} 2>&1`;
    const updateCronEntry = `${updCron} * * * PATH=/usr/local/bin:/usr/bin:/bin ${SCRIPT_PATH} --update >> ${CRON_LOG_FILE} 2>&1`;

    const base = stripHiretrackManagedCronLines(currentCron).replace(/\s*$/, '');
    const finalCron = `${[
      base,
      '# CRON_NAME:hiretrack-snapshot',
      snapshotCronEntry,
      '# CRON_NAME:hiretrack-autoupdate',
      updateCronEntry,
      pm2RebootLine,
    ].join('\n')}\n`;

    const tempFile = path.join(
      os.tmpdir(),
      `cron_ht_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    );
    await fs.writeFile(tempFile, finalCron, { mode: 0o600 });
    await execFileAsync('crontab', [tempFile]);
    await fs.unlink(tempFile);

    await persistMaintenanceTimezone(timezone);

    logger.info('Schedule maintenance timezone updated (cron recomputed)', {
      timezone,
      userId: user.id,
    });

    return NextResponse.json({ success: true, timezone });
  } catch (error) {
    logger.error('updateCronTimezone failed', { error, timezone });
    return NextResponse.json(
      { error: 'Failed to update schedule maintenance timezone' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return logsRateLimiter(request, getCronTimezone);
}

export async function POST(request: NextRequest) {
  return logsRateLimiter(request, updateCronTimezone);
}
