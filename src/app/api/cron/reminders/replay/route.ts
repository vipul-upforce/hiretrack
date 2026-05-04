import { NextRequest, NextResponse } from 'next/server';
import { replayFailedReminders } from '@/lib/followups/reminderQueue';
import { logger } from '@/lib/logger/logger.server';

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  const headerSecret = request.headers.get('x-cron-secret');
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : '';

  return headerSecret === cronSecret || bearerToken === cronSecret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const payload =
    body && typeof body === 'object'
      ? (body as {
          organizationId?: string;
          reminderIds?: string[];
          limit?: number;
        })
      : {};

  try {
    const result = await replayFailedReminders({
      organizationId: payload.organizationId,
      reminderIds: payload.reminderIds,
      limit: payload.limit,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error('Failed to replay failed reminders', { error, payload });
    return NextResponse.json(
      { success: false, error: 'Failed to replay failed reminders' },
      { status: 500 },
    );
  }
}
