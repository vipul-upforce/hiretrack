import { NextRequest, NextResponse } from "next/server";
import { sendMail } from ".";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { loadTemplate } from "@/lib/templateLoader";
import { User } from "@/lib/mongodb";

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
    } = await req.json();
    let organizationId;
    const token = req.cookies.get("token");
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
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

    // Prepare a new detailed event description with HTML formatting
    const eventDescription: string = `<div><strong>Job Name:</strong> ${
      jobName || "N/A"
    }<br>
<strong>Interviewer Name:</strong> ${interviewerName || "N/A"}<br>
<strong>Candidate Name:</strong> ${candidateName || "N/A"}<br>
<strong>Status:</strong> ${status || "N/A"}
</div>
    `;

    // Validate required fields
    if (!email || !eventTitle || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Email, event title, start time, and end time are required." },
        { status: 400 }
      );
    }

    // Validate email format using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Simple email regex
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format." },
        { status: 400 }
      );
    }

    // Validate date format
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
    // Format dates for calendar links
    const formattedStartTime = startDate
      .toISOString()
      .replace(/-|:|\.\d+/g, "");
    const formattedEndTime = endDate.toISOString().replace(/-|:|\.\d+/g, "");

    // Create calendar links
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

    // Prepare email HTML content
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

    const emailStatus = await sendMail(
      organizationId,
      [email, ...emailList],
      eventTitle,
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
