import connectToDatabase, { Notification, User } from "@/lib/mongodb";
import { NotificationType, INotification } from "@/lib/models/notification";

interface CreateNotificationParams {
  organizationId: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntity: 'candidate' | 'job' | 'user' | 'meeting' | 'followup' | 'checklist' | 'system' | 'cvBatch';
  relatedId?: string;
  actionUrl?: string;
  triggerUserId?: string;
  triggerUserName?: string;
  priority?: 'high' | 'medium' | 'low';
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Create a single notification
   */
  static async createNotification(params: CreateNotificationParams): Promise<INotification | null> {
    try {
      await connectToDatabase();

      if (!Notification) {
        throw new Error('Notification model not available');
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
        priority: params.priority || 'medium',
        metadata: params.metadata || {},
        isRead: false,
      });

      return notification.toObject();
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      return null;
    }
  }

  /**
   * Create notifications for multiple recipients
   */
  static async createBulkNotifications(
    baseParams: Omit<CreateNotificationParams, 'recipientId'>,
    recipientIds: string[]
  ): Promise<INotification[]> {
    try {
      // console.log('📦 Creating bulk notifications for recipients:', recipientIds);
      await connectToDatabase();

      if (!Notification) {
        console.error('❌ Notification model not available');
        throw new Error('Notification model not available');
      }
      const recipients = [
        ...recipientIds,
        ...(baseParams.triggerUserId && baseParams.triggerUserId !== "" ? [baseParams.triggerUserId] : [])
      ];
      const notifications = recipients.map(recipientId => ({
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
        priority: baseParams.priority || 'medium',
        metadata: baseParams.metadata || {},
        isRead: false,
      }));

      const createdNotifications = await Notification.insertMany(notifications);
      // console.log(createdNotifications, "Cretededdddd ***");

      return createdNotifications.map(n => n.toObject());
    } catch (error) {
      console.error('❌ Error creating bulk notifications:', error);
      return [];
    }
  }

  /**
   * Get users by role in organization
   */
  static async getUsersByRole(organizationId: string, roles: string[]): Promise<string[]> {
    try {
      await connectToDatabase();

      if (!User) {
        throw new Error('User model not available');
      }

      const users = await User.find({
        organizationId,
        role: { $in: roles },
        isDeleted: { $ne: true },
      }).select('_id role name email');

      return users.map(user => user._id.toString());
    } catch (error) {
      console.error('❌ Error getting users by role:', error);
      return [];
    }
  }

  // Candidate-related notifications

  /**
   * Notify when a candidate applies
   */
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


    const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
    const filteredAdminHrIds = adminHrIds.filter(id => id !== params.triggerUserId);
    // console.log(adminHrIds, "'Adminsss");
    // console.log(filteredAdminHrIds, "'filteredAdminHrIds");

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.CANDIDATE_APPLIED,
        title: 'New Candidate Application',
        message: `${params.candidateName} has applied for ${params.jobTitle}`,
        relatedEntity: 'candidate',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'high',
        metadata: {
          candidateName: params.candidateName,
          candidateEmail: params.candidateEmail,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
        },
      }, filteredAdminHrIds);
    }
  }

  /**
   * Notify when candidate status is updated
   */
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
    const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);

    await this.createBulkNotifications({
      organizationId: params.organizationId,
      type: NotificationType.CANDIDATE_STATUS_UPDATED,
      title: 'Candidate Status Updated',
      message: `${params.candidateName} moved from ${params.oldStatus} to ${params.newStatus}`,
      relatedEntity: 'candidate',
      relatedId: params.candidateId,
      actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
      triggerUserId: params.triggerUserId,
      triggerUserName: params.triggerUserName,
      priority: 'medium',
      metadata: {
        candidateName: params.candidateName,
        jobTitle: params.jobTitle,
        jobId: params.jobId,
        oldStatus: params.oldStatus,
        newStatus: params.newStatus,
      },
    }, adminHrIds);
  }

  /**
   * Notify when candidate is assigned to interviewer
   */
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
    // console.log(params, "Notify the previous interviewer");

    // Notify the interviewer
    await this.createNotification({
      organizationId: params.organizationId,
      recipientId: params.interviewerId,
      type: NotificationType.CANDIDATE_ASSIGNED,
      title: 'Candidate Assigned',
      message: `You have been assigned to interview ${params.candidateName} for ${params.jobTitle}`,
      relatedEntity: 'candidate',
      relatedId: params.candidateId,
      actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
      triggerUserId: params.triggerUserId,
      triggerUserName: params.triggerUserName,
      priority: 'high',
      metadata: {
        candidateName: params.candidateName,
        jobTitle: params.jobTitle,
        jobId: params.jobId,
        interviewerName: params.interviewerName,
      },
    });

    // Also notify admin/hr
    const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
    const filteredAdminHrIds = adminHrIds.filter(id => id !== params.triggerUserId);

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.CANDIDATE_ASSIGNED,
        title: 'Candidate Assigned',
        message: `${params.candidateName} has been assigned to ${params.interviewerName}`,
        relatedEntity: 'candidate',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
          interviewerName: params.interviewerName,
        },
      }, filteredAdminHrIds);
    }
  }

  /**
   * Notify when a remark is added
   */
  // static async notifyRemarkAdded(params: {
  //   organizationId: string;
  //   candidateId: string;
  //   candidateName: string;
  //   jobId: string;
  //   jobTitle: string;
  //   remarkText: string;
  //   triggerUserId: string;
  //   triggerUserName: string;
  // }) {



  //   const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
  //   const filteredAdminHrIds = adminHrIds.filter(id => id !== params.triggerUserId);

  //   if (filteredAdminHrIds.length > 0) {
  //     await this.createBulkNotifications({
  //       organizationId: params.organizationId,
  //       type: NotificationType.REMARK_ADDED,
  //       title: 'New Remark Added',
  //       message: `${params.triggerUserName} added a remark for ${params.candidateName}`,
  //       relatedEntity: 'candidate',
  //       relatedId: params.candidateId,
  //       actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
  //       triggerUserId: params.triggerUserId,
  //       triggerUserName: params.triggerUserName,
  //       priority: 'low',
  //       metadata: {
  //         candidateName: params.candidateName,
  //         jobTitle: params.jobTitle,
  //         jobId: params.jobId,
  //         remarkText: params.remarkText.substring(0, 100) + (params.remarkText.length > 100 ? '...' : ''),
  //       },
  //     }, filteredAdminHrIds);
  //   }
  // }
  static async notifyRemarkAdded(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    remarkText: string;
    triggerUserId: string;
    triggerUserName: string;
    roles: string[]; // Add roles parameter to specify which roles to notify
  }) {
    // Fetch users by specified roles

    // console.log(params, "neww paramsss == = =");

    const userIds = await this.getUsersByRole(params.organizationId, params.roles);
    const filteredUserIds = userIds.filter(id => id !== params.triggerUserId);

    if (filteredUserIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.REMARK_ADDED,
        title: 'New Remark Added',
        message: `${params.triggerUserName} added a remark for ${params.candidateName}`,
        relatedEntity: 'candidate',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'low',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
          remarkText: params.remarkText.substring(0, 100) + (params.remarkText.length > 100 ? '...' : ''),
        },
      }, filteredUserIds);
    }
  }
  /**
   * Notify when a meeting is scheduled
   */
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
    // console.log(params, "Notify the previous interviewer");

    // Notify the interviewer if they're not the one who scheduled it
    if (params.interviewerId !== params.triggerUserId) {
      await this.createNotification({
        organizationId: params.organizationId,
        recipientId: params.interviewerId,
        type: NotificationType.MEETING_SCHEDULED,
        title: 'Interview Scheduled',
        message: `Interview scheduled with ${params.candidateName} for ${params.jobTitle}`,
        relatedEntity: 'meeting',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'high',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
          interviewerName: params.interviewerName,
          meetingDate: params.meetingDate,
        },
      });
    }

    // Notify admin/hr
    const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
    const filteredAdminHrIds = adminHrIds.filter(id => id !== params.triggerUserId);

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.MEETING_SCHEDULED,
        title: 'Interview Scheduled',
        message: `Interview scheduled between ${params.interviewerName} and ${params.candidateName}`,
        relatedEntity: 'meeting',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
          interviewerName: params.interviewerName,
          meetingDate: params.meetingDate,
        },
      }, filteredAdminHrIds);
    }
  }

  /**
   * Notify when a follow-up is added
   */
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
    const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
    const filteredAdminHrIds = adminHrIds.filter(id => id !== params.triggerUserId);

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.FOLLOWUP_ADDED,
        title: 'Follow-up Added',
        message: `${params.triggerUserName} added a follow-up for ${params.candidateName}`,
        relatedEntity: 'followup',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'low',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
          followupNote: params.followupNote.substring(0, 100) + (params.followupNote.length > 100 ? '...' : ''),
          followupDate: params.followupDate,
        },
      }, filteredAdminHrIds);
    }
  }

  // Job-related notifications

  /**
   * Notify when a new job is created
   */
  static async notifyJobCreated(params: {
    organizationId: string;
    jobId: string;
    jobTitle: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    const allUserIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
    const filteredUserIds = allUserIds.filter(id => id !== params.triggerUserId);

    if (filteredUserIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.JOB_CREATED,
        title: 'New Job Created',
        message: `${params.triggerUserName} created a new job: ${params.jobTitle}`,
        relatedEntity: 'job',
        relatedId: params.jobId,
        actionUrl: `/dashboard/jobs/${params.jobId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          jobTitle: params.jobTitle,
          jobId: params.jobId,
        },
      }, filteredUserIds);
    }
  }

  /**
   * Notify when a user is added to organization
   */
  static async notifyUserAdded(params: {
    organizationId: string;
    newUserId: string;
    newUserName: string;
    newUserEmail: string;
    newUserRole: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    const adminIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
    const filteredAdminIds = adminIds.filter(id => id !== params.triggerUserId && id !== params.newUserId);
    // console.log(filteredAdminIds, "ilterids  ======++++  ");

    if (filteredAdminIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.USER_ADDED,
        title: 'New User Added',
        message: `${params.triggerUserName} added ${params.newUserName} as ${params.newUserRole}`,
        relatedEntity: 'user',
        relatedId: params.newUserId,
        actionUrl: `/dashboard/users`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          newUserName: params.newUserName,
          newUserEmail: params.newUserEmail,
          newUserRole: params.newUserRole,
        },
      }, filteredAdminIds);
    }
  }

  /**
   * Notify when candidate details are updated
   */
  static async notifyCandidateDetailsUpdated(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
    const filteredAdminHrIds = adminHrIds.filter(id => id !== params.triggerUserId);

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.CANDIDATE_DETAILS_UPDATED,
        title: 'Candidate Details Updated',
        message: `${params.triggerUserName} updated details for ${params.candidateName}`,
        relatedEntity: 'candidate',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'low',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
        },
      }, filteredAdminHrIds);
    }
  }

  /**
   * Notify when candidate is unassigned
   */
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
    // Notify the previous interviewer
    // console.log(params, "Notify the previous interviewer");

    await this.createNotification({
      organizationId: params.organizationId,
      recipientId: params.previousInterviewerId,
      type: NotificationType.CANDIDATE_UNASSIGNED,
      title: 'Candidate Unassigned',
      message: `You are no longer assigned to interview ${params.candidateName}`,
      relatedEntity: 'candidate',
      relatedId: params.candidateId,
      actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
      triggerUserId: params.triggerUserId,
      triggerUserName: params.triggerUserName,
      priority: 'medium',
      metadata: {
        candidateName: params.candidateName,
        jobTitle: params.jobTitle,
        jobId: params.jobId,
        previousInterviewerName: params.previousInterviewerName,
      },
    });
    // Also notify admin/hr
    const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
    const filteredAdminHrIds = adminHrIds.filter(id => id !== params.triggerUserId);

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.CANDIDATE_UNASSIGNED,
        title: 'Candidate Unassigned',
        message: `${params.previousInterviewerName}  are no longer assigned to interview ${params.candidateName}`,
        relatedEntity: 'candidate',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
          previousInterviewerName: params.previousInterviewerName,
        },
      }, filteredAdminHrIds);
    }

  }

  /**
   * Notify when meeting is updated
   */
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
    // Notify the interviewer
    await this.createNotification({
      organizationId: params.organizationId,
      recipientId: params.interviewerId,
      type: NotificationType.MEETING_UPDATED,
      title: 'Meeting Updated',
      message: `Meeting with ${params.candidateName} has been updated`,
      relatedEntity: 'meeting',
      relatedId: params.candidateId,
      actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
      triggerUserId: params.triggerUserId,
      triggerUserName: params.triggerUserName,
      priority: 'high',
      metadata: {
        candidateName: params.candidateName,
        jobTitle: params.jobTitle,
        jobId: params.jobId,
        interviewerName: params.interviewerName,
        meetingDate: params.meetingDate.toISOString(),
      },
    });

    // Also notify admin/hr
    const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
    const filteredAdminHrIds = adminHrIds.filter(id => id !== params.triggerUserId);

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.MEETING_UPDATED,
        title: 'Meeting Updated',
        message: `Meeting between ${params.interviewerName} and ${params.candidateName} has been updated`,
        relatedEntity: 'meeting',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
          interviewerName: params.interviewerName,
          meetingDate: params.meetingDate.toISOString(),
        },
      }, filteredAdminHrIds);
    }
  }

  /**
   * Notify when meeting is cancelled
   */
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
    // Notify the interviewer
    await this.createNotification({
      organizationId: params.organizationId,
      recipientId: params.interviewerId,
      type: NotificationType.MEETING_CANCELLED,
      title: 'Meeting Cancelled',
      message: `Meeting with ${params.candidateName} has been cancelled`,
      relatedEntity: 'meeting',
      relatedId: params.candidateId,
      actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
      triggerUserId: params.triggerUserId,
      triggerUserName: params.triggerUserName,
      priority: 'high',
      metadata: {
        candidateName: params.candidateName,
        jobTitle: params.jobTitle,
        jobId: params.jobId,
        interviewerName: params.interviewerName,
      },
    });

    // Also notify admin/hr
    const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
    const filteredAdminHrIds = adminHrIds.filter(id => id !== params.triggerUserId);

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.MEETING_CANCELLED,
        title: 'Meeting Cancelled',
        message: `Meeting between ${params.interviewerName} and ${params.candidateName} has been cancelled`,
        relatedEntity: 'meeting',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
          interviewerName: params.interviewerName,
        },
      }, filteredAdminHrIds);
    }
  }

  /**
   * Notify when follow-up is updated
   */
  static async notifyFollowupUpdated(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
    const filteredAdminHrIds = adminHrIds.filter(id => id !== params.triggerUserId);

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.FOLLOWUP_UPDATED,
        title: 'Follow-up Updated',
        message: `${params.triggerUserName} updated a follow-up for ${params.candidateName}`,
        relatedEntity: 'followup',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'low',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
        },
      }, filteredAdminHrIds);
    }
  }

  /**
   * Notify when follow-up is removed
   */
  static async notifyFollowupRemoved(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
    const filteredAdminHrIds = adminHrIds.filter(id => id !== params.triggerUserId);

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.FOLLOWUP_REMOVED,
        title: 'Follow-up Removed',
        message: `${params.triggerUserName} removed a follow-up for ${params.candidateName}`,
        relatedEntity: 'followup',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'low',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
        },
      }, filteredAdminHrIds);
    }
  }

  /**
   * Notify when checklist is completed
   */
  static async notifyChecklistCompleted(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
    const filteredAdminHrIds = adminHrIds.filter(id => id !== params.triggerUserId);

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.CHECKLIST_COMPLETED,
        title: 'Checklist Completed',
        message: `${params.triggerUserName} completed checklist for ${params.candidateName}`,
        relatedEntity: 'checklist',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
        },
      }, filteredAdminHrIds);
    }
  }


  /**
   * Notify when job is updated
   */
  static async notifyJobUpdated(params: {
    organizationId: string;
    jobId: string;
    jobTitle: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    const allUserIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr', 'interviewer']);
    const filteredUserIds = allUserIds.filter(id => id !== params.triggerUserId);

    if (filteredUserIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.JOB_UPDATED,
        title: 'Job Updated',
        message: `${params.triggerUserName} updated job: ${params.jobTitle}`,
        relatedEntity: 'job',
        relatedId: params.jobId,
        actionUrl: `/dashboard/jobs/${params.jobId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'low',
        metadata: {
          jobTitle: params.jobTitle,
          jobId: params.jobId,
        },
      }, filteredUserIds);
    }
  }

  /**
   * Notify when bulk import is completed
   */
  // static async notifyBulkImportCompleted(params: {
  //   organizationId: string;
  //   jobId: string;
  //   jobTitle: string;
  //   importedCount: number;
  //   triggerUserId: string;
  //   triggerUserName: string;
  // }) {
  //   const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
  //   const filteredAdminHrIds = adminHrIds.filter(id => id !== params.triggerUserId);

  //   if (filteredAdminHrIds.length > 0) {
  //     await this.createBulkNotifications({
  //       organizationId: params.organizationId,
  //       type: NotificationType.BULK_IMPORT_COMPLETED,
  //       title: 'Bulk Import Completed',
  //       message: `${params.triggerUserName} imported ${params.importedCount} candidates for ${params.jobTitle}`,
  //       relatedEntity: 'job',
  //       relatedId: params.jobId,
  //       actionUrl: `/dashboard/jobs/${params.jobId}`,
  //       triggerUserId: params.triggerUserId,
  //       triggerUserName: params.triggerUserName,
  //       priority: 'medium',
  //       metadata: {
  //         jobTitle: params.jobTitle,
  //         jobId: params.jobId,
  //         importedCount: params.importedCount,
  //       },
  //     }, filteredAdminHrIds);
  //   }
  // }

  static async notifyBulkImportCompleted(params: {
    organizationId: string;
    batchId: string;
    successCount: number;
    failureCount: number;
    triggerUserId: string;
    triggerUserName: string;
  }) {
    const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
    const filteredAdminHrIds = adminHrIds.filter(id => id !== params.triggerUserId);

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.BULK_IMPORT_COMPLETED,
        title: 'Bulk Import Completed',
        message: `${params.triggerUserName} completed processing a CV batch with ${params.successCount} successful and ${params.failureCount} failed items`,
        relatedEntity: 'cvBatch',
        relatedId: params.batchId,
        actionUrl: `/dashboard/cv-upload`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          batchId: params.batchId,
          successCount: params.successCount,
          failureCount: params.failureCount
        },
      }, filteredAdminHrIds);
    }
  }
  /**
   * Notify when candidate is rejected
   */
  static async notifyCandidateRejected(params: {
    organizationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    triggerUserId: string;
    triggerUserName: string;
  }) {

    // console.log(params, "redected - triget");

    const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
    const filteredAdminHrIds = adminHrIds.filter(id => id !== params.triggerUserId);

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.CANDIDATE_REJECTED,
        title: 'Candidate Rejected',
        message: `${params.triggerUserName} rejected ${params.candidateName} for ${params.jobTitle}`,
        relatedEntity: 'candidate',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
        },
      }, filteredAdminHrIds);
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
        title: 'Meeting Invite Accepted',
        message: `${params.attendeeName} has accepted the interview invitation with ${params.candidateName}`,
        relatedEntity: 'meeting',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        priority: 'medium',
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
    const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
    const filteredAdminHrIds = adminHrIds.filter(id => id !== params.interviewerId);

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.MEETING_INVITE_ACCEPTED,
        title: 'Meeting Invite Accepted',
        message: `${params.attendeeName} has accepted the interview invitation with ${params.candidateName}`,
        relatedEntity: 'meeting',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        priority: 'medium',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
          attendeeEmail: params.attendeeEmail,
          attendeeName: params.attendeeName,
          interviewerName: params.interviewerName,
          meetingDate: params.meetingDate,
        },
      }, filteredAdminHrIds);
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
        title: 'Meeting Invite Declined',
        message: `⚠️ ${params.attendeeName} has declined the interview invitation with ${params.candidateName}`,
        relatedEntity: 'meeting',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        priority: 'high',
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
    const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
    const filteredAdminHrIds = adminHrIds.filter(id => id !== params.interviewerId);

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.MEETING_INVITE_DECLINED,
        title: 'Meeting Invite Declined - Action Required',
        message: `⚠️ ${params.attendeeName} has declined the interview invitation with ${params.candidateName}. Consider rescheduling.`,
        relatedEntity: 'meeting',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        priority: 'high',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
          attendeeEmail: params.attendeeEmail,
          attendeeName: params.attendeeName,
          interviewerName: params.interviewerName,
          meetingDate: params.meetingDate,
        },
      }, filteredAdminHrIds);
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
        title: 'Meeting Invite - Maybe',
        message: `${params.attendeeName} tentatively accepted the interview invitation with ${params.candidateName}`,
        relatedEntity: 'meeting',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        priority: 'medium',
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
    const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
    const filteredAdminHrIds = adminHrIds.filter(id => id !== params.interviewerId);

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.MEETING_INVITE_TENTATIVE,
        title: 'Meeting Invite - Maybe',
        message: `${params.attendeeName} tentatively accepted the interview invitation with ${params.candidateName}`,
        relatedEntity: 'meeting',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        priority: 'medium',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
          attendeeEmail: params.attendeeEmail,
          attendeeName: params.attendeeName,
          interviewerName: params.interviewerName,
          meetingDate: params.meetingDate,
        },
      }, filteredAdminHrIds);
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
    const adminHrIds = await this.getUsersByRole(params.organizationId, ['admin', 'hr']);
    const filteredAdminHrIds = adminHrIds.filter(id => id !== params.triggerUserId);

    if (filteredAdminHrIds.length > 0) {
      await this.createBulkNotifications({
        organizationId: params.organizationId,
        type: NotificationType.INTERVIEW_COMPLETED,
        title: 'Interview Completed',
        message: `${params.interviewerName} completed interview with ${params.candidateName}`,
        relatedEntity: 'candidate',
        relatedId: params.candidateId,
        actionUrl: `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`,
        triggerUserId: params.triggerUserId,
        triggerUserName: params.triggerUserName,
        priority: 'medium',
        metadata: {
          candidateName: params.candidateName,
          jobTitle: params.jobTitle,
          jobId: params.jobId,
          interviewerName: params.interviewerName,
        },
      }, filteredAdminHrIds);
    }
  }
}