import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings, Candidate } from "@/lib/mongodb";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { createOAuth2Client } from "@/lib/google-calendar/config";
import { decryptText } from "@/lib/encryption";
import { google } from "googleapis";
import { NotificationService } from "@/lib/notifications/notificationService";

interface UpdateMeetRequest {
  candidateId?: string;
  eventId: string;
  scheduledTime?: string;
  duration?: number;
  guests?: string[];
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();

    // Verify user
    let organizationId = "";
    const token = req.cookies.get("auth_token");
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        organizationId = userData.organizationId || "";
      } else {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const body: UpdateMeetRequest = await req.json();
    const { candidateId, eventId, scheduledTime, duration, guests } = body;

    // Get Google Calendar settings
    if (!Settings) {
      return NextResponse.json(
        { error: "Settings model not available" },
        { status: 500 }
      );
    }

    const settings = await Settings.findOne({ organizationId });
    if (!settings?.googleCalendar?.isConnected) {
      return NextResponse.json(
        { error: "Google Calendar is not connected" },
        { status: 400 }
      );
    }

    // Decrypt credentials
    const clientSecret = decryptText(settings.googleCalendar.clientSecret);
    const accessToken = decryptText(settings.googleCalendar.accessToken);
    const refreshToken = decryptText(settings.googleCalendar.refreshToken);

    // Create OAuth2 client
    const oauth2Client = createOAuth2Client({
      clientId: settings.googleCalendar.clientId,
      clientSecret: clientSecret,
      redirectUri: "",
    });

    // Set credentials
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: settings.googleCalendar.expiryDate,
    });

    // Create calendar instance
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Get existing event
    const existingEvent = await calendar.events.get({
      calendarId: "primary",
      eventId: eventId,
    });

    if (!existingEvent.data) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    // Prepare update data
    const updateData: any = {};

    if (scheduledTime && duration) {
      const startDateTime = new Date(scheduledTime);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      // Get organization timezone from settings
      let organizationTimezone = settings.timeZone?.name || "Asia/Kolkata";

      // Map common timezone names to Google Calendar format
      const timezoneMap: { [key: string]: string } = {
        "Asia/Kolkata": "Asia/Kolkata",
        "America/New_York": "America/New_York",
        "America/Los_Angeles": "America/Los_Angeles",
        "Europe/London": "Europe/London",
        "GMT+05:30": "Asia/Kolkata",
        "GMT+00:00": "UTC",
        "GMT-05:00": "America/New_York",
        "GMT-08:00": "America/Los_Angeles",
      };

      organizationTimezone =
        timezoneMap[organizationTimezone] || organizationTimezone;

      updateData.start = {
        dateTime: startDateTime.toISOString(),
        timeZone: organizationTimezone,
      };
      updateData.end = {
        dateTime: endDateTime.toISOString(),
        timeZone: organizationTimezone,
      };
    }

    if (guests) {
      updateData.attendees = guests.map((email) => ({ email }));
    }

    // Update the event
    const response = await calendar.events.patch({
      calendarId: "primary",
      eventId: eventId,
      requestBody: updateData,
      sendUpdates: "all",
    });

    // Extract updated event details for response

    const updatedEvent = response.data;
    const summary = updatedEvent.summary || existingEvent.data.summary;
    const description =
      updatedEvent.description || existingEvent.data.description;
    const attendees =
      updatedEvent.attendees?.map((att) => ({
        email: att.email,
        name: att.displayName || att.email?.split("@")[0] || att.email,
        responseStatus: att.responseStatus || "needsAction",
        lastUpdated: new Date(),
        notificationSent: false,
      })) || [];

    // Update candidate record if candidateId is provided
    if (candidateId && Candidate) {
      try {
        const updateFields: any = {};
        if (updatedEvent.hangoutLink) {
          updateFields["assignment.googleMeet.meetingLink"] =
            updatedEvent.hangoutLink;
        }
        if (updatedEvent.htmlLink) {
          updateFields["assignment.googleMeet.htmlLink"] =
            updatedEvent.htmlLink;
        }
        // Update summary, description, and attendeeResponses if changed
        updateFields["assignment.googleMeet.summary"] = summary;
        updateFields["assignment.googleMeet.description"] = description;
        updateFields["assignment.googleMeet.attendeeResponses"] = attendees;
        updateFields["assignment.googleMeet.lastSyncedAt"] = new Date();

        if (Object.keys(updateFields).length > 0) {
          await Candidate.findByIdAndUpdate(candidateId, {
            $set: updateFields,
          });
        }
      } catch (error) {
        console.error("Failed to update candidate record:", error);
      }
    }

    return NextResponse.json({
      success: true,
      eventId: updatedEvent.id,
      meetingLink: updatedEvent.hangoutLink,
      htmlLink: updatedEvent.htmlLink,
      summary,
      description,
      attendees,
      message: "Google Meet updated successfully",
    });
  } catch (error) {
    console.error("Google Meet update error:", error);

    if (error instanceof Error && error.message.includes("invalid_grant")) {
      return NextResponse.json(
        {
          error: "Google Calendar token expired. Please reconnect in settings.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update meeting",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();

    // Verify user
    let organizationId = "";
    let userData: any = null;

    const token = req.cookies.get("auth_token");
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      userData = decryptedResponse.user;
      console.log(userData, "USERDATA  YYYisksd");

      if (decryptedResponse.success) {
        organizationId = userData.organizationId || "";
      } else {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }



    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const candidateId = searchParams.get("candidateId");
    const cancelNotes = searchParams.get("cancelNotes") || "";

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }
    console.log();
    // Get Google Calendar settings
    if (!Settings) {
      return NextResponse.json(
        { error: "Settings model not available" },
        { status: 500 }
      );
    }

    const settings = await Settings.findOne({ organizationId });
    if (!settings?.googleCalendar?.isConnected) {
      return NextResponse.json(
        { error: "Google Calendar is not connected" },
        { status: 400 }
      );
    }

    // Decrypt credentials
    const clientSecret = decryptText(settings.googleCalendar.clientSecret);
    const accessToken = decryptText(settings.googleCalendar.accessToken);
    const refreshToken = decryptText(settings.googleCalendar.refreshToken);

    // Create OAuth2 client
    const oauth2Client = createOAuth2Client({
      clientId: settings.googleCalendar.clientId,
      clientSecret: clientSecret,
      redirectUri: "",
    });

    // Set credentials
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: settings.googleCalendar.expiryDate,
    });

    // Create calendar instance
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // If cancel notes are provided, update the event description before deletion
    if (cancelNotes.trim()) {
      try {
        const existingEvent = await calendar.events.get({
          calendarId: "primary",
          eventId: eventId,
        });

        const updatedDescription = `${existingEvent.data.description || ""}\n\n--- MEETING CANCELLED ---\nReason: ${cancelNotes}\nCancelled on: ${new Date().toISOString()}`;

        await calendar.events.patch({
          calendarId: "primary",
          eventId: eventId,
          requestBody: {
            description: updatedDescription,
            status: "cancelled",
          },
          sendUpdates: "all",
        });
      } catch (error) {
        console.error("Failed to update event before cancellation:", error);
      }
    } else {
      // Just cancel without notes
      await calendar.events.patch({
        calendarId: "primary",
        eventId: eventId,
        requestBody: {
          status: "cancelled",
        },
        sendUpdates: "all",
      });
    }

    // Clear Google Meet data from candidate record
    if (candidateId && Candidate) {
      try {
        await Candidate.findByIdAndUpdate(candidateId, {
          $unset: { "assignment.googleMeet": "" },
        });
      } catch (error) {
        console.error("Failed to update candidate record:", error);
      }
    }

    // After cancelling the Google Meet in your DELETE handler:
    if (candidateId) {
      const candidate = await Candidate.findById(candidateId)
        .populate("jobId")
        .populate("assignment.interviewerId")
        .lean(); // 👈 makes typing easier


      if (candidate) {
        const jobId =
          candidate.jobId && typeof candidate.jobId !== "string" && "_id" in candidate.jobId
            ? candidate.jobId._id.toString()
            : "";

        const jobTitle =
          candidate.jobId && typeof candidate.jobId !== "string" && "title" in candidate.jobId
            ? candidate.jobId.title
            : "Unknown Job";

        await NotificationService.notifyMeetingCancelled({
          organizationId,
          candidateId: candidate._id.toString(),
          candidateName: candidate.name,
          jobId,
          jobTitle,
          interviewerId:
            candidate.assignment?.interviewerId &&
              typeof candidate.assignment.interviewerId !== "string"
              ? candidate.assignment.interviewerId._id.toString()
              : "",
          interviewerName:
            candidate.assignment?.interviewerId &&
              typeof candidate.assignment.interviewerId !== "string"
              ? candidate.assignment.interviewerId.name
              : "Interviewer",
          triggerUserId: userData?.id || "",
          triggerUserName: userData?.name || "System",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Google Meet cancelled successfully",
    });
  } catch (error) {
    console.error("Google Meet cancellation error:", error);

    if (error instanceof Error && error.message.includes("invalid_grant")) {
      return NextResponse.json(
        {
          error: "Google Calendar token expired. Please reconnect in settings.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to cancel meeting",
      },
      { status: 500 }
    );
  }
}
