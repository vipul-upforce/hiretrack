/**
 * Default notification settings for all notification types
 * Used across API routes and frontend components
 */

export const DEFAULT_NOTIFICATION_SETTINGS = {
  newApplications: true,
  interviewAssignments: true,
  statusUpdates: true,
  newRemarks: true,
  stepCompleted: true,
  mentions: true,
  detailsUpdated: true,
  meetingScheduled: true,
  meetingUpdated: true,
  meetingCancelled: true,
  meetingInviteAccepted: true,
  meetingInviteDeclined: true,
  meetingInviteTentative: true,
  followupAdded: true,
  followupUpdated: true,
  followupRemoved: true,
  jobCreated: true,
  jobUpdated: true,
  userAdded: true,
  bulkImportCompleted: true,
  candidateRejected: true,
  interviewCompleted: true,
  candidateMoved: true,
} as const;

/**
 * All valid notification type keys
 * Used for validation in API routes
 */
export const VALID_NOTIFICATION_KEYS = [
  "newApplications",
  "interviewAssignments",
  "statusUpdates",
  "newRemarks",
  "stepCompleted",
  "mentions",
  "detailsUpdated",
  "meetingScheduled",
  "meetingUpdated",
  "meetingCancelled",
  "meetingInviteAccepted",
  "meetingInviteDeclined",
  "meetingInviteTentative",
  "followupAdded",
  "followupUpdated",
  "followupRemoved",
  "jobCreated",
  "jobUpdated",
  "userAdded",
  "bulkImportCompleted",
  "candidateRejected",
  "interviewCompleted",
  "candidateMoved",
] as const;

export type NotificationKey = typeof VALID_NOTIFICATION_KEYS[number];










