import { INotification } from '@/lib/models/notification';
import { CreateNotificationParams } from './types';
import {
  createNotification,
  createBulkNotifications,
} from './core/notificationCore';
import { getUsersByRole as getUserIdsByRoleHelper } from './core/userHelpers';
import * as candidateHandlers from './handlers/candidateHandlers';
import * as jobHandlers from './handlers/jobHandlers';
import * as meetingHandlers from './handlers/meetingHandlers';
import * as meetingInviteHandlers from './handlers/meetingInviteHandlers';
import * as assignmentHandlers from './handlers/assignmentHandlers';
import * as followupHandlers from './handlers/followupHandlers';
import * as otherHandlers from './handlers/otherHandlers';

/**
 * Main NotificationService class that provides a unified API
 * for all notification operations. This service is modularized
 * into smaller handlers for better maintainability.
 */
export class NotificationService {
  /**
   * Creates a single notification
   */
  static async createNotification(
    params: CreateNotificationParams,
  ): Promise<INotification | null> {
    return createNotification(params);
  }

  /**
   * Creates multiple notifications for different recipients
   */
  static async createBulkNotifications(
    baseParams: Omit<CreateNotificationParams, 'recipientId'>,
    recipientIds: string[],
  ): Promise<INotification[]> {
    return createBulkNotifications(baseParams, recipientIds);
  }

  /**
   * Gets user IDs by role for an organization
   */
  static async getUsersByRole(
    organizationId: string,
    roles: string[],
  ): Promise<string[]> {
    return getUserIdsByRoleHelper(organizationId, roles);
  }

  // Candidate-related notifications
  static async notifyCandidateApplied(
    params: Parameters<typeof candidateHandlers.notifyCandidateApplied>[0],
  ): Promise<void> {
    return candidateHandlers.notifyCandidateApplied(params);
  }

  static async notifyRemarkAdded(
    params: Parameters<typeof otherHandlers.notifyRemarkAdded>[0],
  ): Promise<void> {
    return otherHandlers.notifyRemarkAdded(params);
  }

  static async notifyCandidateStatusUpdated(
    params: Parameters<
      typeof candidateHandlers.notifyCandidateStatusUpdated
    >[0],
  ): Promise<void> {
    return candidateHandlers.notifyCandidateStatusUpdated(params);
  }

  static async notifyCandidateRejected(
    params: Parameters<typeof candidateHandlers.notifyCandidateRejected>[0],
  ): Promise<void> {
    return candidateHandlers.notifyCandidateRejected(params);
  }

  static async notifyCandidateMoved(
    params: Parameters<typeof candidateHandlers.notifyCandidateMoved>[0],
  ): Promise<void> {
    return candidateHandlers.notifyCandidateMoved(params);
  }

  static async notifyBulkCandidateMoved(
    params: Parameters<typeof candidateHandlers.notifyBulkCandidateMoved>[0],
  ): Promise<void> {
    return candidateHandlers.notifyBulkCandidateMoved(params);
  }

  static async notifyCandidateDetailsUpdated(
    params: Parameters<
      typeof candidateHandlers.notifyCandidateDetailsUpdated
    >[0],
  ): Promise<void> {
    return candidateHandlers.notifyCandidateDetailsUpdated(params);
  }

  static async notifyInterviewCompleted(
    params: Parameters<typeof assignmentHandlers.notifyInterviewCompleted>[0],
  ): Promise<void> {
    return assignmentHandlers.notifyInterviewCompleted(params);
  }

  // Job-related notifications
  static async notifyJobCreated(
    params: Parameters<typeof jobHandlers.notifyJobCreated>[0],
  ): Promise<void> {
    return jobHandlers.notifyJobCreated(params);
  }

  static async notifyJobUpdated(
    params: Parameters<typeof jobHandlers.notifyJobUpdated>[0],
  ): Promise<void> {
    return jobHandlers.notifyJobUpdated(params);
  }

  // Meeting-related notifications
  static async notifyMeetingScheduled(
    params: Parameters<typeof meetingHandlers.notifyMeetingScheduled>[0],
  ): Promise<void> {
    return meetingHandlers.notifyMeetingScheduled(params);
  }

  static async notifyMeetingUpdated(
    params: Parameters<typeof meetingHandlers.notifyMeetingUpdated>[0],
  ): Promise<void> {
    return meetingHandlers.notifyMeetingUpdated(params);
  }

  static async notifyMeetingCancelled(
    params: Parameters<typeof meetingHandlers.notifyMeetingCancelled>[0],
  ): Promise<void> {
    return meetingHandlers.notifyMeetingCancelled(params);
  }

  // Meeting invite notifications
  static async notifyMeetingInviteAccepted(
    params: Parameters<
      typeof meetingInviteHandlers.notifyMeetingInviteAccepted
    >[0],
  ): Promise<void> {
    return meetingInviteHandlers.notifyMeetingInviteAccepted(params);
  }

  static async notifyMeetingInviteDeclined(
    params: Parameters<
      typeof meetingInviteHandlers.notifyMeetingInviteDeclined
    >[0],
  ): Promise<void> {
    return meetingInviteHandlers.notifyMeetingInviteDeclined(params);
  }

  static async notifyMeetingInviteTentative(
    params: Parameters<
      typeof meetingInviteHandlers.notifyMeetingInviteTentative
    >[0],
  ): Promise<void> {
    return meetingInviteHandlers.notifyMeetingInviteTentative(params);
  }

  // Assignment-related notifications
  static async notifyCandidateAssigned(
    params: Parameters<typeof assignmentHandlers.notifyCandidateAssigned>[0],
  ): Promise<void> {
    return assignmentHandlers.notifyCandidateAssigned(params);
  }

  static async notifyCandidateUnassigned(
    params: Parameters<typeof assignmentHandlers.notifyCandidateUnassigned>[0],
  ): Promise<void> {
    return assignmentHandlers.notifyCandidateUnassigned(params);
  }

  // Follow-up notifications
  static async notifyFollowUpAdded(
    params: Parameters<typeof followupHandlers.notifyFollowUpAdded>[0],
  ): Promise<void> {
    return followupHandlers.notifyFollowUpAdded(params);
  }

  static async notifyFollowupUpdated(
    params: Parameters<typeof followupHandlers.notifyFollowupUpdated>[0],
  ): Promise<void> {
    return followupHandlers.notifyFollowupUpdated(params);
  }

  static async notifyFollowupRemoved(
    params: Parameters<typeof followupHandlers.notifyFollowupRemoved>[0],
  ): Promise<void> {
    return followupHandlers.notifyFollowupRemoved(params);
  }

  // Other notifications

  static async notifyUserAdded(
    params: Parameters<typeof otherHandlers.notifyUserAdded>[0],
  ): Promise<void> {
    return otherHandlers.notifyUserAdded(params);
  }

  static async notifyBulkImportCompleted(
    params: Parameters<typeof otherHandlers.notifyBulkImportCompleted>[0],
  ): Promise<void> {
    return otherHandlers.notifyBulkImportCompleted(params);
  }
}
