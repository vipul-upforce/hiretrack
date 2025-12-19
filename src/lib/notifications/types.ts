import { NotificationType } from './decision';

export type RelatedEntityType =
  | 'candidate'
  | 'job'
  | 'user'
  | 'meeting'
  | 'followup'
  | 'checklist'
  | 'system'
  | 'cvBatch';

export interface CreateNotificationParams {
  organizationId: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntity: RelatedEntityType;
  relatedId?: string;
  actionUrl?: string;
  triggerUserId?: string;
  triggerUserName?: string;
  priority?: 'high' | 'medium' | 'low';
  metadata?: Record<string, unknown>;
}
