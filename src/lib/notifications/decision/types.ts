import mongoose from 'mongoose';
import { EmailNotificationSettings } from '@/lib/models/user';
import { OrganizationEmailNotifications } from '@/lib/models/settings';
import { NotificationType } from '@/lib/models/notification';

export type EmailNotificationType =
  | 'newApplications'
  | 'interviewAssignments'
  | 'statusUpdates'
  | 'newRemarks'
  | 'stepCompleted'
  | 'mentions';

export interface NotificationDecisionContext {
  organizationId: string;
  recipientUserId: string;
  notificationType: NotificationType;
  jobId?: string;
  triggererUserId?: string;
  isMention?: boolean;
  notificationCategory: 'email' | 'inApp';
}

export interface NotificationDecisionResult {
  shouldSend: boolean;
  reason: string;
  effectiveSettings: {
    source: 'job-level' | 'global-user' | 'admin-override' | 'org-default';
    enabled: boolean;
    category: 'email' | 'inApp';
  };
}

export type UserLean = {
  _id: mongoose.Types.ObjectId | string;
  emailNotificationSettings?: EmailNotificationSettings;
  role: string;
};

export type SettingsLean = {
  organizationEmailNotifications?: OrganizationEmailNotifications;
};
