import { NextRequest, NextResponse } from "next/server";
import { sendSmartNotification } from "@/lib/unifiedEmailService";
import { getAuthenticatedUser } from "@/app/actions/auth";
import { Settings, User, EmailHistory } from "@/lib/mongodb";
import mongoose from "mongoose";
import { getFormattedDate } from "@/components/timezoneFormat/getFormattedTZ";
import { getMappedEmailTemplate } from "@/app/actions/getMappedEmailTemplate";
import { Organization } from "@/lib/models/user";
import { NotificationType } from "@/lib/services/emailDecisionEngine";

// Email queue to track pending emails
const emailQueue = new Map<
  string,
  {
    data: any;
    timer: NodeJS.Timeout;
    timestamp: number;
    historyIds: string[]; // Track the history entry IDs for this queued email
    senderEmail?: string; // Store the sender's email to exclude from recipients
  }
>();

// Helper function to resolve sentBy to a valid ObjectId (creates system user if needed)
async function resolveSentByToObjectId(
  sentBy: string | any,
  sentByEmail: string,
  sentByName: string,
  organizationId: string,
  fromEmail: string
): Promise<string> {
  // Fast path: if sentBy is already a valid ObjectId string, return it
  if (typeof sentBy === "object" && sentBy?._id) {
    return sentBy._id.toString();
  }
  
  if (
    typeof sentBy === "string" &&
    mongoose.Types.ObjectId.isValid(sentBy)
  ) {
    return sentBy;
  }

  // Create or get system user (optimized with select)
  const systemUser = await User.findOneAndUpdate(
    {
      email: fromEmail,
      organizationId: new mongoose.Types.ObjectId(organizationId),
    },
    {
      $setOnInsert: {
        name: "HireTrack System",
        email: fromEmail,
        role: "system",
        organizationId: new mongoose.Types.ObjectId(organizationId),
      },
    },
    { upsert: true, new: true, select: "_id" }
  ).lean();

  return systemUser._id.toString();
}

// Create pending email history entries
async function createPendingEmailHistory(data: any, organizationId: string) {
  const {
    email,
    emailList,
    interviewerName,
    sentBy,
    sentByEmail,
    sentByName,
    candidateId,
    jobId,
  } = data;

  // Optimize: Fetch settings with only needed fields first
  const settings = await Settings.findOne({
    organizationId: new mongoose.Types.ObjectId(organizationId),
  })
    .select("mailConfig.resend_from mailConfig.brevo_from mailConfig.smtp_from mailConfig.mailProvider")
    .lean()
    .exec();

  const fromEmail =
    settings?.mailConfig?.resend_from ||
    settings?.mailConfig?.brevo_from ||
    settings?.mailConfig?.smtp_from ||
    "system@hiretrack.com";

  const provider = settings?.mailConfig?.mailProvider || "unknown";

  // Resolve sentBy after we have fromEmail
  const resolvedSentById = await resolveSentByToObjectId(
    sentBy,
    sentByEmail,
    sentByName,
    organizationId,
    fromEmail
  );
  const historyIds: string[] = [];

  try {
    // Get email content for history
    const { emailContent, emailSubject } = await getMappedEmailTemplate(
      "interview-assignment",
      {
        eventTitle: data.eventTitle,
        interviewDate: "TBD", // Will be updated when actually sent
        endDate: "TBD",
        jobTitle: data.jobName,
        interviewerName: data.interviewerName,
        candidateName: data.candidateName,
        interviewType: data.status,
        meetingLink: "TBD",
        outlookCalendarLink: "TBD",
        candidateProfileLink: data.candidateDetailsPage,
        organizationName: "TBD",
      },
      organizationId
    );

    // Create history record for interviewer (primary recipient) - PENDING
    const interviewerHistory = await EmailHistory.create({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      sentBy: new mongoose.Types.ObjectId(resolvedSentById),
      sentByEmail: sentByEmail,
      sentByName: sentByName,
      recipientType: "user",
      recipientId: new mongoose.Types.ObjectId(), // Would need interviewer ID if available
      recipientEmail: email,
      recipientName: interviewerName,
      subject: emailSubject,
      body: emailContent,
      cc: [],
      bcc: emailList,
      replyTo: sentByEmail,
      attachments: [],
      status: "pending", // Mark as pending
      sentAt: undefined, // Will be set when actually sent
      error: undefined,
      provider,
      metadata: {
        candidateId: new mongoose.Types.ObjectId(candidateId),
        jobId: jobId ? new mongoose.Types.ObjectId(jobId) : undefined,
        templateUsed: "interview-assignment",
        eventType: "interview_assignment",
        scheduledFor: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
      },
    });

    historyIds.push(interviewerHistory._id.toString());

    // Optimize: Batch fetch all HR users in a single query instead of individual lookups
    const hrUsers = emailList.length > 0
      ? await User.find({
          email: { $in: emailList },
          organizationId: new mongoose.Types.ObjectId(organizationId),
        })
          .select("_id name email")
          .lean()
          .exec()
      : [];

    // Create a map for fast lookup
    const hrUserMap = new Map(
      hrUsers.map((user) => [user.email, user])
    );

    // Create history records for BCC recipients (HR/Admins) - PENDING (batched)
    const hrHistoryPromises = emailList.map(async (hrEmail: string) => {
      try {
        const hrUser = hrUserMap.get(hrEmail);
        const hrHistory = await EmailHistory.create({
          organizationId: new mongoose.Types.ObjectId(organizationId),
          sentBy: new mongoose.Types.ObjectId(resolvedSentById),
          sentByEmail: sentByEmail,
          sentByName: sentByName,
          recipientType: "user",
          recipientId: hrUser?._id || new mongoose.Types.ObjectId(),
          recipientEmail: hrEmail,
          recipientName: hrUser?.name || hrEmail,
          subject: emailSubject,
          body: emailContent,
          cc: [],
          bcc: [],
          replyTo: sentByEmail,
          attachments: [],
          status: "pending",
          sentAt: undefined,
          error: undefined,
          provider,
          metadata: {
            candidateId: new mongoose.Types.ObjectId(candidateId),
            jobId: jobId ? new mongoose.Types.ObjectId(jobId) : undefined,
            templateUsed: "interview-assignment",
            eventType: "interview_assignment",
            scheduledFor: new Date(Date.now() + 2 * 60 * 1000),
          },
        });

        return hrHistory._id.toString();
      } catch {
        return null;
      }
    });

    const hrHistoryIds = await Promise.all(hrHistoryPromises);
    historyIds.push(...hrHistoryIds.filter((id) => id !== null));

    return historyIds;
  } catch {
    return [];
  }
}

// Update email history entries from pending to sent/failed
async function updateEmailHistoryStatus(
  historyIds: string[],
  status: "sent" | "failed",
  error?: string,
  updatedContent?: { subject: string; body: string }
) {
  try {
    const updateData: any = {
      status,
      sentAt: status === "sent" ? new Date() : undefined,
      error: status === "failed" ? error : undefined,
    };

    // Update content if provided (for final email with correct dates/links)
    if (updatedContent) {
      updateData.subject = updatedContent.subject;
      updateData.body = updatedContent.body;
    }

    await EmailHistory.updateMany(
      { _id: { $in: historyIds.map((id) => new mongoose.Types.ObjectId(id)) } },
      { $set: updateData }
    );
  } catch {
    console.error("Failed to update email history status:", error);
  }
}

function scheduleEmail(
  key: string,
  data: any,
  delayMs: number = 2 * 60 * 1000,
  req: NextRequest,
  senderEmail?: string
) {
  if (emailQueue.has(key)) {
    const existingItem = emailQueue.get(key)!;
    emailQueue.set(key, {
      ...existingItem,
      data,
    });
    return { success: true, message: "Email data updated" };
  }

  const timer = setTimeout(async () => {
    const queueItem = emailQueue.get(key);
    if (queueItem) {
      try {
        await sendQueuedEmail(
          queueItem.data,
          req,
          queueItem.historyIds
        );
      } catch (error) {
        // Update history to failed status
        if (queueItem.historyIds.length > 0) {
          await updateEmailHistoryStatus(
            queueItem.historyIds,
            "failed",
            error instanceof Error ? error.message : "Unknown error"
          );
        }
      } finally {
        emailQueue.delete(key);
      }
    }
  }, delayMs);

  emailQueue.set(key, {
    data,
    timer,
    timestamp: Date.now() + delayMs,
    historyIds: [], // Will be populated after creating pending history
    senderEmail, // Store sender's email to exclude from recipients
  });

  return { success: true, message: "Email scheduled" };
}

// Sends the actual email based on queue data
async function sendQueuedEmail(
  data: any,
  req: NextRequest,
  historyIds?: string[]
) {
  const {
    organizationId,
    email,
    eventTitle,
    startTime,
    endTime,
    jobName,
    interviewerName,
    candidateName,
    status,
    emailList,
    candidateDetailsPage,
    sentBy,
    sentByEmail,
    sentByName,
    candidateId,
    jobId,
    dashboardLink,
  } = data;

  // Optimize: Fetch settings first, then resolve sentBy with correct fromEmail
  const settings = await Settings.findOne({
    organizationId: new mongoose.Types.ObjectId(organizationId),
  })
    .select("mailConfig timeZone.offset timeZone.name")
    .lean()
    .exec();

  if (!settings || !settings.mailConfig) {
    throw new Error("Mail configuration not found");
  }

  const fromEmail =
    settings.mailConfig.resend_from ||
    settings.mailConfig.brevo_from ||
    settings.mailConfig.smtp_from ||
    "system@hiretrack.com";

  // Resolve sentBy with correct fromEmail
  const resolvedSentById = await resolveSentByToObjectId(
    sentBy,
    sentByEmail,
    sentByName,
    organizationId,
    fromEmail
  );

  // Optimize: Format dates in parallel
  const [startDateString, startDate, endDateString, endDate] = await Promise.all([
    startTime
      ? getFormattedDate(req, new Date(startTime)).then(
          (date) => `${date} ${settings.timeZone?.offset || ""} ${settings.timeZone?.name || ""}`
        )
      : Promise.resolve("N/A"),
    startTime
      ? getFormattedDate(req, new Date(startTime), true).then((date) => date as Date)
      : Promise.resolve(null),
    endTime
      ? getFormattedDate(req, new Date(endTime))
      : Promise.resolve("N/A"),
    endTime
      ? getFormattedDate(req, new Date(endTime), true).then((date) => date as Date)
      : Promise.resolve(null),
  ]);
  const formattedStartTime = startDate
    ? startDate.toISOString().replace(/-|:|\.\d+/g, "")
    : "N/A";
  const formattedEndTime = endDate
    ? endDate.toISOString().replace(/-|:|\.\d+/g, "")
    : "N/A";

  const eventDescription: string = `<div><strong>Job Name:</strong> ${
    jobName || "N/A"
  }<br>
  <strong>Interviewer Name:</strong> ${interviewerName || "N/A"}<br>
  <strong>Candidate Name:</strong> ${candidateName || "N/A"}<br>
  <strong>Status:</strong> ${status || "N/A"}
</div>
  `;

  const googleCalendarLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    eventTitle
  )}&dates=${formattedStartTime}/${formattedEndTime}&details=${encodeURIComponent(
    eventDescription || ""
  )}`;

  const outlookCalendarLink = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(
    eventTitle
  )}&startdt=${startDate ? startDate.toISOString() : "N/A"}&enddt=${endDate ? endDate.toISOString() : "N/A"}&body=${encodeURIComponent(
    eventDescription || ""
  )}`;

  // Optimize: Fetch organization first, then template with organization name
  const organization = await User?.findOne({
    organizationId,
  })
    .select("organizationId")
    .populate({
      path: "organizationId",
      select: "name",
    })
    .lean();

  const organizationName =
    typeof organization?.organizationId === "object"
      ? organization.organizationId.name
      : "";

  // Fetch email template with organization name
  const { emailContent, emailSubject } = await getMappedEmailTemplate(
    "interview-assignment",
    {
      eventTitle,
      interviewDate: startDateString as string,
      endDate: endDateString as string,
      jobTitle: jobName,
      interviewerName,
      candidateName,
      interviewType: status,
      meetingLink: googleCalendarLink,
      outlookCalendarLink,
      candidateProfileLink: candidateDetailsPage,
      organizationName,
      dashboardLink,
    },
    organizationId
  );

  // Use sendSmartNotificationEmail for interview assignments
  const emailStatus = await sendSmartNotification(
    organizationId,
    // "interviewAssignments",
    NotificationType.INTERVIEW_ASSIGNMENTS,
    {
      triggererUserId: resolvedSentById, // Use resolved ObjectId
      triggererEmail: sentByEmail,
      triggererName: sentByName,
      jobId: jobId,
      candidateId: candidateId,
      eventType: "interview_assignment",
      templateUsed: "interview-assignment",
    },
    {
      subject: emailSubject,
      html: emailContent,
    },
    [email, ...emailList] // Combine primary recipient (interviewer) and BCC recipients (HR/Admins)
  );

  // If we have existing history IDs (from pending), update them
  if (historyIds && historyIds.length > 0) {
    await updateEmailHistoryStatus(
      historyIds,
      emailStatus.status === 200 ? "sent" : "failed",
      emailStatus.status !== 200 ? emailStatus.message : undefined,
      { subject: emailSubject, body: emailContent }
    );
  }

  return emailStatus;
}

export async function PUT(req: NextRequest) {
  try {
    // Optimize: Authenticate and parse request in parallel
    const [user, data] = await Promise.all([
      getAuthenticatedUser(req),
      req.json(),
    ]);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId = user.organizationId;
    const latestRemark = data.feedback;
    const newDate = data.dateTime;

    // Optimize: Fetch all required data in parallel
    const [completionDate, organization, settings, hrUsers] = await Promise.all([
      getFormattedDate(req, newDate, false, organizationId).then(
        (date) => date as string
      ),
      User?.findOne({
        organizationId,
      })
        .select("organizationId")
        .populate({
          path: "organizationId",
          select: "name defaultLanes",
        })
        .lean(),
      Settings.findOne({
        organizationId: new mongoose.Types.ObjectId(organizationId),
      })
        .select("mailConfig.resend_from mailConfig.brevo_from mailConfig.smtp_from")
        .lean()
        .exec(),
      User.find({
        organizationId: new mongoose.Types.ObjectId(organizationId),
        role: { $in: ["hr", "admin"] },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      })
        .select("email")
        .lean()
        .exec(),
    ]);

    if (!settings || !settings.mailConfig) {
      return NextResponse.json(
        { error: "Mail configuration not found" },
        { status: 500 }
      );
    }

    const fromEmail =
      settings.mailConfig.resend_from ||
      settings.mailConfig.brevo_from ||
      settings.mailConfig.smtp_from ||
      "system@hiretrack.com";

    const isOrganization = (obj: any): obj is Organization => {
      return (
        obj &&
        typeof obj === "object" &&
        "defaultLanes" in obj &&
        Array.isArray(obj.defaultLanes)
      );
    };

    const nextSteps =
      organization &&
      organization.organizationId &&
      isOrganization(organization.organizationId)
        ? organization.organizationId.defaultLanes[
            organization.organizationId.defaultLanes.indexOf(data.status) + 1
          ] || "N/A"
        : "N/A";

    const candidateDetails = `${req.headers.get("Origin")}/candidate/${data.candidateId}`;

    // Resolve sentBy and fetch email template in parallel
    const [resolvedSentById, emailTemplate] = await Promise.all([
      resolveSentByToObjectId(
        user.id || "system",
        user.email || fromEmail,
        user.name || "HireTrack System",
        organizationId,
        fromEmail
      ),
      getMappedEmailTemplate(
        "step-completed",
        {
          candidateName: data.name,
          completedBy: user.name,
          candidateProfileLink: candidateDetails,
          jobTitle: data.title,
          organizationName:
            typeof organization?.organizationId === "object"
              ? organization.organizationId.name
              : user?.organizationInfo?.name || "",
          stepName: data?.status,
          feedback: latestRemark?.description || "N/A",
          rating: latestRemark?.rating || "N/A",
          completionDate: completionDate,
          recipientName: "",
          nextStep: nextSteps,
        },
        organizationId
      ),
    ]);

    const { emailContent, emailSubject } = emailTemplate;
    const emailList = hrUsers.map((hrUser) => hrUser.email);
    const emailStatus = await sendSmartNotification(
      organizationId,
      NotificationType.STEP_COMPLETED,
      {
        triggererUserId: resolvedSentById,
        triggererEmail: user.email || fromEmail,
        triggererName: user.name || "HireTrack System",
        candidateId: data.candidateId,
        jobId: data.jobId,
        templateUsed: "step-completed",
        eventType: "step_completed",
      },
      {
        subject: emailSubject,
        html: emailContent,
      },
      emailList
    );

    if (emailStatus.status === 200) {
      return NextResponse.json({ message: "Email sent successfully." });
    } else {
      return NextResponse.json(
        {
          error: emailStatus.message,
        },
        { status: emailStatus.status }
      );
    }
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown Error Occurred",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      email,
      eventTitle,
      startTime,
      endTime,
      jobId,
      jobName,
      interviewerName,
      candidateName,
      status,
      immediate = false,
      id,
    } = await req.json();

    const candidateDetailsPage = `${req.headers.get("origin")}/candidate/${id}`;
    const dashboardLink = `${req.headers.get("origin")}/dashboard`; // Added dashboard link

    const userData = await getAuthenticatedUser(req);
    if (!userData) {
      return NextResponse.json(
        { message: "Unauthorised Access" },
        { status: 401 }
      );
    }
    const organizationId = userData.organizationId;
    const senderEmail = userData.email;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is missing." },
        { status: 400 }
      );
    }

    if (!email || !eventTitle) {
      return NextResponse.json(
        { error: "Email, event title, start time, and end time are required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format." },
        { status: 400 }
      );
    }

    if (!User || !Settings) {
      throw new Error("Database not connected");
    }

    // Optimize: Fetch users and settings in parallel
    const [hrUsers, settings] = await Promise.all([
      User.find({
        organizationId: new mongoose.Types.ObjectId(organizationId),
        role: { $in: ["hr", "admin"] },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      })
        .select("email")
        .lean()
        .exec(),
      Settings.findOne({
        organizationId: new mongoose.Types.ObjectId(organizationId),
      })
        .select("mailConfig.resend_from mailConfig.brevo_from mailConfig.smtp_from")
        .lean()
        .exec(),
    ]);

    if (!settings || !settings.mailConfig) {
      return NextResponse.json(
        { error: "Mail configuration not found" },
        { status: 500 }
      );
    }

    const fromEmail =
      settings.mailConfig.resend_from ||
      settings.mailConfig.brevo_from ||
      settings.mailConfig.smtp_from ||
      "system@hiretrack.com";

    const emailList = hrUsers.map((user) => user.email);
    const emailKey = id;

    // Resolve sentBy to valid ObjectId before queuing
    const resolvedSentById = await resolveSentByToObjectId(
      userData?.id || "system",
      userData?.email || fromEmail,
      userData?.name || "HireTrack System",
      organizationId,
      fromEmail
    );

    // Queue data for the email (use resolved ObjectId)
    const queueData = {
      organizationId,
      email,
      eventTitle,
      startTime,
      endTime,
      jobName,
      interviewerName,
      candidateName,
      status,
      emailList,
      candidateDetailsPage,
      sentBy: resolvedSentById, // Use resolved ObjectId (string)
      sentByEmail: userData?.email || fromEmail,
      sentByName: userData?.name || "HireTrack System",
      candidateId: id,
      jobId: jobId,
      dashboardLink,
    };

    if (immediate) {
      const emailStatus = await sendQueuedEmail(
        queueData,
        req,
        undefined
      );

      if (emailStatus.status === 200) {
        return NextResponse.json({ message: "Email sent successfully." });
      } else {
        return NextResponse.json(
          { error: emailStatus.message },
          { status: emailStatus.status }
        );
      }
    } else {
      // Create pending email history entries BEFORE scheduling
      const historyIds = await createPendingEmailHistory(
        queueData,
        organizationId
      );

      // Schedule the email
      scheduleEmail(emailKey, queueData, 2 * 60 * 1000, req, senderEmail);

      // Update the queue item with history IDs
      const queueItem = emailQueue.get(emailKey);
      if (queueItem) {
        queueItem.historyIds = historyIds;
        emailQueue.set(emailKey, queueItem);
      }

      return NextResponse.json({
        message:
          "Email scheduled successfully. It will be sent in 2 minutes with the most updated information.",
        pendingHistoryRecords: historyIds.length,
      });
    }
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown Error Occurred",
      },
      { status: 500 }
    );
  }
}

// ⛔⛔⛔ for debug only
export async function GET(req: NextRequest) {
  try {
    const userData = await getAuthenticatedUser(req, "admin");
    if (!userData) {
      return NextResponse.json(
        { message: "Unauthorised Access" },
        { status: 401 }
      );
    }
    const queueStatus = Array.from(emailQueue.entries()).map(
      ([key, value]) => ({
        key,
        candidateName: value.data.candidateName,
        jobName: value.data.jobName,
        scheduledAt: new Date(value.timestamp).toISOString(),
        timeRemaining:
          Math.round((value.timestamp - Date.now()) / 1000) + " seconds",
        pendingHistoryRecords: value.historyIds.length,
      })
    );

    return NextResponse.json({
      queueSize: emailQueue.size,
      queue: queueStatus,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown Error Occurred",
      },
      { status: 500 }
    );
  }
}
