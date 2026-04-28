import { NextRequest, NextResponse } from 'next/server';
import { getReminderQueueStats } from '@/lib/followups/reminderQueue';
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

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await getReminderQueueStats();
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    logger.error('Failed to fetch reminder queue stats', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reminder queue stats' },
      { status: 500 },
    );
  }
}
