import { NextRequest, NextResponse } from 'next/server';
import { processQueuedReminders } from '@/lib/followups/reminderQueue';
import {
  deliverAssignmentReminderNow,
  deliverFollowUpReminderNow,
} from '@/lib/followups/immediateReminder';
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
      logger.info('Cron delivering queued reminder', {
        reminderType: reminder.reminderType,
        source: reminder.source,
        organizationId: reminder.organizationId,
        candidateId: reminder.candidateId || '',
        recipientUserId: reminder.followUpUserId,
      });

      if (reminder.reminderType === 'assignment') {
        await deliverAssignmentReminderNow({
          organizationId: reminder.organizationId,
          candidateName: reminder.candidateName,
          candidateId: reminder.candidateId || null,
          assignmentTime: reminder.reminderAt,
          assignmentNote: reminder.followUpNote || null,
          assignmentUserId: reminder.followUpUserId,
          source: `${reminder.source}-worker`,
          deliveryMetadata: {
            isLate,
            lateByMs: isLate ? lateByMs : 0,
          },
        });
      } else {
        await deliverFollowUpReminderNow({
          organizationId: reminder.organizationId,
          candidateName: reminder.candidateName,
          candidateId: reminder.candidateId || null,
          followUpDate: reminder.followUpDate,
          scheduledAt: reminder.scheduledAt,
          offsetMinutesUsed: reminder.offsetMinutesUsed,
          followUpNote: reminder.followUpNote,
          followUpUserId: reminder.followUpUserId,
          source: `${reminder.source}-worker`,
          deliveryMetadata: {
            isLate,
            lateByMs: isLate ? lateByMs : 0,
          },
        });
      }
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
