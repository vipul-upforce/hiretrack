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
    // Intl.DateTimeFormat throws an error if the timeZone is invalid
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
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
      // If crontab is empty, this throws. We catch it and assume empty string.
      const { stdout } = await execFileAsync('crontab', ['-l']);
      currentCron = stdout ?? '';
    } catch {
      currentCron = '';
    }

    // 1. Try to find the specific TZ line
    const tzLine = currentCron
      .split('\n')
      .find((line) => line.startsWith('TZ='));

    // 2. Extract value
    let timezone = tzLine ? tzLine.replace(/^TZ=/, '').trim() : '';

    // 3. Validate. Fallback to 'UTC' if invalid/missing.
    if (!isValidTimezone(timezone)) {
      timezone = 'UTC';
    }

    return NextResponse.json({ timezone });
  } catch (error) {
    logger.error({ err: error }, 'getCronTimezone failed');
    return NextResponse.json(
      { error: 'Failed to read schedule maintenance timezone' },
      { status: 500 },
    );
  }
}

/**
 * POST: Updates schedule maintenance timezone in crontab (TZ= line).
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
      ? (body as { timezone: unknown }).timezone
      : undefined;

  // Strict validation using dynamic Intl check
  if (!isValidTimezone(timezone as string)) {
    return NextResponse.json(
      {
        error:
          'Invalid timezone. Must be a valid IANA string (e.g., UTC, Asia/Kolkata).',
      },
      { status: 400 },
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

    // Remove existing TZ line if present
    const filteredCron = currentCron
      .split('\n')
      .filter((line) => line.trim() !== '' && !line.startsWith('TZ='))
      .join('\n');

    // Prepend new TZ line
    const finalCron = `TZ=${timezone}\n${filteredCron}\n`;

    // Use a unique temp file to avoid collisions
    const tempFile = path.join(
      os.tmpdir(),
      `cron_temp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    );

    await fs.writeFile(tempFile, finalCron, { mode: 0o600 });
    await execFileAsync('crontab', [tempFile]);
    await fs.unlink(tempFile);

    logger.info(
      { timezone, userId: user.id },
      'Schedule maintenance timezone updated',
    );

    return NextResponse.json({ success: true, timezone });
  } catch (error) {
    logger.error({ err: error, timezone }, 'updateCronTimezone failed');
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
