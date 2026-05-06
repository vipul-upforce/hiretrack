import { execFile } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { logger } from '@/lib/logger/logger.server';

const execFileAsync = util.promisify(execFile);

/** Same marker as installer.sh `hiretrack-reminders-ping`. */
export const REMINDERS_PING_CRON_MARKER = 'hiretrack-reminders-ping';

/**
 * Enables or disables the reminders ping crontab line by toggling a leading `#`
 * before the `* * * * *` schedule. Only lines containing {@link REMINDERS_PING_CRON_MARKER} are changed.
 */
export function applyRemindersPingLineState(
  crontabText: string,
  enabled: boolean,
): { text: string; found: boolean } {
  let found = false;
  const next = crontabText.split('\n').map((line) => {
    if (!line.includes(REMINDERS_PING_CRON_MARKER)) {
      return line;
    }
    found = true;
    const trimmedStart = line.replace(/^\s+/, '');
    if (enabled) {
      if (trimmedStart.startsWith('#')) {
        return line.replace(/^\s*#\s*(?=\*)/, '');
      }
      return line;
    }
    if (trimmedStart.startsWith('#')) {
      return line;
    }
    return `# ${trimmedStart}`;
  });
  return { text: next.join('\n'), found };
}

export type SyncRemindersPingCrontabResult = {
  ok: boolean;
  found: boolean;
  error?: string;
};

/**
 * Updates the current user's crontab so the reminders ping line is active or commented-out.
 * No-op on Windows. If no line contains the marker, returns `found: false`.
 */
export async function syncRemindersPingCrontab(
  enabled: boolean,
): Promise<SyncRemindersPingCrontabResult> {
  if (process.platform === 'win32') {
    return { ok: true, found: false };
  }

  let current = '';
  try {
    const { stdout } = await execFileAsync('crontab', ['-l']);
    current = stdout ?? '';
  } catch {
    current = '';
  }

  const { text, found } = applyRemindersPingLineState(current, enabled);
  if (!found) {
    return {
      ok: false,
      found: false,
      error:
        'No hiretrack reminders ping line in crontab. Run the installer after BASE_URL is set, then try again.',
    };
  }

  const normalized = text.endsWith('\n') ? text : `${text}\n`;
  const tempFile = path.join(
    os.tmpdir(),
    `cron_rem_ping_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  );
  try {
    await fs.writeFile(tempFile, normalized, { mode: 0o600 });
    await execFileAsync('crontab', [tempFile]);
    return { ok: true, found: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('syncRemindersPingCrontab failed', { error: err, enabled });
    return { ok: false, found: true, error: message };
  } finally {
    await fs.unlink(tempFile).catch(() => undefined);
  }
}
