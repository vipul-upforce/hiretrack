import mongoose, { Schema } from "mongoose";

export enum NotificationType {
  // Admin/HR notifications
  CANDIDATE_APPLIED = 'candidate_applied',
  CANDIDATE_STATUS_UPDATED = 'candidate_status_updated',
  CANDIDATE_DETAILS_UPDATED = 'candidate_details_updated',
  CANDIDATE_ASSIGNED = 'candidate_assigned',
  CANDIDATE_UNASSIGNED = 'candidate_unassigned',
  REMARK_ADDED = 'remark_added',
  MEETING_SCHEDULED = 'meeting_scheduled',
  MEETING_UPDATED = 'meeting_updated',
  MEETING_CANCELLED = 'meeting_cancelled',
  FOLLOWUP_ADDED = 'followup_added',
  FOLLOWUP_UPDATED = 'followup_updated',
  FOLLOWUP_REMOVED = 'followup_removed',
  CHECKLIST_COMPLETED = 'checklist_completed',
  JOB_CREATED = 'job_created',
  JOB_UPDATED = 'job_updated',
  USER_ADDED = 'user_added',
  BULK_IMPORT_COMPLETED = 'bulk_import_completed',
  CANDIDATE_REJECTED = 'candidate_rejected',
  INTERVIEW_COMPLETED = 'interview_completed',

  // System notifications
  // DEADLINE_REMINDER = 'deadline_reminder',
  // EMAIL_FAILED = 'email_failed',
  // SYSTEM_MAINTENANCE = 'system_maintenance',
  // FILE_UPLOAD_COMPLETED = 'file_upload_completed',
  // REPORT_GENERATED = 'report_generated',
}

export type RelatedEntityType = 'candidate' | 'job' | 'user' | 'meeting' | 'followup' | 'checklist' | 'system' | 'cvBatch';

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
    [key: string]: any;
  };

  createdAt: Date;
  updatedAt: Date;
}

export const notificationSchema = new Schema<INotification>(
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
      enum: ['candidate', 'job', 'user', 'meeting', 'followup', 'checklist', 'system', 'cvBatch'],
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
  },
  {
    timestamps: true,
  }
);

// Add compound indexes for efficient queries
notificationSchema.index({ organizationId: 1, recipientId: 1, createdAt: -1 }); // Main query pattern
notificationSchema.index({ organizationId: 1, recipientId: 1, isRead: 1 }); // Unread count
notificationSchema.index({ organizationId: 1, relatedEntity: 1, relatedId: 1 }); // Related entity queries

export default notificationSchema;