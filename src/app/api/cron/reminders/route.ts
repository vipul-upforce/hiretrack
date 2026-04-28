import { NextRequest, NextResponse } from 'next/server';
import { processQueuedReminders } from '@/lib/followups/reminderQueue';
import { deliverFollowUpReminderNow } from '@/lib/followups/immediateReminder';
import { logger } from '@/lib/logger/logger.server';

const REMINDER_LATE_THRESHOLD_MS = Number(
  process.env.REMINDER_LATE_THRESHOLD_MS || '300000',
);

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

  try {
    const result = await processQueuedReminders(async (reminder) => {
      const lateByMs = Date.now() - reminder.scheduledAt.getTime();
      const isLate = lateByMs > REMINDER_LATE_THRESHOLD_MS;

      // followup is the first reminder type using this shared pipeline.
      await deliverFollowUpReminderNow({
        organizationId: reminder.organizationId,
        candidateName: reminder.candidateName,
        followUpDate: reminder.followUpDate,
        followUpNote: reminder.followUpNote,
        followUpUserId: reminder.followUpUserId,
        source: `${reminder.source}-worker`,
        deliveryMetadata: {
          isLate,
          lateByMs: isLate ? lateByMs : 0,
        },
      });
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error('Failed to process queued reminders from cron route', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to process reminders' },
      { status: 500 },
    );
  }
}
