import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "../event-mail";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { loadTemplate } from "@/lib/templateLoader";
import connectToDatabase, { User } from "@/lib/mongodb";
import mongoose from "mongoose";

// Email queue to track pending emails
const emailQueue = new Map<
  string,
  {
    data: any;
    timer: NodeJS.Timeout;
    timestamp: number;
  }
>();

// console.log("MAP: ", emailQueue);

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

  return { success: true, message: "Email scheduled" };
}

// Sends the actual email based on queue data
async function sendQueuedEmail(data: any) {
  const {
    organizationId,
    email,
    eventTitle,
    candidateName,
    status,
    remark,
    rating,
    emailList,
    actionBy,
    prev_status,
    eventSubTitle,
    candidateDetails,
  } = data;

  //   const eventDescription: string = `<div>
  //   <strong>Candidate Name:</strong> ${candidateName || "N/A"}<br>
  //   <strong>Status:</strong> ${status || "N/A"}<br>
  //   <strong>Remark:</strong> ${remark || "N/A"}<br>
  //   <strong>Rating:</strong> ${rating || "N/A"}
  // </div>`;

  const htmlContent = loadTemplate("status-update", {
    eventTitle,
    candidateName,
    status,
    remark,
    rating,
    actionBy,
    prev_status,
    eventSubTitle,
    candidateDetails,
    // eventDescription,
  });
  console.log(`>>> ${email}, ${[...emailList]}`);
  return await sendMail(
    organizationId,
    [email, ...emailList],
    eventTitle,
    htmlContent
  );
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const {
      eventTitle,
      candidateName,
      status,
      remark,
      rating,
      immediate = false,
      id,
      prev_status,
    } = await req.json();

    let organizationId;
    const token = req.cookies.get("token");
    let decryptedResponse;
    if (token?.value) {
      decryptedResponse = await verifyAndDecryptToken(String(token?.value));
      if (decryptedResponse.success) {
        organizationId = decryptedResponse.user?.organizationId;
      } else {
        return NextResponse.json({ error: "Invalid token." }, { status: 401 });
      }
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is missing." },
        { status: 400 }
      );
    }

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
      .select("email")
      .lean();

    // console.log("FETCHED USERS: ", users);
    // console.log("USER COUNT: ", users.length);

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: "No active users found for this organization." },
        { status: 404 }
      );
    }

    const actionBy = decryptedResponse?.user.name;
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
      emailList,
      actionBy,
      prev_status,
      candidateDetails,
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
      console.log("QUEUED DATA: ", queueData);
      scheduleEmail(emailKey, queueData);

      return NextResponse.json({
        message:
          "Email scheduled successfully. It will be sent in 2 minutes with the most updated information.",
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
        status: value.data.status,
        remark: value.data.remark,
        rating: value.data.rating,
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
