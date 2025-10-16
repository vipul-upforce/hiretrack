import connectToDatabase, { Notification, User } from "@/lib/mongodb";
import { INotification } from "@/lib/models/notification";
import { findMentionedUsers } from "@/lib/services/userMentionService";
import {
  batchCheckNotifications,
  NotificationType,
  NotificationDecisionContext,
} from "@/lib/services/emailDecisionEngine";

interface CreateNotificationParams {
  organizationId: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntity:
    | "candidate"
    | "job"
    | "user"
    | "meeting"
    | "followup"
    | "checklist"
    | "system"
    | "cvBatch";
  relatedId?: string;
  actionUrl?: string;
  triggerUserId?: string;
  triggerUserName?: string;
  priority?: "high" | "medium" | "low";
  metadata?: Record<string, any>;
}

export class NotificationService {
  static async createNotification(
    params: CreateNotificationParams
  ): Promise<INotification | null> {
    try {
      await connectToDatabase();

      if (!Notification) {
        throw new Error("Notification model not available");
      }

      const notification = await Notification.create({
        organizationId: params.organizationId,
        recipientId: params.recipientId,
        type: params.type,
        title: params.title,
        message: params.message,
        relatedEntity: params.relatedEntity,
        relatedId: params.relatedId,
        actionUrl: params.actionUrl,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: params.priority || "medium",
        metadata: params.metadata || {},
        isRead: false,
      });

      return notification.toObject();
    } catch (error) {
      console.error("❌ Error creating notification:", error);
      return null;
    }
  }

  static async createBulkNotifications(
    baseParams: Omit<CreateNotificationParams, "recipientId">,
    recipientIds: string[]
  ): Promise<INotification[]> {
    try {
      await connectToDatabase();

      if (!Notification) {
        throw new Error("Notification model not available");
      }
      console.log(baseParams, "baseParams");

      const recipients = recipientIds.filter(
        (id) => id !== baseParams.triggerUserId
      );
      const notifications = recipients.map((recipientId) => ({
        organizationId: baseParams.organizationId,
        recipientId,
        type: baseParams.type,
        title: baseParams.title,
        message: baseParams.message,
        relatedEntity: baseParams.relatedEntity,
        relatedId: baseParams.relatedId,
        actionUrl: baseParams.actionUrl,
        triggerUserId: baseParams.triggerUserId,
        triggerUserName: baseParams.triggerUserName,
        priority: baseParams.priority || "medium",
        metadata: baseParams.metadata || {},
        isRead: false,
      }));
      // console.log(notifications, "notifications- fotr bulkkkkk");

      const createdNotifications = await Notification.insertMany(notifications);
      console.log(createdNotifications, "createdNotifications");

      return createdNotifications.map((n) => n.toObject());
    } catch (error) {
      console.error("❌ Error creating bulk notifications:", error);
      return [];
    }
  }

  static async getUsersByRole(
    organizationId: string,
    roles: string[]
  ): Promise<string[]> {
    try {
      await connectToDatabase();

      if (!User) {
        throw new Error("User model not available");
      }

      const users = await User.find({
        organizationId,
        role: { $in: roles },
        isDeleted: { $ne: true },
      }).select("_id role name email");

      return users.map((user) => user._id.toString());
    } catch (error) {
      console.error("❌ Error getting users by role:", error);
      return [];
    }
  }

  static async notifyCandidateApplied(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
    jobId: string;
    jobTitle: string;
    triggerUserId?: string;
    triggerUserName?: string;
  }) {
    try {
      await connectToDatabase();
      const adminHrIds = await this.getUsersByRole(params.organizationId, [
        "admin",
        "hr",
      ]);
      const filteredAdminHrIds = adminHrIds.filter(
        (id) => id !== params.triggerUserId
      );

      if (filteredAdminHrIds.length === 0) {
        console.log("No eligible recipients for notification");
        return;
      }

      const decisionContexts: NotificationDecisionContext[] =
        filteredAdminHrIds.map((userId) => ({
          organizationId: params.organizationId,
          recipientUserId: userId,
          notificationType: NotificationType.NEW_APPLICATIONS, // Use email notification type
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        }));
      console.log(decisionContexts, "decisionContexts");

      const decisions = await batchCheckNotifications(decisionContexts);
      console.log(decisions, "decisions Notification");

      const eligibleUserIds = filteredAdminHrIds.filter(
        (userId, index) => decisions[index].shouldSend
      );
      console.log(eligibleUserIds, "eligibleUserIds Notifications");

      if (eligibleUserIds.length === 0) {
        console.log("No users have enabled NEW_APPLICATIONS notifications");
        return;
      }

      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.NEW_APPLICATIONS,
          title: "New Candidate Application",
          message: `${params.candidateName} has applied for ${params.jobTitle}`,
          relatedEntity: "candidate",
          relatedId: params.candidateId,
          actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: "high",
          metadata: {
            candidateName: params.candidateName,
            candidateEmail: params.candidateEmail,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
          },
        },
        eligibleUserIds
      );

      console.log(
        `Sent in-app notifications to ${eligibleUserIds.length} users`
      );
    } catch (error) {
      console.error("Failed to send candidate applied notification:", error);
    }
  }

  static async notifyCandidateStatusUpdated(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    oldStatus: string;
    newStatus: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    try {
      await connectToDatabase();
      const adminHrIds = await this.getUsersByRole(params.organizationId, [
        "admin",
        "hr",
      ]);
      const filteredAdminHrIds = adminHrIds.filter(
        (id) => id !== params.triggerUserId
      );

      if (filteredAdminHrIds.length === 0) {
        console.log("No eligible recipients for notification");
        return;
      }

      const decisionContexts: NotificationDecisionContext[] =
        filteredAdminHrIds.map((userId) => ({
          organizationId: params.organizationId,
          recipientUserId: userId,
          notificationType: NotificationType.STATUS_UPDATES,
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        }));

      const decisions = await batchCheckNotifications(decisionContexts);
      const eligibleUserIds = filteredAdminHrIds.filter(
        (userId, index) => decisions[index].shouldSend
      );

      if (eligibleUserIds.length === 0) {
        console.log("No users have enabled STATUS_UPDATES notifications");
        return;
      }

      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.STATUS_UPDATES,
          title: "Candidate Status Updated",
          message: `${params.candidateName} moved from ${params.oldStatus} to ${params.newStatus}`,
          relatedEntity: "candidate",
          relatedId: params.candidateId,
          actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: "medium",
          metadata: {
            candidateName: params.candidateName,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
            oldStatus: params.oldStatus,
            newStatus: params.newStatus,
          },
        },
        eligibleUserIds
      );

      console.log(
        `Sent in-app notifications to ${eligibleUserIds.length} users`
      );
    } catch (error) {
      console.error(
        "Failed to send candidate status updated notification:",
        error
      );
    }
  }

  static async notifyCandidateAssigned(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    interviewerId: string;
    interviewerName: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    try {
      await connectToDatabase();

      // Notify the interviewer
      if (params.interviewerId !== params.triggerUserId) {
        const decisionContext: NotificationDecisionContext = {
          organizationId: params.organizationId,
          recipientUserId: params.interviewerId,
          notificationType: NotificationType.INTERVIEW_ASSIGNMENTS,
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        };

        const decision = await batchCheckNotifications([decisionContext]);
        if (decision[0].shouldSend) {
          await this.createNotification({
            organizationId: params.organizationId,
            recipientId: params.interviewerId,
            type: NotificationType.INTERVIEW_ASSIGNMENTS,
            title: "Candidate Assigned",
            message: `You have been assigned to interview ${params.candidateName} for ${params.jobTitle}`,
            relatedEntity: "candidate",
            relatedId: params.candidateId,
            actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
            triggerUserId: params.triggerUserId,
            triggerUserName: params.triggerUserName,
            priority: "high",
            metadata: {
              candidateName: params.candidateName,
              jobTitle: params.jobTitle,
              jobId: params.jobId,
              interviewerName: params.interviewerName,
            },
          });
        }
      }

      // Notify admin/hr
      const adminHrIds = await this.getUsersByRole(params.organizationId, [
        "admin",
        "hr",
      ]);
      const filteredAdminHrIds = adminHrIds.filter(
        (id) => id !== params.triggerUserId
      );

      if (filteredAdminHrIds.length === 0) {
        console.log("No eligible admin/hr recipients for notification");
        return;
      }

      const decisionContexts: NotificationDecisionContext[] =
        filteredAdminHrIds.map((userId) => ({
          organizationId: params.organizationId,
          recipientUserId: userId,
          notificationType: NotificationType.INTERVIEW_ASSIGNMENTS,
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        }));

      const decisions = await batchCheckNotifications(decisionContexts);
      const eligibleUserIds = filteredAdminHrIds.filter(
        (userId, index) => decisions[index].shouldSend
      );

      if (eligibleUserIds.length === 0) {
        console.log(
          "No users have enabled INTERVIEW_ASSIGNMENTS notifications"
        );
        return;
      }

      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.INTERVIEW_ASSIGNMENTS,
          title: "Candidate Assigned",
          message: `${params.candidateName} has been assigned to ${params.interviewerName}`,
          relatedEntity: "candidate",
          relatedId: params.candidateId,
          actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: "medium",
          metadata: {
            candidateName: params.candidateName,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
            interviewerName: params.interviewerName,
          },
        },
        eligibleUserIds
      );

      console.log(
        `Sent in-app notifications to ${eligibleUserIds.length + (decisions[0]?.shouldSend ? 1 : 0)} users`
      );
    } catch (error) {
      console.error("Failed to send candidate assigned notification:", error);
    }
  }

  static async notifyRemarkAdded(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    remarkText: string;
    triggerUserId: string;
    triggerUserName: string;
    roles: string[];
  }) {
    try {
      await connectToDatabase();
      const userIds = await this.getUsersByRole(
        params.organizationId,
        params.roles
      );
      const filteredUserIds = userIds.filter(
        (id) => id !== params.triggerUserId
      );

      let mentionedUserIds: string[] = [];
      try {
        const mentionResult = await findMentionedUsers(
          params.remarkText,
          params.organizationId
        );
        mentionedUserIds = mentionResult.mentionedUsers.map((u) =>
          u._id.toString()
        );
        console.log("Mentioned users:", mentionedUserIds);
      } catch (mentionError) {
        console.error("Error in mention detection:", mentionError);
      }

      const allRecipients = [
        ...new Set([...filteredUserIds, ...mentionedUserIds]),
      ];

      if (allRecipients.length === 0) {
        console.log("No eligible recipients for remark notification");
        return;
      }

      const decisionContexts: NotificationDecisionContext[] = allRecipients.map(
        (userId) => ({
          organizationId: params.organizationId,
          recipientUserId: userId,
          notificationType: mentionedUserIds.includes(userId)
            ? NotificationType.MENTIONS
            : NotificationType.NEW_REMARKS,
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: mentionedUserIds.includes(userId),
          notificationCategory: "email",
        })
      );

      const decisions = await batchCheckNotifications(decisionContexts);
      const eligibleUserIds = allRecipients.filter(
        (userId, index) => decisions[index].shouldSend
      );

      if (eligibleUserIds.length === 0) {
        console.log(
          "No users have enabled NEW_REMARKS or MENTIONS notifications"
        );
        return;
      }

      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.NEW_REMARKS,
          title: "New Remark Added",
          message: `${params.triggerUserName} added a remark for ${params.candidateName}`,
          relatedEntity: "candidate",
          relatedId: params.candidateId,
          actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: "low",
          metadata: {
            candidateName: params.candidateName,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
            remarkText:
              params.remarkText.substring(0, 100) +
              (params.remarkText.length > 100 ? "..." : ""),
          },
        },
        eligibleUserIds
      );

      console.log(
        `Sent remark notifications to ${eligibleUserIds.length} users`
      );
    } catch (error) {
      console.error("Failed to send remark notification:", error);
    }
  }

  static async notifyMeetingScheduled(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    interviewerId: string;
    interviewerName: string;
    meetingDate: Date;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    try {
      await connectToDatabase();

      // Notify the interviewer if they're not the triggerer
      if (params.interviewerId !== params.triggerUserId) {
        const decisionContext: NotificationDecisionContext = {
          organizationId: params.organizationId,
          recipientUserId: params.interviewerId,
          notificationType: NotificationType.MEETING_SCHEDULED, // Assume always enabled if not in settings
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        };

        const decision = await batchCheckNotifications([decisionContext]);
        if (decision[0].shouldSend) {
          await this.createNotification({
            organizationId: params.organizationId,
            recipientId: params.interviewerId,
            type: NotificationType.MEETING_SCHEDULED,
            title: "Interview Scheduled",
            message: `Interview scheduled with ${params.candidateName} for ${params.jobTitle}`,
            relatedEntity: "meeting",
            relatedId: params.candidateId,
            actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
            triggerUserId: params.triggerUserId,
            triggerUserName: params.triggerUserName,
            priority: "high",
            metadata: {
              candidateName: params.candidateName,
              jobTitle: params.jobTitle,
              jobId: params.jobId,
              interviewerName: params.interviewerName,
              meetingDate: params.meetingDate,
            },
          });
        }
      }

      // Notify admin/hr
      const adminHrIds = await this.getUsersByRole(params.organizationId, [
        "admin",
        "hr",
      ]);
      const filteredAdminHrIds = adminHrIds.filter(
        (id) => id !== params.triggerUserId
      );

      if (filteredAdminHrIds.length === 0) {
        console.log("No eligible admin/hr recipients for notification");
        return;
      }

      const decisionContexts: NotificationDecisionContext[] =
        filteredAdminHrIds.map((userId) => ({
          organizationId: params.organizationId,
          recipientUserId: userId,
          notificationType: NotificationType.MEETING_SCHEDULED,
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        }));

      const decisions = await batchCheckNotifications(decisionContexts);
      const eligibleUserIds = filteredAdminHrIds.filter(
        (userId, index) => decisions[index].shouldSend
      );

      if (eligibleUserIds.length === 0) {
        console.log("No users have enabled MEETING_SCHEDULED notifications");
        return;
      }

      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.MEETING_SCHEDULED,
          title: "Interview Scheduled",
          message: `Interview scheduled between ${params.interviewerName} and ${params.candidateName}`,
          relatedEntity: "meeting",
          relatedId: params.candidateId,
          actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: "medium",
          metadata: {
            candidateName: params.candidateName,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
            interviewerName: params.interviewerName,
            meetingDate: params.meetingDate,
          },
        },
        eligibleUserIds
      );

      console.log(
        `Sent in-app notifications to ${eligibleUserIds.length + (decisions[0]?.shouldSend ? 1 : 0)} users`
      );
    } catch (error) {
      console.error("Failed to send meeting scheduled notification:", error);
    }
  }

  static async notifyChecklistCompleted(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    try {
      await connectToDatabase();
      const adminHrIds = await this.getUsersByRole(params.organizationId, [
        "admin",
        "hr",
      ]);
      const filteredAdminHrIds = adminHrIds.filter(
        (id) => id !== params.triggerUserId
      );

      if (filteredAdminHrIds.length === 0) {
        console.log("No eligible recipients for notification");
        return;
      }

      const decisionContexts: NotificationDecisionContext[] =
        filteredAdminHrIds.map((userId) => ({
          organizationId: params.organizationId,
          recipientUserId: userId,
          notificationType: NotificationType.STEP_COMPLETED,
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        }));

      const decisions = await batchCheckNotifications(decisionContexts);
      const eligibleUserIds = filteredAdminHrIds.filter(
        (userId, index) => decisions[index].shouldSend
      );

      if (eligibleUserIds.length === 0) {
        console.log("No users have enabled STEP_COMPLETED notifications");
        return;
      }

      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.CHECKLIST_COMPLETED,
          title: "Checklist Completed",
          message: `${params.triggerUserName} completed checklist for ${params.candidateName}`,
          relatedEntity: "checklist",
          relatedId: params.candidateId,
          actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: "medium",
          metadata: {
            candidateName: params.candidateName,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
          },
        },
        eligibleUserIds
      );

      console.log(
        `Sent in-app notifications to ${eligibleUserIds.length} users`
      );
    } catch (error) {
      console.error("Failed to send checklist completed notification:", error);
    }
  }

  static async notifyJobCreated(params: {
    organizationId: string;
    jobId: string;
    jobTitle: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    try {
      await connectToDatabase();
      const allUserIds = await this.getUsersByRole(params.organizationId, [
        "admin",
        "hr",
      ]);
      const filteredUserIds = allUserIds.filter(
        (id) => id !== params.triggerUserId
      );

      if (filteredUserIds.length === 0) {
        console.log("No eligible recipients for notification");
        return;
      }

      const decisionContexts: NotificationDecisionContext[] =
        filteredUserIds.map((userId) => ({
          organizationId: params.organizationId,
          recipientUserId: userId,
          notificationType: NotificationType.JOB_CREATED, // Assume always enabled if not in settings
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        }));

      const decisions = await batchCheckNotifications(decisionContexts);
      const eligibleUserIds = filteredUserIds.filter(
        (userId, index) => decisions[index].shouldSend
      );

      if (eligibleUserIds.length === 0) {
        console.log("No users have enabled JOB_CREATED notifications");
        return;
      }

      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.JOB_CREATED,
          title: "New Job Created",
          message: `${params.triggerUserName} created a new job: ${params.jobTitle}`,
          relatedEntity: "job",
          relatedId: params.jobId,
          actionUrl: `/dashboard/jobs/${params.jobId}`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: "medium",
          metadata: {
            jobTitle: params.jobTitle,
            jobId: params.jobId,
          },
        },
        eligibleUserIds
      );

      console.log(
        `Sent in-app notifications to ${eligibleUserIds.length} users`
      );
    } catch (error) {
      console.error("Failed to send job created notification:", error);
    }
  }

  static async notifyUserAdded(params: {
    organizationId: string;
    newUserId: string;
    newUserName: string;
    newUserEmail: string;
    newUserRole: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    try {
      await connectToDatabase();
      const adminIds = await this.getUsersByRole(params.organizationId, [
        "admin",
        "hr",
      ]);
      const filteredAdminIds = adminIds.filter(
        (id) => id !== params.triggerUserId && id !== params.newUserId
      );

      if (filteredAdminIds.length === 0) {
        console.log("No eligible recipients for notification");
        return;
      }

      const decisionContexts: NotificationDecisionContext[] =
        filteredAdminIds.map((userId) => ({
          organizationId: params.organizationId,
          recipientUserId: userId,
          notificationType: NotificationType.USER_ADDED, // Assume always enabled
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        }));

      const decisions = await batchCheckNotifications(decisionContexts);
      const eligibleUserIds = filteredAdminIds.filter(
        (userId, index) => decisions[index].shouldSend
      );

      if (eligibleUserIds.length === 0) {
        console.log("No users have enabled USER_ADDED notifications");
        return;
      }

      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.USER_ADDED,
          title: "New User Added",
          message: `${params.triggerUserName} added ${params.newUserName} as ${params.newUserRole}`,
          relatedEntity: "user",
          relatedId: params.newUserId,
          actionUrl: `/dashboard/users`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: "medium",
          metadata: {
            newUserName: params.newUserName,
            newUserEmail: params.newUserEmail,
            newUserRole: params.newUserRole,
          },
        },
        eligibleUserIds
      );

      console.log(
        `Sent in-app notifications to ${eligibleUserIds.length} users`
      );
    } catch (error) {
      console.error("Failed to send user added notification:", error);
    }
  }

  static async notifyCandidateDetailsUpdated(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    try {
      await connectToDatabase();
      const adminHrIds = await this.getUsersByRole(params.organizationId, [
        "admin",
        "hr",
      ]);
      const filteredAdminHrIds = adminHrIds.filter(
        (id) => id !== params.triggerUserId
      );

      if (filteredAdminHrIds.length === 0) {
        console.log("No eligible recipients for notification");
        return;
      }

      const decisionContexts: NotificationDecisionContext[] =
        filteredAdminHrIds.map((userId) => ({
          organizationId: params.organizationId,
          recipientUserId: userId,
          notificationType: NotificationType.CANDIDATE_DETAILS_UPDATED, // Assume always enabled
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        }));

      const decisions = await batchCheckNotifications(decisionContexts);
      const eligibleUserIds = filteredAdminHrIds.filter(
        (userId, index) => decisions[index].shouldSend
      );

      if (eligibleUserIds.length === 0) {
        console.log(
          "No users have enabled CANDIDATE_DETAILS_UPDATED notifications"
        );
        return;
      }

      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.CANDIDATE_DETAILS_UPDATED,
          title: "Candidate Details Updated",
          message: `${params.triggerUserName} updated details for ${params.candidateName}`,
          relatedEntity: "candidate",
          relatedId: params.candidateId,
          actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: "low",
          metadata: {
            candidateName: params.candidateName,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
          },
        },
        eligibleUserIds
      );

      console.log(
        `Sent in-app notifications to ${eligibleUserIds.length} users`
      );
    } catch (error) {
      console.error(
        "Failed to send candidate details updated notification:",
        error
      );
    }
  }

  static async notifyCandidateUnassigned(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    previousInterviewerId: string;
    previousInterviewerName: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    try {
      await connectToDatabase();

      // Notify the previous interviewer
      if (params.previousInterviewerId !== params.triggerUserId) {
        const decisionContext: NotificationDecisionContext = {
          organizationId: params.organizationId,
          recipientUserId: params.previousInterviewerId,
          notificationType: NotificationType.STEP_COMPLETED, // Assume always enabled
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        };

        const decision = await batchCheckNotifications([decisionContext]);
        if (decision[0].shouldSend) {
          await this.createNotification({
            organizationId: params.organizationId,
            recipientId: params.previousInterviewerId,
            type: NotificationType.STEP_COMPLETED,
            title: "Candidate Unassigned",
            message: `You are no longer assigned to interview ${params.candidateName}`,
            relatedEntity: "candidate",
            relatedId: params.candidateId,
            actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
            triggerUserId: params.triggerUserId,
            triggerUserName: params.triggerUserName,
            priority: "medium",
            metadata: {
              candidateName: params.candidateName,
              jobTitle: params.jobTitle,
              jobId: params.jobId,
              previousInterviewerName: params.previousInterviewerName,
            },
          });
        }
      }

      // Notify admin/hr
      const adminHrIds = await this.getUsersByRole(params.organizationId, [
        "admin",
        "hr",
      ]);
      const filteredAdminHrIds = adminHrIds.filter(
        (id) => id !== params.triggerUserId
      );

      if (filteredAdminHrIds.length === 0) {
        console.log("No eligible admin/hr recipients for notification");
        return;
      }

      const decisionContexts: NotificationDecisionContext[] =
        filteredAdminHrIds.map((userId) => ({
          organizationId: params.organizationId,
          recipientUserId: userId,
          notificationType: NotificationType.STEP_COMPLETED,
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        }));

      const decisions = await batchCheckNotifications(decisionContexts);
      const eligibleUserIds = filteredAdminHrIds.filter(
        (userId, index) => decisions[index].shouldSend
      );

      if (eligibleUserIds.length === 0) {
        console.log("No users have enabled CANDIDATE_UNASSIGNED notifications");
        return;
      }

      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.STEP_COMPLETED,
          title: "Candidate Unassigned",
          message: `${params.previousInterviewerName} are no longer assigned to interview ${params.candidateName}`,
          relatedEntity: "candidate",
          relatedId: params.candidateId,
          actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: "medium",
          metadata: {
            candidateName: params.candidateName,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
            previousInterviewerName: params.previousInterviewerName,
          },
        },
        eligibleUserIds
      );

      console.log(
        `Sent in-app notifications to ${eligibleUserIds.length + (decisions[0]?.shouldSend ? 1 : 0)} users`
      );
    } catch (error) {
      console.error("Failed to send candidate unassigned notification:", error);
    }
  }

  static async notifyMeetingUpdated(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    interviewerId: string;
    interviewerName: string;
    meetingDate: Date;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    try {
      await connectToDatabase();

      // Notify the interviewer
      if (params.interviewerId !== params.triggerUserId) {
        const decisionContext: NotificationDecisionContext = {
          organizationId: params.organizationId,
          recipientUserId: params.interviewerId,
          notificationType: NotificationType.MEETING_UPDATED,
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        };

        const decision = await batchCheckNotifications([decisionContext]);
        if (decision[0].shouldSend) {
          await this.createNotification({
            organizationId: params.organizationId,
            recipientId: params.interviewerId,
            type: NotificationType.MEETING_UPDATED,
            title: "Meeting Updated",
            message: `Meeting with ${params.candidateName} has been updated`,
            relatedEntity: "meeting",
            relatedId: params.candidateId,
            actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
            triggerUserId: params.triggerUserId,
            triggerUserName: params.triggerUserName,
            priority: "high",
            metadata: {
              candidateName: params.candidateName,
              jobTitle: params.jobTitle,
              jobId: params.jobId,
              interviewerName: params.interviewerName,
              meetingDate: params.meetingDate.toISOString(),
            },
          });
        }
      }

      // Notify admin/hr
      const adminHrIds = await this.getUsersByRole(params.organizationId, [
        "admin",
        "hr",
      ]);
      const filteredAdminHrIds = adminHrIds.filter(
        (id) => id !== params.triggerUserId
      );

      if (filteredAdminHrIds.length === 0) {
        console.log("No eligible admin/hr recipients for notification");
        return;
      }

      const decisionContexts: NotificationDecisionContext[] =
        filteredAdminHrIds.map((userId) => ({
          organizationId: params.organizationId,
          recipientUserId: userId,
          notificationType: NotificationType.MEETING_UPDATED,
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        }));

      const decisions = await batchCheckNotifications(decisionContexts);
      const eligibleUserIds = filteredAdminHrIds.filter(
        (userId, index) => decisions[index].shouldSend
      );

      if (eligibleUserIds.length === 0) {
        console.log("No users have enabled MEETING_UPDATED notifications");
        return;
      }

      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.MEETING_UPDATED,
          title: "Meeting Updated",
          message: `Meeting between ${params.interviewerName} and ${params.candidateName} has been updated`,
          relatedEntity: "meeting",
          relatedId: params.candidateId,
          actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: "medium",
          metadata: {
            candidateName: params.candidateName,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
            interviewerName: params.interviewerName,
            meetingDate: params.meetingDate.toISOString(),
          },
        },
        eligibleUserIds
      );

      console.log(
        `Sent in-app notifications to ${eligibleUserIds.length + (decisions[0]?.shouldSend ? 1 : 0)} users`
      );
    } catch (error) {
      console.error("Failed to send meeting updated notification:", error);
    }
  }

  static async notifyMeetingCancelled(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    interviewerId: string;
    interviewerName: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    try {
      await connectToDatabase();

      // Notify the interviewer
      if (params.interviewerId !== params.triggerUserId) {
        const decisionContext: NotificationDecisionContext = {
          organizationId: params.organizationId,
          recipientUserId: params.interviewerId,
          notificationType: NotificationType.MEETING_CANCELLED,
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        };

        const decision = await batchCheckNotifications([decisionContext]);
        if (decision[0].shouldSend) {
          await this.createNotification({
            organizationId: params.organizationId,
            recipientId: params.interviewerId,
            type: NotificationType.MEETING_CANCELLED,
            title: "Meeting Cancelled",
            message: `Meeting with ${params.candidateName} has been cancelled`,
            relatedEntity: "meeting",
            relatedId: params.candidateId,
            actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
            triggerUserId: params.triggerUserId,
            triggerUserName: params.triggerUserName,
            priority: "high",
            metadata: {
              candidateName: params.candidateName,
              jobTitle: params.jobTitle,
              jobId: params.jobId,
              interviewerName: params.interviewerName,
            },
          });
        }
      }

      // Notify admin/hr
      const adminHrIds = await this.getUsersByRole(params.organizationId, [
        "admin",
        "hr",
      ]);
      const filteredAdminHrIds = adminHrIds.filter(
        (id) => id !== params.triggerUserId
      );

      if (filteredAdminHrIds.length === 0) {
        console.log("No eligible admin/hr recipients for notification");
        return;
      }

      const decisionContexts: NotificationDecisionContext[] =
        filteredAdminHrIds.map((userId) => ({
          organizationId: params.organizationId,
          recipientUserId: userId,
          notificationType: NotificationType.MEETING_CANCELLED,
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        }));

      const decisions = await batchCheckNotifications(decisionContexts);
      const eligibleUserIds = filteredAdminHrIds.filter(
        (userId, index) => decisions[index].shouldSend
      );

      if (eligibleUserIds.length === 0) {
        console.log("No users have enabled MEETING_CANCELLED notifications");
        return;
      }

      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.MEETING_CANCELLED,
          title: "Meeting Cancelled",
          message: `Meeting between ${params.interviewerName} and ${params.candidateName} has been cancelled`,
          relatedEntity: "meeting",
          relatedId: params.candidateId,
          actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: "medium",
          metadata: {
            candidateName: params.candidateName,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
            interviewerName: params.interviewerName,
          },
        },
        eligibleUserIds
      );

      console.log(
        `Sent in-app notifications to ${eligibleUserIds.length + (decisions[0]?.shouldSend ? 1 : 0)} users`
      );
    } catch (error) {
      console.error("Failed to send meeting cancelled notification:", error);
    }
  }

  static async notifyFollowUpAdded(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    followupNote: string;
    followupDate?: Date;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    try {
      await connectToDatabase();
      const adminHrIds = await this.getUsersByRole(params.organizationId, [
        "admin",
        "hr",
      ]);
      const filteredAdminHrIds = adminHrIds.filter(
        (id) => id !== params.triggerUserId
      );

      if (filteredAdminHrIds.length === 0) {
        console.log("No eligible recipients for notification");
        return;
      }

      const decisionContexts: NotificationDecisionContext[] =
        filteredAdminHrIds.map((userId) => ({
          organizationId: params.organizationId,
          recipientUserId: userId,
          notificationType: NotificationType.FOLLOWUP_ADDED, // Assume always enabled
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        }));

      const decisions = await batchCheckNotifications(decisionContexts);
      const eligibleUserIds = filteredAdminHrIds.filter(
        (userId, index) => decisions[index].shouldSend
      );

      if (eligibleUserIds.length === 0) {
        console.log("No users have enabled FOLLOWUP_ADDED notifications");
        return;
      }

      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.FOLLOWUP_ADDED,
          title: "Follow-up Added",
          message: `${params.triggerUserName} added a follow-up for ${params.candidateName}`,
          relatedEntity: "followup",
          relatedId: params.candidateId,
          actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: "low",
          metadata: {
            candidateName: params.candidateName,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
            followupNote:
              params.followupNote.substring(0, 100) +
              (params.followupNote.length > 100 ? "..." : ""),
            followupDate: params.followupDate,
          },
        },
        eligibleUserIds
      );

      console.log(
        `Sent in-app notifications to ${eligibleUserIds.length} users`
      );
    } catch (error) {
      console.error("Failed to send follow-up added notification:", error);
    }
  }

  static async notifyFollowupUpdated(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    try {
      await connectToDatabase();
      const adminHrIds = await this.getUsersByRole(params.organizationId, [
        "admin",
        "hr",
      ]);
      const filteredAdminHrIds = adminHrIds.filter(
        (id) => id !== params.triggerUserId
      );

      if (filteredAdminHrIds.length === 0) {
        console.log("No eligible recipients for notification");
        return;
      }

      const decisionContexts: NotificationDecisionContext[] =
        filteredAdminHrIds.map((userId) => ({
          organizationId: params.organizationId,
          recipientUserId: userId,
          notificationType: NotificationType.FOLLOWUP_UPDATED,
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        }));

      const decisions = await batchCheckNotifications(decisionContexts);
      const eligibleUserIds = filteredAdminHrIds.filter(
        (userId, index) => decisions[index].shouldSend
      );

      if (eligibleUserIds.length === 0) {
        console.log("No users have enabled FOLLOWUP_UPDATED notifications");
        return;
      }

      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.FOLLOWUP_UPDATED,
          title: "Follow-up Updated",
          message: `${params.triggerUserName} updated a follow-up for ${params.candidateName}`,
          relatedEntity: "followup",
          relatedId: params.candidateId,
          actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: "low",
          metadata: {
            candidateName: params.candidateName,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
          },
        },
        eligibleUserIds
      );

      console.log(
        `Sent in-app notifications to ${eligibleUserIds.length} users`
      );
    } catch (error) {
      console.error("Failed to send follow-up updated notification:", error);
    }
  }

  static async notifyFollowupRemoved(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    try {
      await connectToDatabase();
      const adminHrIds = await this.getUsersByRole(params.organizationId, [
        "admin",
        "hr",
      ]);
      const filteredAdminHrIds = adminHrIds.filter(
        (id) => id !== params.triggerUserId
      );

      if (filteredAdminHrIds.length === 0) {
        console.log("No eligible recipients for notification");
        return;
      }

      const decisionContexts: NotificationDecisionContext[] =
        filteredAdminHrIds.map((userId) => ({
          organizationId: params.organizationId,
          recipientUserId: userId,
          notificationType: NotificationType.FOLLOWUP_REMOVED,
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        }));

      const decisions = await batchCheckNotifications(decisionContexts);
      const eligibleUserIds = filteredAdminHrIds.filter(
        (userId, index) => decisions[index].shouldSend
      );

      if (eligibleUserIds.length === 0) {
        console.log("No users have enabled FOLLOWUP_REMOVED notifications");
        return;
      }

      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.FOLLOWUP_REMOVED,
          title: "Follow-up Removed",
          message: `${params.triggerUserName} removed a follow-up for ${params.candidateName}`,
          relatedEntity: "followup",
          relatedId: params.candidateId,
          actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: "low",
          metadata: {
            candidateName: params.candidateName,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
          },
        },
        eligibleUserIds
      );

      console.log(
        `Sent in-app notifications to ${eligibleUserIds.length} users`
      );
    } catch (error) {
      console.error("Failed to send follow-up removed notification:", error);
    }
  }

  static async notifyJobUpdated(params: {
    organizationId: string;
    jobId: string;
    jobTitle: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    try {
      await connectToDatabase();
      const allUserIds = await this.getUsersByRole(params.organizationId, [
        "admin",
        "hr",
        "interviewer",
      ]);
      const filteredUserIds = allUserIds.filter(
        (id) => id !== params.triggerUserId
      );

      if (filteredUserIds.length === 0) {
        console.log("No eligible recipients for notification");
        return;
      }

      const decisionContexts: NotificationDecisionContext[] =
        filteredUserIds.map((userId) => ({
          organizationId: params.organizationId,
          recipientUserId: userId,
          notificationType: NotificationType.JOB_UPDATED,
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        }));

      const decisions = await batchCheckNotifications(decisionContexts);
      const eligibleUserIds = filteredUserIds.filter(
        (userId, index) => decisions[index].shouldSend
      );

      if (eligibleUserIds.length === 0) {
        console.log("No users have enabled JOB_UPDATED notifications");
        return;
      }

      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.JOB_UPDATED,
          title: "Job Updated",
          message: `${params.triggerUserName} updated job: ${params.jobTitle}`,
          relatedEntity: "job",
          relatedId: params.jobId,
          actionUrl: `/dashboard/jobs/${params.jobId}`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: "low",
          metadata: {
            jobTitle: params.jobTitle,
            jobId: params.jobId,
          },
        },
        eligibleUserIds
      );

      console.log(
        `Sent in-app notifications to ${eligibleUserIds.length} users`
      );
    } catch (error) {
      console.error("Failed to send job updated notification:", error);
    }
  }

  static async notifyBulkImportCompleted(params: {
    organizationId: string;
    batchId: string;
    successCount: number;
    failureCount: number;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    try {
      await connectToDatabase();
      const adminHrIds = await this.getUsersByRole(params.organizationId, [
        "admin",
        "hr",
      ]);
      const filteredAdminHrIds = adminHrIds.filter(
        (id) => id !== params.triggerUserId
      );

      if (filteredAdminHrIds.length === 0) {
        console.log("No eligible recipients for notification");
        return;
      }

      const decisionContexts: NotificationDecisionContext[] =
        filteredAdminHrIds.map((userId) => ({
          organizationId: params.organizationId,
          recipientUserId: userId,
          notificationType: NotificationType.BULK_IMPORT_COMPLETED,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        }));

      const decisions = await batchCheckNotifications(decisionContexts);
      const eligibleUserIds = filteredAdminHrIds.filter(
        (userId, index) => decisions[index].shouldSend
      );

      if (eligibleUserIds.length === 0) {
        console.log(
          "No users have enabled BULK_IMPORT_COMPLETED notifications"
        );
        return;
      }

      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.BULK_IMPORT_COMPLETED,
          title: "Bulk Import Completed",
          message: `${params.triggerUserName} completed processing a CV batch with ${params.successCount} successful and ${params.failureCount} failed items`,
          relatedEntity: "cvBatch",
          relatedId: params.batchId,
          actionUrl: `/dashboard/cv-upload`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: "medium",
          metadata: {
            batchId: params.batchId,
            successCount: params.successCount,
            failureCount: params.failureCount,
          },
        },
        eligibleUserIds
      );

      console.log(
        `Sent in-app notifications to ${eligibleUserIds.length} users`
      );
    } catch (error) {
      console.error(
        "Failed to send bulk import completed notification:",
        error
      );
    }
  }

  static async notifyCandidateRejected(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    try {
      await connectToDatabase();
      const adminHrIds = await this.getUsersByRole(params.organizationId, [
        "admin",
        "hr",
      ]);
      const filteredAdminHrIds = adminHrIds.filter(
        (id) => id !== params.triggerUserId
      );

      if (filteredAdminHrIds.length === 0) {
        console.log("No eligible recipients for notification");
        return;
      }

      const decisionContexts: NotificationDecisionContext[] =
        filteredAdminHrIds.map((userId) => ({
          organizationId: params.organizationId,
          recipientUserId: userId,
          notificationType: NotificationType.CANDIDATE_REJECTED,
          jobId: params.jobId,
          triggererUserId: params.triggerUserId,
          isMention: false,
          notificationCategory: "email",
        }));

      const decisions = await batchCheckNotifications(decisionContexts);
      const eligibleUserIds = filteredAdminHrIds.filter(
        (userId, index) => decisions[index].shouldSend
      );

      if (eligibleUserIds.length === 0) {
        console.log("No users have enabled CANDIDATE_REJECTED notifications");
        return;
      }

      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.CANDIDATE_REJECTED,
          title: "Candidate Rejected",
          message: `${params.triggerUserName} rejected ${params.candidateName} for ${params.jobTitle}`,
          relatedEntity: "candidate",
          relatedId: params.candidateId,
          actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: "medium",
          metadata: {
            candidateName: params.candidateName,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
          },
        },
        eligibleUserIds
      );

      console.log(
        `Sent in-app notifications to ${eligibleUserIds.length} users`
      );
    } catch (error) {
      console.error("Failed to send candidate rejected notification:", error);
    }
  }

  /**
   * Notify when meeting invite is accepted
   */
  static async notifyMeetingInviteAccepted(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    attendeeEmail: string;
    attendeeName: string;
    interviewerId?: string;
    interviewerName?: string;
    meetingDate?: Date;
  }) {
    // Notify the organizer/interviewer
    if (params.interviewerId) {
      await this.createNotification({
        organizationId: params.organizationId,
        recipientId: params.interviewerId,
        type: NotificationType.MEETING_INVITE_ACCEPTED,
        title: "Meeting Invite Accepted",
        message: `${params.attendeeName} has accepted the interview invitation with ${params.candidateName}`,
        relatedEntity: "meeting",
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        priority: "medium",
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
          attendeeEmail: params.attendeeEmail,
          attendeeName: params.attendeeName,
          interviewerName: params.interviewerName,
          meetingDate: params.meetingDate,
        },
      });
    }

    // Notify admin/hr
    const adminHrIds = await this.getUsersByRole(params.organizationId, [
      "admin",
      "hr",
    ]);
    const filteredAdminHrIds = adminHrIds.filter(
      (id) => id !== params.interviewerId
    );

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.MEETING_INVITE_ACCEPTED,
          title: "Meeting Invite Accepted",
          message: `${params.attendeeName} has accepted the interview invitation with ${params.candidateName}`,
          relatedEntity: "meeting",
          relatedId: params.candidateId,
          actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
          priority: "medium",
          metadata: {
            candidateName: params.candidateName,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
            attendeeEmail: params.attendeeEmail,
            attendeeName: params.attendeeName,
            interviewerName: params.interviewerName,
            meetingDate: params.meetingDate,
          },
        },
        filteredAdminHrIds
      );
    }
  }

  /**
   * Notify when meeting invite is declined
   */
  static async notifyMeetingInviteDeclined(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    attendeeEmail: string;
    attendeeName: string;
    interviewerId?: string;
    interviewerName?: string;
    meetingDate?: Date;
  }) {
    // High priority notification to the organizer/interviewer
    if (params.interviewerId) {
      await this.createNotification({
        organizationId: params.organizationId,
        recipientId: params.interviewerId,
        type: NotificationType.MEETING_INVITE_DECLINED,
        title: "Meeting Invite Declined",
        message: `⚠️ ${params.attendeeName} has declined the interview invitation with ${params.candidateName}`,
        relatedEntity: "meeting",
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        priority: "high",
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
          attendeeEmail: params.attendeeEmail,
          attendeeName: params.attendeeName,
          interviewerName: params.interviewerName,
          meetingDate: params.meetingDate,
        },
      });
    }

    // High priority notification to admin/hr
    const adminHrIds = await this.getUsersByRole(params.organizationId, [
      "admin",
      "hr",
    ]);
    const filteredAdminHrIds = adminHrIds.filter(
      (id) => id !== params.interviewerId
    );

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.MEETING_INVITE_DECLINED,
          title: "Meeting Invite Declined - Action Required",
          message: `⚠️ ${params.attendeeName} has declined the interview invitation with ${params.candidateName}. Consider rescheduling.`,
          relatedEntity: "meeting",
          relatedId: params.candidateId,
          actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
          priority: "high",
          metadata: {
            candidateName: params.candidateName,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
            attendeeEmail: params.attendeeEmail,
            attendeeName: params.attendeeName,
            interviewerName: params.interviewerName,
            meetingDate: params.meetingDate,
          },
        },
        filteredAdminHrIds
      );
    }
  }

  /**
   * Notify when meeting invite is tentatively accepted
   */
  static async notifyMeetingInviteTentative(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    attendeeEmail: string;
    attendeeName: string;
    interviewerId?: string;
    interviewerName?: string;
    meetingDate?: Date;
  }) {
    // Notify the organizer/interviewer
    if (params.interviewerId) {
      await this.createNotification({
        organizationId: params.organizationId,
        recipientId: params.interviewerId,
        type: NotificationType.MEETING_INVITE_TENTATIVE,
        title: "Meeting Invite - Maybe",
        message: `${params.attendeeName} tentatively accepted the interview invitation with ${params.candidateName}`,
        relatedEntity: "meeting",
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        priority: "medium",
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
          attendeeEmail: params.attendeeEmail,
          attendeeName: params.attendeeName,
          interviewerName: params.interviewerName,
          meetingDate: params.meetingDate,
        },
      });
    }

    // Notify admin/hr
    const adminHrIds = await this.getUsersByRole(params.organizationId, [
      "admin",
      "hr",
    ]);
    const filteredAdminHrIds = adminHrIds.filter(
      (id) => id !== params.interviewerId
    );

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.MEETING_INVITE_TENTATIVE,
          title: "Meeting Invite - Maybe",
          message: `${params.attendeeName} tentatively accepted the interview invitation with ${params.candidateName}`,
          relatedEntity: "meeting",
          relatedId: params.candidateId,
          actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
          priority: "medium",
          metadata: {
            candidateName: params.candidateName,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
            attendeeEmail: params.attendeeEmail,
            attendeeName: params.attendeeName,
            interviewerName: params.interviewerName,
            meetingDate: params.meetingDate,
          },
        },
        filteredAdminHrIds
      );
    }
  }

  /**
   * Notify when interview is completed
   */
  static async notifyInterviewCompleted(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    interviewerId: string;
    interviewerName: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    const adminHrIds = await this.getUsersByRole(params.organizationId, [
      "admin",
      "hr",
    ]);
    const filteredAdminHrIds = adminHrIds.filter(
      (id) => id !== params.triggerUserId
    );

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications(
        {
          organizationId: params.organizationId,
          type: NotificationType.INTERVIEW_COMPLETED,
          title: "Interview Completed",
          message: `${params.interviewerName} completed interview with ${params.candidateName}`,
          relatedEntity: "candidate",
          relatedId: params.candidateId,
          actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
          triggerUserId: params.triggerUserId,
          triggerUserName: params.triggerUserName,
          priority: "medium",
          metadata: {
            candidateName: params.candidateName,
            jobTitle: params.jobTitle,
            jobId: params.jobId,
            interviewerName: params.interviewerName,
          },
        },
        filteredAdminHrIds
      );
    }
  }
}
