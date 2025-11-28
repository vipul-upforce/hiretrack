import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings, Candidate } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";
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
    // Optimize: Parallelize authentication, database connection, and request parsing
    const [userData, , body] = await Promise.all([
      getAuthenticatedUser(req, ["admin", "hr", "interviewer"]),
      connectToDatabase(),
      req.json(),
    ]);

    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId = userData.organizationId;
    const orgId = userData.organizationId;
    const { candidateId, eventId, scheduledTime, duration, guests } = body as UpdateMeetRequest;

    if (!Settings) {
      return NextResponse.json(
        { error: "Settings model not available" },
        { status: 500 }
      );
    }

    // Optimize: Fetch only needed fields from Settings
    const settings = await Settings.findOne({ organizationId })
      .select("googleCalendar timeZone.name")
      .lean()
      .exec();

    if (!settings?.googleCalendar?.isConnected) {
      return NextResponse.json(
        { error: "Google Calendar is not connected" },
        { status: 400 }
      );
    }

    // Decrypt credentials
    const clientSecret = decryptText(
      settings.googleCalendar.clientSecret,
      orgId
    );
    const accessToken = decryptText(settings.googleCalendar.accessToken, orgId);
    const refreshToken = decryptText(
      settings.googleCalendar.refreshToken,
      orgId
    );

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
    const updateData: {
      start?: { dateTime: string; timeZone: string };
      end?: { dateTime: string; timeZone: string };
      attendees?: Array<{ email: string }>;
    } = {};

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
        const updateFields: Record<string, unknown> = {};
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
    const [userData] = await Promise.all([
      getAuthenticatedUser(req, ["admin", "hr", "interviewer"]),
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json(
        { message: "Unauthorised Access" },
        { status: 401 }
      );
    }
    const organizationId = userData.organizationId;
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
    if (!Settings) {
      return NextResponse.json(
        { error: "Settings model not available" },
        { status: 500 }
      );
    }

    // Optimize: Fetch only needed fields from Settings
    const settings = await Settings.findOne({ organizationId })
      .select("googleCalendar timeZone.name")
      .lean()
      .exec();

    if (!settings?.googleCalendar?.isConnected) {
      return NextResponse.json(
        { error: "Google Calendar is not connected" },
        { status: 400 }
      );
    }

    // Decrypt credentials
    const clientSecret = decryptText(
      settings.googleCalendar.clientSecret,
      organizationId 
    );
    const accessToken = decryptText(settings.googleCalendar.accessToken, organizationId);
    const refreshToken = decryptText(
      settings.googleCalendar.refreshToken,
      organizationId
    );

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

    // Optimize: Cancel event and clear candidate data in parallel where possible
    const cancelEventPromise = cancelNotes.trim()
      ? (async () => {
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
            console.error("Failed to cancel event:", error);
          }
        })()
      : calendar.events.patch({
          calendarId: "primary",
          eventId: eventId,
          requestBody: {
            status: "cancelled",
          },
          sendUpdates: "all",
        });

    // Clear Google Meet data from candidate record (can run in parallel with event cancellation)
    const clearCandidatePromise = candidateId && Candidate
      ? Candidate.findByIdAndUpdate(candidateId, {
          $unset: { "assignment.googleMeet": "" },
        })
          .lean()
          .exec()
          .catch((error) => {
            console.error("Failed to clear candidate record:", error);
          })
      : Promise.resolve(null);

    // Wait for both operations
    await Promise.all([cancelEventPromise, clearCandidatePromise]);

    // Fetch candidate for notification (only if needed)
    if (candidateId) {
      // Optimize: Fetch only needed fields with optimized populate
      const candidate = await Candidate.findById(candidateId)
        .select("_id name jobId assignment.interviewerId")
        .populate({
          path: "jobId",
          select: "_id title",
        })
        .populate({
          path: "assignment.interviewerId",
          select: "_id name",
        })
        .lean();

      if (candidate) {
        const jobId =
          candidate.jobId &&
          typeof candidate.jobId !== "string" &&
          "_id" in candidate.jobId
            ? candidate.jobId._id.toString()
            : "";

        const jobTitle =
          candidate.jobId &&
          typeof candidate.jobId !== "string" &&
          "title" in candidate.jobId
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
