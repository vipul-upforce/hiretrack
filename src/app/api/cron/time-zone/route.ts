import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logsRateLimiter } from '@/lib/rateLimiter';
import { logger } from '@/lib/logger/logger.server';

const execFileAsync = util.promisify(execFile);

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
 * Native Node.js "Double Bounce" Timezone Calculator.
 * Converts a target hour/minute in a specific timezone to the server's local cron time.
 */
function calculateLocalCronTime(targetTimezone: string, hour: number, minute: number) {
  const now = new Date();

  // 1. Get difference between target timezone and UTC in minutes
  const tzString = now.toLocaleString('en-US', { timeZone: targetTimezone });
  const tzDate = new Date(tzString);

  const utcString = now.toLocaleString('en-US', { timeZone: 'UTC' });
  const utcDate = new Date(utcString);

  const targetOffsetMinutes = Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);

  // 2. Convert the target time into strict UTC minutes
  const targetTotalMinutes = hour * 60 + minute;
  const utcTotalMinutes = targetTotalMinutes - targetOffsetMinutes;

  // 3. Convert UTC minutes into the Server's Local time
  // getTimezoneOffset() returns (UTC - Local) in minutes
  const localOffsetMinutes = now.getTimezoneOffset();
  let localTotalMinutes = utcTotalMinutes - localOffsetMinutes;

  // 4. Normalize minutes to wrap around the 24-hour boundary properly
  localTotalMinutes = ((localTotalMinutes % 1440) + 1440) % 1440;

  const localHour = Math.floor(localTotalMinutes / 60);
  const localMinute = localTotalMinutes % 60;

  return { localHour, localMinute };
}

/**
 * GET: Returns current schedule maintenance timezone.
 * Defaults to 'UTC' if not found or invalid.
 */
async function getCronTimezone(request: NextRequest) {
  const user = await getAuthenticatedUser(request, 'admin');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let currentCron = '';
    try {
      const { stdout } = await execFileAsync('crontab', ['-l']);
      currentCron = stdout ?? '';
    } catch {
      currentCron = '';
    }

    const tzLine = currentCron.split('\n').find((line) => line.startsWith('TZ='));
    let timezone = tzLine ? tzLine.replace(/^TZ=/, '').trim() : '';

    if (!isValidTimezone(timezone)) {
      timezone = 'UTC';
    }

    return NextResponse.json({ timezone });
  } catch (error) {
    logger.error({ err: error }, 'getCronTimezone failed');
    return NextResponse.json(
      { error: 'Failed to read schedule maintenance timezone' },
      { status: 500 }
    );
  }
}

/**
 * POST: Updates schedule maintenance timezone in crontab (Translates times dynamically).
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

  const timezone =
    body && typeof body === 'object' && 'timezone' in body
      ? (body as { timezone: string }).timezone
      : undefined;

  if (!isValidTimezone(timezone as string)) {
    return NextResponse.json(
      { error: 'Invalid timezone. Must be a valid IANA string (e.g., UTC, Asia/Kolkata).' },
      { status: 400 }
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

    // Strip out all the old stuff we are about to replace so we don't get duplicates
    const filteredCron = currentCron
      .split('\n')
      .filter((line) => {
        const tLine = line.trim();
        if (tLine === '') return false;
        if (tLine.startsWith('TZ=')) return false;
        if (tLine.includes('CRON_NAME:hiretrack-snapshot')) return false;
        if (tLine.includes('CRON_NAME:hiretrack-autoupdate')) return false;
        if (tLine.includes('take-snapshot.js')) return false;
        if (tLine.includes('installer.sh --update')) return false;
        return true;
      })
      .join('\n');

    // Calculate the localized hour/minute based on the UI selection
    const snapTime = calculateLocalCronTime(timezone as string, 2, 0);  // 02:00
    const updTime = calculateLocalCronTime(timezone as string, 2, 15);  // 02:15

    const homeDir = os.homedir();

    // Reconstruct the crontab exactly how the bash installer does it
    const newCronEntries = `
TZ=${timezone}
# CRON_NAME:hiretrack-snapshot
${snapTime.localMinute} ${snapTime.localHour} * * * PATH=/usr/local/bin:/usr/bin:/bin node ${homeDir}/.hiretrack/take-snapshot.js >> ${homeDir}/.hiretrack/logs/snapshot.log 2>&1
# CRON_NAME:hiretrack-autoupdate
${updTime.localMinute} ${updTime.localHour} * * * PATH=/usr/local/bin:/usr/bin:/bin ${homeDir}/.hiretrack/installer.sh --update >> ${homeDir}/.hiretrack/logs/cron_update.log 2>&1
`.trim();

    const finalCron = `${filteredCron}\n${newCronEntries}\n`;

    // Use a unique temp file to avoid collisions
    const tempFile = path.join(
      os.tmpdir(),
      `cron_temp_${Date.now()}_${Math.random().toString(36).substring(7)}`
    );

    await fs.writeFile(tempFile, finalCron, { mode: 0o600 });
    await execFileAsync('crontab', [tempFile]);
    await fs.unlink(tempFile);

    logger.info({ timezone, userId: user.id }, 'Schedule maintenance timezone updated via UI');

    return NextResponse.json({ success: true, timezone });
  } catch (error) {
    logger.error({ err: error, timezone }, 'updateCronTimezone failed');
    return NextResponse.json(
      { error: 'Failed to update schedule maintenance timezone' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return logsRateLimiter(request, getCronTimezone);
}

export async function POST(request: NextRequest) {
  return logsRateLimiter(request, updateCronTimezone);
}