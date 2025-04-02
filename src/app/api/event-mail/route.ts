// pages/api/send-event-email.js
// import { sendMail } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings } from "@/lib/mongodb";
import { createTransport, TransportOptions } from "nodemailer";

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
    const user = JSON.parse(req.cookies.get("user")?.value || "{}");
    // const organizationId  = "67e12860196bf5e08045d22f";
    const { organizationId } = JSON.parse(user);

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
    const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${eventTitle}</h2>
            <p><strong>Start Time:</strong> ${startDate.toLocaleString()}</p>
            <p><strong>End Time:</strong> ${endDate.toLocaleString()}</p>
            <p>${eventDescription}</p>
            <div style="margin-top: 20px;">
              <p>Add this event to your calendar:</p>
              <a href="${googleCalendarLink}" target="_blank" style="display: inline-block; background-color: #4285F4; color: white; padding: 10px 15px; margin-right: 10px; text-decoration: none; border-radius: 4px;">Google Calendar</a>
              <a href="${outlookCalendarLink}" target="_blank" style="display: inline-block; background-color: #0078D4; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">Outlook Calendar</a>
            </div>
          </div>
        `;

    const emailStatus = await sendMail(
      organizationId,
      email,
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


 const sendMail = async (
  orgID: string,
  email: string,
  eventTitle: string,
  htmlContent: string
): Promise<{ status: number; message: string }> => {
  try {
    await connectToDatabase();
    if (!Settings) {
      return { status: 404, message: "Setting Model not found" };
    }
    const settingInfo = await Settings?.find({ organizationId: orgID });

    // Check if settingInfo is not empty
    if (!settingInfo || settingInfo.length === 0) {
      return { status: 404, message: "Settings not found" };
    }

    // Access the first document in the array
    const settings = settingInfo[0];

    // Configure email transporter
    const transporter = createTransport({
      host: settings.mailConfig.smtp_host,
      port: settings.mailConfig.smtp_port,
      secure: Number(settings.mailConfig.smtp_port) === 465,
      auth: {
        user: settings.mailConfig.smtp_user,
        pass: settings.mailConfig.smtp_password,
      },
    } as TransportOptions);

    // Send email
    const mailOptions = {
      from: settings.mailConfig.smtp_from,
      to: email,
      subject: `Event Invitation: ${eventTitle}`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    return { status: 200, message: "Email Sent Successfully" };
  } catch {
    return { status: 500, message: "Unknown Error Occurred" };
  }
};