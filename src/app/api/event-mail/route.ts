import { NextRequest, NextResponse } from "next/server";
import { sendSmartNotification } from "@/lib/unifiedEmailService";
import { verifyAndDecryptToken } from "@/app/actions/auth";
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
  let sentById: string;

  if (typeof sentBy === "object" && sentBy?._id) {
    sentById = sentBy._id.toString();
  } else if (
    typeof sentBy === "string" &&
    mongoose.Types.ObjectId.isValid(sentBy)
  ) {
    sentById = sentBy;
  } else if (sentBy === "system") {
    // Create or get system user
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
      { upsert: true, new: true }
    );
    sentById = systemUser._id.toString();
  } else {
    // Fallback to system user
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
      { upsert: true, new: true }
    );
    sentById = systemUser._id.toString();
  }

  return sentById;
}

// Create pending email history entries
async function createPendingEmailHistory(data: any, organizationId: string) {
  const {
    email,
    emailList,
    interviewerName,
    candidateName,
    sentBy,
    sentByEmail,
    sentByName,
    candidateId,
    jobId,
  } = data;

  const settings = await Settings.findOne({
    organizationId: new mongoose.Types.ObjectId(organizationId),
  }).lean();

  const fromEmail =
    settings?.mailConfig?.resend_from ||
    settings?.mailConfig?.brevo_from ||
    settings?.mailConfig?.smtp_from ||
    "system@hiretrack.com";

  const provider = settings?.mailConfig?.mailProvider || "unknown";
  const historyIds: string[] = [];

  try {
    // Resolve sentBy to valid ObjectId
    const resolvedSentById = await resolveSentByToObjectId(
      sentBy,
      sentByEmail,
      sentByName,
      organizationId,
      fromEmail
    );

    // Get email content for history (this might be expensive, consider caching)
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

    // Create history records for BCC recipients (HR/Admins) - PENDING
    const hrHistoryPromises = emailList.map(async (hrEmail: string) => {
      try {
        const hrUser = await User.findOne({
          email: hrEmail,
          organizationId: new mongoose.Types.ObjectId(organizationId),
        })
          .select("_id name")
          .lean();

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
          status: "pending", // Mark as pending
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
      } catch (error) {
        console.error(
          `Failed to create pending history for ${hrEmail}:`,
          error
        );
        return null;
      }
    });

    const hrHistoryIds = await Promise.all(hrHistoryPromises);
    historyIds.push(...hrHistoryIds.filter((id) => id !== null));

    return historyIds;
  } catch (error) {
    console.error("Failed to create pending email history:", error);
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

    console.log(
      `Updated ${historyIds.length} email history entries to ${status}`
    );
  } catch (error) {
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
    console.log("🟢🟢THE MAP-updated: ", emailQueue);
    return { success: true, message: "Email data updated" };
  }

  const timer = setTimeout(async () => {
    const queueItem = emailQueue.get(key);
    if (queueItem) {
      try {
        await sendQueuedEmail(
          queueItem.data,
          req,
          queueItem.historyIds,
          queueItem.senderEmail
        );
      } catch (error) {
        console.error(`Failed to send email for ${key}:`, error);
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
  historyIds?: string[],
  senderEmail?: string
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

  const settings = await Settings.findOne({
    organizationId: new mongoose.Types.ObjectId(organizationId),
  }).lean();
  if (!settings || !settings.mailConfig) {
    throw new Error("Mail configuration not found");
  }

  const fromEmail =
    settings.mailConfig.resend_from ||
    settings.mailConfig.brevo_from ||
    settings.mailConfig.smtp_from ||
    "system@hiretrack.com";

  // Resolve sentBy to valid ObjectId
  const resolvedSentById = await resolveSentByToObjectId(
    sentBy,
    sentByEmail,
    sentByName,
    organizationId,
    fromEmail
  );

  const startDateString = startTime
    ? ((await getFormattedDate(req, new Date(startTime))) as string) +
      " " +
      settings.timeZone.offset +
      " " +
      settings.timeZone.name
    : "N/A";
  const startDate = startTime
    ? ((await getFormattedDate(req, new Date(startTime), true)) as Date)
    : null;
  const endDateString = endTime
    ? await getFormattedDate(req, new Date(endTime))
    : "N/A";
  const endDate = endTime
    ? ((await getFormattedDate(req, new Date(endTime), true)) as Date)
    : null;
  const formattedStartTime = startDate
    ? startDate.toISOString().replace(/-|:|\.\d+/g, "")
    : "N/A";
  const formattedEndTime = endDate
    ? endDate.toISOString().replace(/-|:|\.\d+/g, "")
    : "N/A";

  console.log("START TIME: BEFORE: : ", startTime);
  console.log("DATE TO BE RECORDED in EMail: ", startDateString, endDateString);
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

  const organization = await User?.findOne({
    organizationId,
  }).populate({
    path: "organizationId",
    select: "name",
  });
  const organizationName =
    typeof organization?.organizationId === "object"
      ? organization.organizationId.name
      : "";

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
  } else {
    console.warn(
      "No existing history IDs found, relying on sendSmartNotificationEmail to handle history"
    );
  }

  return emailStatus;
}

export async function PUT(req: NextRequest) {
  try {
    let organizationId;
    const data = await req.json();
    const token = req.cookies.get("auth_token");
    let decryptedResponse;
    if (token?.value) {
      decryptedResponse = await verifyAndDecryptToken(String(token?.value));
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        organizationId = userData.organizationId || "";
      }
    }
    console.log(data, "data,-- stap cmpleted");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is missing." },
        { status: 400 }
      );
    }
    if (!User) {
      throw new Error("Database not connected");
    }
    const latestRemark = data.feedback;
    const newDate = data.dateTime;
    const completionDate = (await getFormattedDate(
      req,
      newDate,
      false,
      organizationId
    )) as string;
    const organization = await User?.findOne({
      organizationId,
    })
      .populate({
        path: "organizationId",
        select: "name defaultLanes", // populate only organization name
      })
      .lean();

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

    const { emailContent, emailSubject } = await getMappedEmailTemplate(
      "step-completed",
      {
        candidateName: data.name,
        completedBy: decryptedResponse?.user.name,
        candidateProfileLink: candidateDetails,
        jobTitle: data.title,
        organizationName: decryptedResponse?.user.organizationInfo.name,
        stepName: data?.status,
        feedback: latestRemark?.description || "N/A",
        rating: latestRemark?.rating || "N/A",
        completionDate: completionDate,
        recipientName: "",
        nextStep: nextSteps,
      },
      organizationId
    );

    const settings = await Settings.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    }).lean();
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

    const users = await User.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      role: { $in: ["hr", "admin"] },
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    })
      .select("email")
      .lean();

    // Resolve sentBy to valid ObjectId
    const resolvedSentById = await resolveSentByToObjectId(
      decryptedResponse?.user?._id || "system",
      decryptedResponse?.user?.email || fromEmail,
      decryptedResponse?.user?.name || "HireTrack System",
      organizationId,
      fromEmail
    );
    console.log(resolvedSentById, "resolvedSentById");

    const emailList = users.map((user) => user.email);
    const emailStatus = await sendSmartNotification(
      organizationId,
      // "stepCompleted",
      NotificationType.STEP_COMPLETED,
      {
        triggererUserId: resolvedSentById, // Use resolved ObjectId
        triggererEmail: decryptedResponse?.user?.email || fromEmail,
        triggererName: decryptedResponse?.user?.name || "HireTrack System",
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

    let organizationId;
    const token = req.cookies.get("auth_token");
    let decryptedResponse;
    let senderEmail;
    if (token?.value) {
      decryptedResponse = await verifyAndDecryptToken(String(token?.value));
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        organizationId = userData.organizationId || "";
        senderEmail = userData.email || "";
      }
    }

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

    const users = await User.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      role: { $in: ["hr", "admin"] },
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    })
      .select("email")
      .lean();

    const settings = await Settings.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    }).lean();
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

    const emailList = users.map((user) => user.email);
    const emailKey = id;

    // Resolve sentBy to valid ObjectId before queuing
    const resolvedSentById = await resolveSentByToObjectId(
      decryptedResponse?.user?._id || "system",
      decryptedResponse?.user?.email || fromEmail,
      decryptedResponse?.user?.name || "HireTrack System",
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
      sentByEmail: decryptedResponse?.user?.email || fromEmail,
      sentByName: decryptedResponse?.user?.name || "HireTrack System",
      candidateId: id,
      jobId: jobId,
      dashboardLink,
    };

    if (immediate) {
      const emailStatus = await sendQueuedEmail(
        queueData,
        req,
        undefined,
        senderEmail
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
    const token = req.cookies.get("auth_token");
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      if (
        !decryptedResponse.success ||
        decryptedResponse.user.role !== "admin"
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return queue status (only for admin users)
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
