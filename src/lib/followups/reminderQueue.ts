import crypto from 'crypto';
import connectToDatabase, { ScheduledReminder, Settings } from '@/lib/mongodb';
import { logger } from '@/lib/logger/logger.server';
import type { ScheduledReminderType } from '@/lib/models/scheduledReminder';

export interface QueueReminderInput {
  organizationId: string;
  candidateId: string;
  candidateName: string;
  followUpDate?: Date | string | null;
  followUpNote?: string | null;
  followUpUserId?: string | null;
  source: string;
}

export interface QueueAssignmentReminderInput {
  organizationId: string;
  candidateId: string;
  candidateName: string;
  assignmentTime?: Date | string | null;
  assignmentNote?: string | null;
  recipientUserId?: string | null;
  jobId?: string | null;
  source: string;
}

export interface QueuedReminder {
  queued: true;
  reminderId: string;
  scheduledAt: Date;
  offsetMinutesUsed: number;
}

const DEFAULT_OFFSET_MINUTES = Number(
  process.env.REMINDER_OFFSET_MINUTES ||
    process.env.FOLLOWUP_REMINDER_OFFSET_MINUTES ||
    '5',
);
const LOCK_TTL_MS = Number(
  process.env.REMINDER_LOCK_TTL_MS ||
    process.env.FOLLOWUP_REMINDER_LOCK_TTL_MS ||
    '120000',
);
const PROCESS_BATCH_SIZE = Number(
  process.env.REMINDER_BATCH_SIZE ||
    process.env.FOLLOWUP_REMINDER_BATCH_SIZE ||
    '25',
);
const RETRY_BASE_DELAY_MS = Number(
  process.env.REMINDER_RETRY_BASE_MS ||
    process.env.FOLLOWUP_REMINDER_RETRY_BASE_MS ||
    '60000',
);
const COMPLETED_TTL_DAYS = Number(
  process.env.REMINDER_COMPLETED_TTL_DAYS ||
    process.env.FOLLOWUP_REMINDER_COMPLETED_TTL_DAYS ||
    '7',
);
const REMINDER_LAG_ALERT_MS = Number(
  process.env.REMINDER_LAG_ALERT_MS || '600000',
);
const MAX_OFFSET_MINUTES = 1440;

function normalizeErrorCode(errorMessage: string) {
  const normalized = errorMessage.toLowerCase();
  if (
    normalized.includes('status=404') ||
    normalized.includes('does not exist') ||
    normalized.includes('failed to resolve microsoft teams user') ||
    normalized.includes('resource') ||
    normalized.includes('recipient')
  ) {
    return 'recipient_resolution_failed';
  }
  if (normalized.includes('invalid_grant')) return 'provider_auth_failed';
  if (normalized.includes('throttl') || normalized.includes('status=429')) {
    return 'provider_throttled';
  }
  if (normalized.includes('tenant')) return 'tenant_resolution_failed';
  if (normalized.includes('auth')) return 'provider_auth_failed';
  if (normalized.includes('timeout') || normalized.includes('timed out')) {
    return 'provider_timeout';
  }
  if (normalized.includes('status=5')) return 'provider_unavailable';
  return 'unknown_error';
}

function isNonRetryableErrorCode(errorCode: string) {
  return [
    'recipient_resolution_failed',
    'tenant_resolution_failed',
    'provider_auth_failed',
  ].includes(errorCode);
}

function asDate(value?: Date | string | null) {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function normalizeOffsetMinutes(value: unknown) {
  const numericValue =
    typeof value === 'number'
      ? value
      : Number.parseInt(String(value ?? '').trim(), 10);

  if (!Number.isFinite(numericValue) || Number.isNaN(numericValue)) {
    return DEFAULT_OFFSET_MINUTES;
  }

  const integerValue = Math.trunc(numericValue);
  if (integerValue < 0) {
    return 0;
  }
  if (integerValue > MAX_OFFSET_MINUTES) {
    return MAX_OFFSET_MINUTES;
  }
  return integerValue;
}

async function getReminderOffsetMinutes(organizationId: string) {
  if (!Settings) {
    return normalizeOffsetMinutes(DEFAULT_OFFSET_MINUTES);
  }

  const settingsDoc = await Settings.findOne({ organizationId })
    .select('microsoftTeams.followUpReminderOffsetMinutes')
    .lean();

  return normalizeOffsetMinutes(
    settingsDoc?.microsoftTeams?.followUpReminderOffsetMinutes,
  );
}

function calculateScheduledAt(followUpDate: Date, offsetMinutes: number) {
  const now = new Date();
  const scheduled = new Date(
    followUpDate.getTime() - offsetMinutes * 60 * 1000,
  );
  return scheduled.getTime() < now.getTime() ? now : scheduled;
}

function buildIdempotencyKey(input: {
  organizationId: string;
  candidateId: string;
  reminderType: ScheduledReminderType;
}) {
  const raw = [
    input.organizationId,
    input.reminderType,
    input.candidateId,
  ].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function upsertReminder(params: {
  reminderType: ScheduledReminderType;
  organizationId: string;
  candidateId: string;
  candidateName: string;
  recipientUserId: string;
  reminderAt: Date;
  offsetMinutesUsed: number;
  source: string;
  payload: Record<string, unknown>;
}) {
  if (!ScheduledReminder) {
    throw new Error('ScheduledReminder model is not available');
  }

  const scheduledAt = calculateScheduledAt(
    params.reminderAt,
    params.offsetMinutesUsed,
  );
  const idempotencyKey = buildIdempotencyKey({
    organizationId: params.organizationId,
    candidateId: params.candidateId,
    reminderType: params.reminderType,
  });

  const queuedReminder = await ScheduledReminder.findOneAndUpdate(
    { idempotencyKey },
    {
      $set: {
        organizationId: params.organizationId,
        reminderType: params.reminderType,
        recipientUserId: params.recipientUserId,
        title: params.candidateName,
        reminderAt: params.reminderAt,
        offsetMinutesUsed: params.offsetMinutesUsed,
        payload: params.payload,
        source: params.source,
        scheduledAt,
        nextAttemptAt: scheduledAt,
        status: 'pending',
        maxAttempts: 5,
        expireAt: null,
        lastError: null,
      },
      $setOnInsert: {
        attemptCount: 0,
      },
    },
    { upsert: true, new: true },
  )
    .select('_id scheduledAt')
    .lean();

  if (!queuedReminder?._id || !queuedReminder.scheduledAt) {
    throw new Error('Failed to queue reminder');
  }

  await ScheduledReminder.updateMany(
    {
      organizationId: params.organizationId,
      reminderType: params.reminderType,
      status: { $in: ['pending', 'processing'] },
      'payload.candidateId': params.candidateId,
      _id: { $ne: queuedReminder._id },
    },
    {
      $set: {
        status: 'cancelled',
        lockToken: null,
        lockedAt: null,
        lockExpiresAt: null,
        deliveryKey: null,
        deliveryAttemptedAt: null,
        expireAt: getExpirationDate(COMPLETED_TTL_DAYS),
      },
    },
  );

  return {
    queued: true as const,
    reminderId: String(queuedReminder._id),
    scheduledAt: new Date(queuedReminder.scheduledAt),
    offsetMinutesUsed: params.offsetMinutesUsed,
  };
}

export async function queueReminder(
  input: QueueReminderInput,
): Promise<QueuedReminder> {
  await connectToDatabase();
  if (!input.followUpUserId) {
    throw new Error('followUpUserId is required to queue reminder');
  }

  const normalizedDate = asDate(input.followUpDate);
  const offsetMinutesUsed = await getReminderOffsetMinutes(input.organizationId);
  return upsertReminder({
    reminderType: 'followup',
    organizationId: input.organizationId,
    candidateId: input.candidateId,
    candidateName: input.candidateName,
    recipientUserId: input.followUpUserId,
    reminderAt: normalizedDate,
    offsetMinutesUsed,
    source: input.source,
    payload: {
      candidateId: input.candidateId,
      followUpNote: input.followUpNote || '',
    },
  });
}

export async function queueAssignmentReminder(
  input: QueueAssignmentReminderInput,
): Promise<QueuedReminder> {
  await connectToDatabase();
  if (!input.recipientUserId) {
    throw new Error('recipientUserId is required to queue assignment reminder');
  }
  const normalizedDate = asDate(input.assignmentTime);
  const offsetMinutesUsed = await getReminderOffsetMinutes(input.organizationId);
  return upsertReminder({
    reminderType: 'assignment',
    organizationId: input.organizationId,
    candidateId: input.candidateId,
    candidateName: input.candidateName,
    recipientUserId: input.recipientUserId,
    reminderAt: normalizedDate,
    offsetMinutesUsed,
    source: input.source,
    payload: {
      candidateId: input.candidateId,
      jobId: input.jobId || '',
      assignmentNote: input.assignmentNote || '',
    },
  });
}

export async function cancelPendingFollowUpRemindersForCandidate(params: {
  organizationId: string;
  candidateId: string;
}) {
  return cancelPendingFollowUpRemindersForCandidates({
    organizationId: params.organizationId,
    candidateIds: [params.candidateId],
  });
}

export async function cancelPendingFollowUpRemindersForCandidates(params: {
  organizationId: string;
  candidateIds: string[];
}) {
  await connectToDatabase();
  if (!ScheduledReminder) {
    throw new Error('ScheduledReminder model is not available');
  }

  const candidateIds = params.candidateIds.filter(Boolean);
  if (candidateIds.length === 0) {
    return { matchedCount: 0, cancelledCount: 0 };
  }

  const result = await ScheduledReminder.updateMany(
    {
      organizationId: params.organizationId,
      reminderType: 'followup',
      status: { $in: ['pending', 'processing'] },
      'payload.candidateId': { $in: candidateIds },
    },
    {
      $set: {
        status: 'cancelled',
        lockToken: null,
        lockedAt: null,
        lockExpiresAt: null,
        deliveryKey: null,
        deliveryAttemptedAt: null,
        lastError: null,
        lastErrorCode: null,
        expireAt: getExpirationDate(COMPLETED_TTL_DAYS),
      },
    },
  );

  return {
    matchedCount: result.matchedCount || 0,
    cancelledCount: result.modifiedCount || 0,
  };
}

export async function cancelPendingAssignmentRemindersForCandidate(params: {
  organizationId: string;
  candidateId: string;
}) {
  return cancelPendingAssignmentRemindersForCandidates({
    organizationId: params.organizationId,
    candidateIds: [params.candidateId],
  });
}

export async function cancelPendingAssignmentRemindersForCandidates(params: {
  organizationId: string;
  candidateIds: string[];
}) {
  await connectToDatabase();
  if (!ScheduledReminder) {
    throw new Error('ScheduledReminder model is not available');
  }
  const candidateIds = params.candidateIds.filter(Boolean);
  if (candidateIds.length === 0) {
    return { matchedCount: 0, cancelledCount: 0 };
  }
  const result = await ScheduledReminder.updateMany(
    {
      organizationId: params.organizationId,
      reminderType: 'assignment',
      status: { $in: ['pending', 'processing'] },
      'payload.candidateId': { $in: candidateIds },
    },
    {
      $set: {
        status: 'cancelled',
        lockToken: null,
        lockedAt: null,
        lockExpiresAt: null,
        deliveryKey: null,
        deliveryAttemptedAt: null,
        lastError: null,
        lastErrorCode: null,
        expireAt: getExpirationDate(COMPLETED_TTL_DAYS),
      },
    },
  );
  return {
    matchedCount: result.matchedCount || 0,
    cancelledCount: result.modifiedCount || 0,
  };
}

export async function claimDueReminder(workerId: string) {
  await connectToDatabase();
  if (!ScheduledReminder) {
    throw new Error('ScheduledReminder model is not available');
  }

  const now = new Date();
  const lockExpiresAt = new Date(now.getTime() + LOCK_TTL_MS);
  return ScheduledReminder.findOneAndUpdate(
    {
      $or: [
        {
          status: 'pending',
          nextAttemptAt: { $lte: now },
        },
        {
          status: 'processing',
          lockExpiresAt: { $lte: now },
        },
      ],
    },
    [
      {
        $set: {
          reclaimCount: {
            $cond: [
              { $eq: ['$status', 'processing'] },
              { $add: [{ $ifNull: ['$reclaimCount', 0] }, 1] },
              { $ifNull: ['$reclaimCount', 0] },
            ],
          },
          status: 'processing',
          lockToken: workerId,
          lockedAt: now,
          lockExpiresAt,
        },
      },
    ],
    {
      sort: { nextAttemptAt: 1, createdAt: 1 },
      new: true,
    },
  ).lean();
}

function getRetryDelayMs(attemptCount: number) {
  return RETRY_BASE_DELAY_MS * Math.max(1, 2 ** Math.max(0, attemptCount - 1));
}

function getExpirationDate(daysFromNow: number) {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
}

export async function markReminderSent(reminderId: string) {
  await connectToDatabase();
  if (!ScheduledReminder) {
    throw new Error('ScheduledReminder model is not available');
  }

  await ScheduledReminder.updateOne(
    { _id: reminderId },
    {
      $set: {
        status: 'sent',
        sentAt: new Date(),
        lockToken: null,
        lockedAt: null,
        lockExpiresAt: null,
        lastError: null,
        lastErrorCode: null,
        deliveryKey: null,
        deliveryAttemptedAt: null,
        expireAt: getExpirationDate(COMPLETED_TTL_DAYS),
      },
    },
  );
}

export async function markReminderFailed(params: {
  reminderId: string;
  attemptCount: number;
  maxAttempts: number;
  errorMessage: string;
}) {
  await connectToDatabase();
  if (!ScheduledReminder) {
    throw new Error('ScheduledReminder model is not available');
  }

  const nextAttemptCount = params.attemptCount + 1;
  const errorCode = normalizeErrorCode(params.errorMessage);
  const nonRetryable = isNonRetryableErrorCode(errorCode);
  const exhausted = nonRetryable || nextAttemptCount >= params.maxAttempts;
  const nextAttemptAt = exhausted
    ? null
    : new Date(Date.now() + getRetryDelayMs(nextAttemptCount));

  await ScheduledReminder.updateOne(
    { _id: params.reminderId },
    {
      $set: {
        status: exhausted ? 'failed' : 'pending',
        attemptCount: nextAttemptCount,
        nextAttemptAt,
        lastError: params.errorMessage,
        lastErrorCode: errorCode,
        lockToken: null,
        lockedAt: null,
        lockExpiresAt: null,
        deliveryKey: null,
        deliveryAttemptedAt: null,
        expireAt: exhausted ? getExpirationDate(COMPLETED_TTL_DAYS) : null,
      },
    },
  );

  if (nonRetryable) {
    logger.error('Reminder marked failed without retry (non-retryable error)', {
      reminderId: params.reminderId,
      errorCode,
      errorMessage: params.errorMessage,
    });
  }
}

export async function markReminderDelivering(reminderId: string) {
  await connectToDatabase();
  if (!ScheduledReminder) {
    throw new Error('ScheduledReminder model is not available');
  }

  const deliveryKey = crypto.randomUUID();
  const updateResult = await ScheduledReminder.findOneAndUpdate(
    {
      _id: reminderId,
      status: 'processing',
      sentAt: { $exists: false },
      $or: [{ deliveryKey: { $exists: false } }, { deliveryKey: null }],
    },
    {
      $set: {
        deliveryKey,
        deliveryAttemptedAt: new Date(),
      },
    },
    {
      new: true,
    },
  )
    .select('_id deliveryKey')
    .lean();

  return {
    shouldSend: !!updateResult?._id,
    deliveryKey: updateResult?.deliveryKey || deliveryKey,
  };
}

export async function getReminderQueueStats() {
  await connectToDatabase();
  if (!ScheduledReminder) {
    throw new Error('ScheduledReminder model is not available');
  }

  const now = new Date();
  const [pendingCount, dueCount, processingCount, failedCount, oldestDue, byOrg] =
    await Promise.all([
      ScheduledReminder.countDocuments({ status: 'pending' }),
      ScheduledReminder.countDocuments({
        status: 'pending',
        nextAttemptAt: { $lte: now },
      }),
      ScheduledReminder.countDocuments({ status: 'processing' }),
      ScheduledReminder.countDocuments({ status: 'failed' }),
      ScheduledReminder.findOne({
        status: 'pending',
        nextAttemptAt: { $lte: now },
      })
        .select('_id nextAttemptAt organizationId')
        .sort({ nextAttemptAt: 1 })
        .lean(),
      ScheduledReminder.aggregate([
        {
          $match: {
            status: 'pending',
          },
        },
        {
          $group: {
            _id: '$organizationId',
            pendingCount: { $sum: 1 },
            dueCount: {
              $sum: {
                $cond: [{ $lte: ['$nextAttemptAt', now] }, 1, 0],
              },
            },
          },
        },
        {
          $sort: {
            dueCount: -1,
            pendingCount: -1,
          },
        },
        {
          $limit: 10,
        },
      ]),
    ]);

  const oldestDueLagMs =
    oldestDue?.nextAttemptAt instanceof Date
      ? now.getTime() - oldestDue.nextAttemptAt.getTime()
      : null;

  return {
    pendingCount,
    dueCount,
    processingCount,
    failedCount,
    oldestDueReminderId: oldestDue?._id ? String(oldestDue._id) : null,
    oldestDueOrganizationId: oldestDue?.organizationId || null,
    oldestDueLagMs,
    perOrganizationPending: byOrg.map((entry) => ({
      organizationId: String(entry._id),
      pendingCount: Number(entry.pendingCount || 0),
      dueCount: Number(entry.dueCount || 0),
    })),
  };
}

export async function replayFailedReminders(params: {
  organizationId?: string;
  reminderIds?: string[];
  limit?: number;
}) {
  await connectToDatabase();
  if (!ScheduledReminder) {
    throw new Error('ScheduledReminder model is not available');
  }

  const limit = Math.max(1, Math.min(params.limit || 100, 500));
  const failedFilter: Record<string, unknown> = {
    status: 'failed',
  };
  if (params.organizationId) {
    failedFilter.organizationId = params.organizationId;
  }
  if (params.reminderIds && params.reminderIds.length > 0) {
    failedFilter._id = { $in: params.reminderIds };
  }

  const failedReminderIds = await ScheduledReminder.find(failedFilter)
    .select('_id')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
  const ids = failedReminderIds.map((entry) => entry._id);
  if (ids.length === 0) {
    return { matched: 0, replayed: 0 };
  }

  const replayResult = await ScheduledReminder.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        status: 'pending',
        nextAttemptAt: new Date(),
        lockToken: null,
        lockedAt: null,
        lockExpiresAt: null,
        lastError: null,
        lastErrorCode: null,
        deliveryKey: null,
        deliveryAttemptedAt: null,
        expireAt: null,
      },
    },
  );

  return {
    matched: ids.length,
    replayed: replayResult.modifiedCount || 0,
  };
}

export async function processQueuedReminders(handler: (params: {
  reminderType: ScheduledReminderType;
  organizationId: string;
  candidateId?: string;
  reminderAt: Date;
  candidateName: string;
  followUpDate: Date;
  scheduledAt: Date;
  offsetMinutesUsed: number;
  followUpNote?: string | null;
  followUpUserId: string;
  source: string;
}) => Promise<void>) {
  await connectToDatabase();
  if (!ScheduledReminder) {
    throw new Error('ScheduledReminder model is not available');
  }

  const now = new Date();
  const oldestDueReminder = await ScheduledReminder.findOne({
    status: 'pending',
    nextAttemptAt: { $lte: now },
  })
    .select('_id organizationId nextAttemptAt')
    .sort({ nextAttemptAt: 1 })
    .lean();

  if (oldestDueReminder?.nextAttemptAt) {
    const queueLagMs = now.getTime() - new Date(oldestDueReminder.nextAttemptAt).getTime();
    if (queueLagMs > REMINDER_LAG_ALERT_MS) {
      const pendingCount = await ScheduledReminder.countDocuments({
        status: 'pending',
        nextAttemptAt: { $lte: now },
      });
      logger.error('Reminder queue lag exceeded threshold', {
        queueLagMs,
        pendingCount,
        oldestReminderId: String(oldestDueReminder._id),
        oldestReminderOrganizationId: oldestDueReminder.organizationId,
        lagAlertThresholdMs: REMINDER_LAG_ALERT_MS,
      });
    }
  }

  const workerId = crypto.randomUUID();
  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < PROCESS_BATCH_SIZE; i += 1) {
    const reminder = await claimDueReminder(workerId);
    if (!reminder?._id) {
      break;
    }

    processed += 1;

    try {
      logger.info('Processing queued reminder', {
        reminderId: String(reminder._id),
        reminderType: reminder.reminderType,
        source: reminder.source,
        recipientUserId: reminder.recipientUserId,
      });
      const deliveryGuard = await markReminderDelivering(String(reminder._id));
      if (!deliveryGuard.shouldSend) {
        await markReminderSent(String(reminder._id));
        sent += 1;
        continue;
      }

      await handler({
        reminderType: reminder.reminderType,
        organizationId: reminder.organizationId,
        candidateId:
          typeof reminder.payload === 'object' &&
          reminder.payload !== null &&
          'candidateId' in reminder.payload
            ? String((reminder.payload as { candidateId?: string }).candidateId || '')
            : '',
        reminderAt: new Date(reminder.reminderAt),
        candidateName: reminder.title,
        followUpDate: new Date(reminder.reminderAt),
        scheduledAt: new Date(reminder.scheduledAt),
        offsetMinutesUsed: Number(reminder.offsetMinutesUsed || 0),
        followUpNote:
          typeof reminder.payload === 'object' && reminder.payload !== null
            ? reminder.reminderType === 'assignment'
              ? String(
                  (
                    reminder.payload as {
                      assignmentNote?: string;
                      followUpNote?: string;
                    }
                  ).assignmentNote ||
                    (
                      reminder.payload as {
                        assignmentNote?: string;
                        followUpNote?: string;
                      }
                    ).followUpNote ||
                    '',
                )
              : String(
                  (
                    reminder.payload as {
                      followUpNote?: string;
                    }
                  ).followUpNote || '',
                )
            : '',
        followUpUserId: reminder.recipientUserId,
        source: reminder.source,
      });
      await markReminderSent(String(reminder._id));
      sent += 1;
    } catch (error) {
      failed += 1;
      await markReminderFailed({
        reminderId: String(reminder._id),
        attemptCount: reminder.attemptCount || 0,
        maxAttempts: reminder.maxAttempts || 5,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      logger.error('Failed processing queued reminder', {
        reminderId: String(reminder._id),
        reminderType: reminder.reminderType,
        error,
      });
    }
  }

  return { processed, sent, failed, batchSize: PROCESS_BATCH_SIZE };
}
