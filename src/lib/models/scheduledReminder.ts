import mongoose from 'mongoose';

export type ScheduledReminderStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'cancelled';

export type ScheduledReminderType = 'followup';

export interface IScheduledReminder {
  _id: string;
  organizationId: string;
  reminderType: ScheduledReminderType;
  recipientUserId: string;
  title: string;
  reminderAt: Date;
  payload?: Record<string, unknown>;
  source: string;
  scheduledAt: Date;
  nextAttemptAt: Date;
  status: ScheduledReminderStatus;
  attemptCount: number;
  maxAttempts: number;
  lastError?: string;
  lastErrorCode?: string;
  lockToken?: string;
  lockedAt?: Date;
  lockExpiresAt?: Date;
  reclaimCount?: number;
  deliveryKey?: string;
  deliveryAttemptedAt?: Date;
  sentAt?: Date;
  idempotencyKey: string;
  expireAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const scheduledReminderSchema = new mongoose.Schema<IScheduledReminder>(
  {
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    reminderType: {
      type: String,
      enum: ['followup'],
      required: true,
      index: true,
    },
    recipientUserId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    reminderAt: {
      type: Date,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
      default: {},
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    nextAttemptAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'sent', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    attemptCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
      min: 1,
    },
    lastError: {
      type: String,
      required: false,
    },
    lastErrorCode: {
      type: String,
      required: false,
      index: true,
    },
    lockToken: {
      type: String,
      required: false,
      index: true,
    },
    lockedAt: {
      type: Date,
      required: false,
    },
    lockExpiresAt: {
      type: Date,
      required: false,
      index: true,
    },
    reclaimCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    deliveryKey: {
      type: String,
      required: false,
      index: true,
    },
    deliveryAttemptedAt: {
      type: Date,
      required: false,
    },
    sentAt: {
      type: Date,
      required: false,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expireAt: {
      type: Date,
      required: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

scheduledReminderSchema.index(
  { status: 1, nextAttemptAt: 1, scheduledAt: 1 },
  { name: 'idx_scheduled_reminder_due' },
);
scheduledReminderSchema.index(
  { status: 1, lockExpiresAt: 1 },
  { name: 'idx_scheduled_reminder_stale_processing' },
);
scheduledReminderSchema.index(
  { organizationId: 1, status: 1, scheduledAt: 1 },
  { name: 'idx_scheduled_reminder_org_due' },
);
scheduledReminderSchema.index(
  { expireAt: 1 },
  { expireAfterSeconds: 0, name: 'idx_scheduled_reminder_ttl' },
);

export default scheduledReminderSchema;
