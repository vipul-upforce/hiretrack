import { NextRequest, NextResponse } from "next/server";
import { sendSmartNotification } from "@/lib/unifiedEmailService";
import { getAuthenticatedUser } from "@/app/actions/auth";
import connectToDatabase, { Settings, User, EmailHistory } from "@/lib/mongodb";
import mongoose from "mongoose";
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
  }
>();

// Create pending email history entries for status updates
async function createPendingEmailHistory(data: any, organizationId: string) {
  const {
    emailList,
    candidateName,
    status,
    sentBy,
    sentByEmail,
    sentByName,
    candidateId,
    jobId,
    eventTitle,
    jobName,
    remark,
    rating,
    actionBy,
    prev_status,
    eventSubTitle,
    candidateDetails,
    hrContactInfo,
  } = data;

  const settings = await Settings.findOne({
    organizationId: new mongoose.Types.ObjectId(organizationId),
  }).select("mailConfig").lean().exec();

  const provider = settings?.mailConfig?.mailProvider || "unknown";
  const historyIds: string[] = [];

  try {
    // Get email content for history (using placeholder values that will be updated)
    const { emailContent, emailSubject } = await getMappedEmailTemplate(
      "status-update",
      {
        eventTitle,
        jobTitle: jobName,
        candidateName,
        newStatus: status,
        statusMessage: remark,
        rating,
        actionBy,
        nextSteps: "TBD", // Will be updated when actually sent
        prev_status,
        eventSubTitle,
        candidateDetails,
        organizationName: "TBD", // Will be updated when actually sent
        hrContactInfo,
      },
      organizationId
    );

    // Create history records for all recipients (HR/Admins) - PENDING
    const historyPromises = emailList.map(async (recipientEmail: string) => {
      try {
        const recipient = await User.findOne({
          email: recipientEmail,
          organizationId: new mongoose.Types.ObjectId(organizationId),
        })
          .select("_id name")
          .lean();

        const history = await EmailHistory.create({
          organizationId: new mongoose.Types.ObjectId(organizationId),
          sentBy: new mongoose.Types.ObjectId(sentBy),
          sentByEmail: sentByEmail,
          sentByName: sentByName,
          recipientType: "user",
          recipientId: recipient?._id || new mongoose.Types.ObjectId(),
          recipientEmail: recipientEmail,
          recipientName: recipient?.name || recipientEmail,
          subject: emailSubject,
          body: emailContent,
          cc: [],
          bcc: [],
          replyTo: sentByEmail,
          attachments: [],
          status: "pending", // Mark as pending
          sentAt: undefined, // Will be set when actually sent
          error: undefined,
          provider,
          metadata: {
            candidateId: new mongoose.Types.ObjectId(candidateId),
            jobId: jobId ? new mongoose.Types.ObjectId(jobId) : undefined,
            templateUsed: "status-update",
            eventType: "status_change",
            scheduledFor: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
            previousStatus: prev_status,
            newStatus: status,
          },
        });

        return history._id.toString();
      } catch (error) {
        console.error(
          `Failed to create pending history for ${recipientEmail}:`,
          error
        );
        return null;
      }
    });

    const resolvedHistoryIds = await Promise.all(historyPromises);
    historyIds.push(...resolvedHistoryIds.filter((id) => id !== null));

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

    // Update content if provided (for final email with correct organization data)
    if (updatedContent) {
      updateData.subject = updatedContent.subject;
      updateData.body = updatedContent.body;
    }

    await EmailHistory.updateMany(
      { _id: { $in: historyIds.map((id) => new mongoose.Types.ObjectId(id)) } },
      { $set: updateData }
    );

    console.log(
      `Updated ${historyIds.length} status update email history entries to ${status}`
    );
  } catch (error) {
    console.error("Failed to update email history status:", error);
  }
}

function scheduleEmail(
  key: string,
  data: any,
  delayMs: number = 2 * 60 * 1000
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
        await sendQueuedEmail(queueItem.data, undefined, queueItem.historyIds);
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
  });

  return { success: true, message: "Email scheduled" };
}

// Sends the actual email based on queue data
async function sendQueuedEmail(
  data: any,
  senderEmail?: string,
  historyIds?: string[]
) {
  const {
    organizationId,
    eventTitle,
    candidateName,
    status,
    remark,
    rating,
    emailList,
    actionBy,
    jobName,
    prev_status,
    eventSubTitle,
    candidateDetails,
    candidateId,
    jobId,
    sentBy,
    sentByEmail,
    sentByName,
    hrContactInfo,
  } = data;

  const settings = await Settings.findOne({
    organizationId: new mongoose.Types.ObjectId(organizationId),
  }).select("mailConfig").lean().exec();
  if (!settings || !settings.mailConfig) {
    throw new Error("Mail configuration not found");
  }

  const fromEmail =
    settings.mailConfig.resend_from ||
    settings.mailConfig.brevo_from ||
    settings.mailConfig.smtp_from ||
    "system@hiretrack.com";

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
          organization.organizationId.defaultLanes.indexOf(status) + 1
        ] || "N/A"
      : "N/A";
  console.log(nextSteps, "nextSteps");
  const organizationName =
    typeof organization?.organizationId === "object"
      ? organization.organizationId.name
      : "";

  const { emailContent, emailSubject } = await getMappedEmailTemplate(
    "status-update",
    {
      eventTitle,
      jobTitle: jobName,
      candidateName,
      newStatus: status,
      statusMessage: remark,
      rating,
      actionBy,
      nextSteps,
      prev_status,
      eventSubTitle,
      candidateDetails,
      organizationName: organizationName,
      hrContactInfo,
    },
    organizationId
  );

  const systemUser = await User.findOneAndUpdate(
    { email: fromEmail, organizationId },
    {
      $setOnInsert: {
        name: "HireTrack System",
        email: fromEmail,
        role: "system",
        organizationId,
      },
    },
    { upsert: true, new: true }
  );

  const emailStatus = await sendSmartNotification(
    organizationId,
    // "statusUpdates",
    NotificationType.STATUS_UPDATES,

    {
      triggererUserId: sentBy || systemUser._id.toString(),
      triggererEmail: sentByEmail || systemUser.email,
      triggererName: sentByName || systemUser.name,
      jobId: jobId,
      candidateId: candidateId,
      eventType: "status_change",
      templateUsed: "status-update",
    },
    {
      subject: emailSubject,
      html: emailContent,
    },
    emailList
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
      "No existing history IDs found for status update email, relying on smart notification to create history"
    );
  }

  return emailStatus;
}

export async function POST(req: NextRequest) {
  try {
    const [userData, body] = await Promise.all([
      getAuthenticatedUser(req),
      req.json(),
      connectToDatabase(),
    ]);
    const {
      jobName,
      jobId,
      eventTitle,
      candidateName,
      status,
      remark,
      rating,
      immediate = false,
      id,
      prev_status,
      endTime,
      startTime,
    } = body;

    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = userData.organizationId;
    const senderEmail = userData.email;

    if (!eventTitle) {
      return NextResponse.json(
        { error: "Event title is required." },
        { status: 400 }
      );
    }

    if (!User) {
      throw new Error("User model not defined. Database may not be connected.");
    }

    const users = await User.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      role: { $in: ["hr", "admin"] },
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    })
      .select("email name role")
      .lean();

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: "No active users found for this organization." },
        { status: 404 }
      );
    }
    let hrContactInfo = "";
    if (userData?.role === "hr") {
      hrContactInfo = `${userData?.email} ${userData?.name}`;
    } else {
      const hrUser = users.find((user) => user.role === "hr");
      console.log("HR USER: ", hrUser);
      hrContactInfo = hrUser ? `${hrUser.email} ${hrUser.name}` : "";
    }
    console.log("HR CONTACT INFO: ", hrContactInfo);

    const actionBy = userData?.name;
    const emailList = users.map((user) => user.email);
    const eventSubTitle =
      prev_status || prev_status !== ""
        ? `Status updated from <strong>${prev_status}</strong> to <strong>${status}</strong> for candidate: <strong>${candidateName}</strong><br>`
        : `Status updated to <strong>${status}</strong> for candidate: <strong>${candidateName}</strong><br>`;

    const emailKey = id;

    const candidateDetails = `${req.headers.get("Origin")}/candidate/${id}`;

    // Queue data for the email
    const queueData = {
      organizationId,
      eventTitle,
      eventSubTitle,
      candidateName,
      status,
      remark,
      rating,
      jobName,
      emailList,
      actionBy,
      prev_status,
      candidateDetails,
      candidateId: id, // The candidate ID from the request
      jobId: jobId, // Would need to be passed in the request if available
      sentBy: userData?.id,
      sentByEmail: userData?.email,
      sentByName: userData?.name,
      startTime,
      endTime,
      hrContactInfo,
    };

    if (immediate) {
      const emailStatus = await sendQueuedEmail(queueData, senderEmail);

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
      scheduleEmail(emailKey, queueData);

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
    console.error("ERROR IN POST: ", error);
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Return queue status (only for admin users)
    const queueStatus = Array.from(emailQueue.entries()).map(
      ([key, value]) => ({
        key,
        candidateName: value.data.candidateName,
        status: value.data.status,
        remark: value.data.remark,
        rating: value.data.rating,
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
