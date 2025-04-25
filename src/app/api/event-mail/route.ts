import { NextRequest, NextResponse } from "next/server";
import { sendMail } from ".";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { loadTemplate } from "@/lib/templateLoader";
import { User } from "@/lib/mongodb";

// Email queue to track pending emails
const emailQueue = new Map<
  string,
  {
    data: any;
    timer: NodeJS.Timeout;
    timestamp: number;
  }
>();
// console.log("THE MAP: ", emailQueue);
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
    // console.log("🟢🟢THE MAP-updated: ", emailQueue);
    return { success: true, message: "Email data updated" };
  }

  const timer = setTimeout(async () => {
    const queueItem = emailQueue.get(key);
    if (queueItem) {
      try {
        await sendQueuedEmail(queueItem.data);
      } catch (error) {
        console.error(`Failed to send email for ${key}:`, error);
      } finally {
        emailQueue.delete(key);
      }
    }
  }, delayMs);

  emailQueue.set(key, {
    data,
    timer,
    timestamp: Date.now() + delayMs,
  });

  // console.log("THE MAP: ", emailQueue);
  return { success: true, message: "Email scheduled" };
}

// Sends the actual email based on queue data
async function sendQueuedEmail(data: any) {
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
  } = data;

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  const formattedStartTime = startDate.toISOString().replace(/-|:|\.\d+/g, "");
  const formattedEndTime = endDate.toISOString().replace(/-|:|\.\d+/g, "");

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
  )}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${encodeURIComponent(
    eventDescription || ""
  )}`;

  const htmlContent = loadTemplate("assignment-event", {
    eventTitle,
    startDate: startDate.toLocaleString(),
    endDate: endDate.toLocaleString(),
    jobName,
    interviewerName,
    candidateName,
    status,
    googleCalendarLink,
    outlookCalendarLink,
  });

  return await sendMail(
    organizationId,
    [email, ...emailList],
    eventTitle,
    htmlContent
  );
}

export async function PUT(req: NextRequest) {
  try {
    let organizationId;
    const { name } = await req.json();
    const token = req.cookies.get("token");
    let decryptedResponse;
    if (token?.value) {
      decryptedResponse = await verifyAndDecryptToken(String(token?.value));
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        organizationId = userData.organizationId || "";
      }
    }

    // Validate that organizationId exists
    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is missing." },
        { status: 400 }
      );
    }
    if (!User) {
      throw new Error("Database not connected");
    }

    const htmlContent = loadTemplate("marked-as-done", {
      candidate_name: name,
      unassigner: decryptedResponse?.user.name,
    });
    const users = await User.find({
      organizationId,
      role: { $in: ["hr", "admin"] },
      isDeleted: false || null,
    }).select("email");

    const emailList = users.map((user) => user.email);
    const emailStatus = await sendMail(
      organizationId,
      [...emailList],
      `Candidate Unassigned`,
      htmlContent
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
      jobName,
      interviewerName,
      candidateName,
      status,
      immediate = false,
      id,
    } = await req.json();

    let organizationId;
    const token = req.cookies.get("token");
    let decryptedResponse;
    if (token?.value) {
      decryptedResponse = await verifyAndDecryptToken(String(token?.value));
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        organizationId = userData.organizationId || "";
      }
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is missing." },
        { status: 400 }
      );
    }

    if (!email || !eventTitle || !startTime || !endTime) {
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

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid start or end time." },
        { status: 400 }
      );
    }

    if (!User) {
      throw new Error("Database not connected");
    }

    const users = await User.find({
      organizationId,
      role: { $in: ["hr", "admin"] },
      isDeleted: false || null,
    }).select("email");

    const emailList = users.map((user) => user.email);

    const emailKey = id;

    // Queue data for the email
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
      // changer: decryptedResponse?.user.name,
    };

    if (immediate) {
      const emailStatus = await sendQueuedEmail(queueData);

      if (emailStatus.status === 200) {
        return NextResponse.json({ message: "Email sent successfully." });
      } else {
        return NextResponse.json(
          { error: emailStatus.message },
          { status: emailStatus.status }
        );
      }
    } else {
      // console.log("@######Addinbg to queu: ", emailKey, queueData);
      scheduleEmail(emailKey, queueData);

      return NextResponse.json({
        message:
          "Email scheduled successfully. It will be sent in 2 minutes with the most updated information.",
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
    const token = req.cookies.get("token");
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
