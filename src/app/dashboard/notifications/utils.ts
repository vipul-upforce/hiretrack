import { NotificationType } from '@/lib/models/notification';

/**
 * Returns the list of notification types available for a specific user role.
 */
export const getNotificationTypesForRole = (
  userRole?: string,
): NotificationType[] => {
  const allTypes = Object.values(NotificationType);

  if (!userRole || userRole === 'admin') {
    return allTypes;
  }

  if (userRole === 'hr') {
    return allTypes.filter(
      (type) =>
        type === NotificationType.NEW_APPLICATIONS ||
        type === NotificationType.STATUS_UPDATES ||
        type === NotificationType.CANDIDATE_DETAILS_UPDATED ||
        type === NotificationType.INTERVIEW_ASSIGNMENTS ||
        type === NotificationType.STEP_COMPLETED ||
        type === NotificationType.CANDIDATE_REJECTED ||
        type === NotificationType.NEW_REMARKS ||
        type === NotificationType.MEETING_SCHEDULED ||
        type === NotificationType.MEETING_UPDATED ||
        type === NotificationType.MEETING_CANCELLED ||
        type === NotificationType.FOLLOWUP_ADDED ||
        type === NotificationType.FOLLOWUP_UPDATED ||
        type === NotificationType.FOLLOWUP_REMOVED ||
        type === NotificationType.JOB_CREATED ||
        type === NotificationType.JOB_UPDATED ||
        type === NotificationType.CANDIDATE_MOVED ||
        type === NotificationType.BULK_IMPORT_COMPLETED ||
        type === NotificationType.INTERVIEW_COMPLETED,
    );
  }

  if (userRole === 'interviewer') {
    return allTypes.filter(
      (type) =>
        type === NotificationType.INTERVIEW_ASSIGNMENTS ||
        type === NotificationType.STEP_COMPLETED ||
        type === NotificationType.MEETING_SCHEDULED ||
        type === NotificationType.MEETING_UPDATED ||
        type === NotificationType.MEETING_CANCELLED ||
        type === NotificationType.NEW_REMARKS,
    );
  }

  return allTypes;
};
