import mongoose, { Schema } from 'mongoose';

export enum NotificationType {
  // Admin/HR notifications
  NEW_APPLICATIONS = 'newApplications',
  INTERVIEW_ASSIGNMENTS = 'interviewAssignments',
  STATUS_UPDATES = 'statusUpdates',
  NEW_REMARKS = 'newRemarks',
  STEP_COMPLETED = 'stepCompleted',
  MENTIONS = 'mentions',
  CANDIDATE_DETAILS_UPDATED = 'detailsUpdated',
  MEETING_SCHEDULED = 'meetingScheduled',
  MEETING_UPDATED = 'meetingUpdated',
  MEETING_CANCELLED = 'meetingCancelled',
  MEETING_INVITE_ACCEPTED = 'meetingInviteAccepted',
  MEETING_INVITE_DECLINED = 'meetingInviteDeclined',
  MEETING_INVITE_TENTATIVE = 'meetingInviteTentative',
  FOLLOWUP_ADDED = 'followupAdded',
  FOLLOWUP_UPDATED = 'followupUpdated',
  FOLLOWUP_REMOVED = 'followupRemoved',
  JOB_CREATED = 'jobCreated',
  JOB_UPDATED = 'jobUpdated',
  USER_ADDED = 'userAdded',
  BULK_IMPORT_COMPLETED = 'bulkImportCompleted',
  CANDIDATE_REJECTED = 'candidateRejected',
  INTERVIEW_COMPLETED = 'interviewCompleted',
  CANDIDATE_MOVED = 'candidateMoved',
}

export type RelatedEntityType =
  | 'candidate'
  | 'job'
  | 'user'
  | 'meeting'
  | 'followup'
  | 'checklist'
  | 'system'
  | 'cvBatch';

export interface INotification {
  _id: string;
  organizationId: string;
  recipientId: string; // User ID who receives the notification
  type: NotificationType;
  title: string; // Display title
  message: string; // Description text
  isRead: boolean;
  priority: 'high' | 'medium' | 'low';

  // Related entity information
  relatedEntity: RelatedEntityType;
  relatedId?: string; // ID of the related entity (optional for system notifications)
  actionUrl?: string; // URL to navigate to on click

  // Trigger information
  triggerUserId?: string; // Who triggered this notification
  triggerUserName?: string; // Cache for display

  // Flexible metadata for additional data
  metadata?: {
    candidateName?: string;
    candidateEmail?: string;
    jobTitle?: string;
    jobId?: string;
    oldStatus?: string;
    newStatus?: string;
    meetingDate?: Date;
    interviewerName?: string;
    remarkText?: string;
    followupDate?: Date;
    checklistName?: string;
    fileName?: string;
    errorMessage?: string;
    [key: string]: string | number | Date | boolean | undefined;
  };

  createdAt: Date;
  updatedAt: Date;
}

export const notificationSchema = new mongoose.Schema<INotification>(
  {
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    recipientId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
      index: true,
    },
    relatedEntity: {
      type: String,
      enum: [
        'candidate',
        'job',
        'user',
        'meeting',
        'followup',
        'checklist',
        'system',
        'cvBatch',
      ],
      required: true,
      index: true,
    },
    relatedId: {
      type: String,
      required: false,
      index: true,
    },
    actionUrl: {
      type: String,
      required: false,
    },
    triggerUserId: {
      type: String,
      required: false,
      index: true,
    },
    triggerUserName: {
      type: String,
      required: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // createdAt and updatedAt are handled by timestamps: true
    // createdAt is explicitly set in notificationCore.ts for guaranteed presence
    // updatedAt is automatically managed by Mongoose timestamps
  },
  {
    timestamps: true,
  },
);

// TTL index for deleting notifications docs after 30 days
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 15 },
);

// Add compound indexes for efficient queries
notificationSchema.index({ organizationId: 1, recipientId: 1, createdAt: -1 }); // Main query pattern
notificationSchema.index({ organizationId: 1, recipientId: 1, isRead: 1 }); // Unread count
notificationSchema.index({ organizationId: 1, relatedEntity: 1, relatedId: 1 }); // Related entity queries
// 5. Notifications - Organization + Recipient + Read status
notificationSchema.index(
  {
    organizationId: 1,
    recipientId: 1,
    isRead: 1,
    createdAt: -1,
  },
  { name: 'idx_notification_org_recipient_read', background: true },
);
export default notificationSchema;
