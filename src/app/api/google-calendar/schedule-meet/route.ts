import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings, Candidate } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";
import { createOAuth2Client } from "@/lib/google-calendar/config";
import { decryptText } from "@/lib/encryption";
import { google } from "googleapis";
import { uploadFile, uploadFileToS3, saveFileLocally } from "@/lib/fileUtils";

interface ScheduleMeetRequest {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  interviewerId: string;
  interviewerName: string;
  scheduledTime: string;
  duration: number;
  guests: string[];
  jobId?: string;
  jobTitle?: string;
  organizationName?: string;
  meetingNotes?: string;
  meetingAttachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const [userData, body] = await Promise.all([
      getAuthenticatedUser(req),
      req.json(),
      connectToDatabase(),
    ]);

    if (!Settings) {
      console.error("❌ Settings model not found");
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 500 }
      );
    }

    // Verify user
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = userData.organizationId || "";


    const {
      candidateId,
      candidateName,
      candidateEmail,
      interviewerName,
      scheduledTime,
      duration,
      guests,
      jobTitle = "Position",
      organizationName = "Company",
      meetingNotes = "",
      meetingAttachments = [],
    } = body;

    // Get Google Calendar settings
    const settings = await Settings.findOne({ organizationId }).select("googleCalendar timeZone fileStorage").lean().exec();
    console.log("⚙️ Settings found:", !!settings);
    console.log(
      "🔗 Google Calendar connected:",
      settings?.googleCalendar?.isConnected
    );

    if (!settings?.googleCalendar?.isConnected) {
      console.error("❌ Google Calendar not connected");
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
      redirectUri: "", // Not needed for API calls
    });

    // Set credentials
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: settings.googleCalendar.expiryDate,
    });

    // Create calendar instance
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

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

    // Use mapped timezone if available, otherwise use the original
    organizationTimezone =
      timezoneMap[organizationTimezone] || organizationTimezone;

    console.log("🌍 Organization timezone:", {
      original: settings.timeZone?.name,
      mapped: organizationTimezone,
      offset: settings.timeZone?.offset,
    });

    // Calculate end time
    const startDateTime = new Date(scheduledTime);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    console.log("⏰ Meeting time:", {
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      timezone: organizationTimezone,
    });

    // Build description with notes and attachments
    let description = `Interview scheduled for ${candidateName} for the position of ${jobTitle} at ${organizationName}.
      
Interviewer: ${interviewerName}
Candidate: ${candidateName}`;

    if (meetingNotes) {
      description += `\n\nMeeting Notes:\n${meetingNotes}`;
    }

    // Upload meeting attachments and add to description
    const validAttachments =
      meetingAttachments?.filter((att) => att && att.name && att.url) || [];
    if (validAttachments.length > 0) {
      description += `\n\nAttachments:`;

      const fileStorageSettings = settings.fileStorage;
      const uploadPromises = validAttachments.map(async (attachment) => {
        try {
          let uploadedUrl = "";
          const timestamp = new Date().getTime();
          const uploadName =
            attachment.name || `meeting_attachment_${timestamp}`;

          // Convert attachment data to base64 if needed
          const base64Data = attachment.url.startsWith("data:")
            ? attachment.url
            : `data:${attachment.type};base64,${attachment.url}`;

          switch (fileStorageSettings?.storageType) {
            case "cloudinary":
              uploadedUrl = await uploadFile(
                base64Data,
                "documents",
                organizationId,
                uploadName
              );
              break;
            case "s3":
              uploadedUrl = await uploadFileToS3(
                base64Data,
                "documents",
                organizationId,
                uploadName
              );
              break;
            default:
              uploadedUrl = await saveFileLocally(
                base64Data,
                "documents",
                uploadName
              );
          }

          return { name: attachment.name, url: uploadedUrl };
        } catch (error) {
          console.error("Failed to upload attachment:", error);
          return { name: attachment.name, url: "Upload failed" };
        }
      });

      const uploadedAttachments = await Promise.all(uploadPromises);

      // Get the base URL from the request headers
      const protocol = req.headers.get("x-forwarded-proto") || "http";
      const host = req.headers.get("host") || "localhost:3000";
      const baseUrl = `${protocol}://${host}`;

      uploadedAttachments.forEach((attachment) => {
        // If it's a local file URL, prepend the base URL
        const fullUrl = attachment.url.startsWith("/api/files")
          ? `${baseUrl}${attachment.url}`
          : attachment.url;
        description += `\n- ${attachment.name}: ${fullUrl}`;
      });
    }

    description += `\n\nThis meeting was scheduled through HireTrack.`;

    // Create event
    const event = {
      summary: `Interview with ${candidateName} - ${jobTitle}`,
      description,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: organizationTimezone,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: organizationTimezone,
      },
      attendees: guests.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `hiretrack-${Date.now()}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 15 },
        ],
      },
    };

    // Create the event with conference
    console.log("📅 Creating Google Calendar event...");
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: "all",
    });

    console.log("✅ Google Calendar event created:", response.data.id);
    console.log("🔗 Meeting link:", response.data.hangoutLink);

    // Extract meeting details
    const meetingLink = response.data.hangoutLink || "";
    const eventId = response.data.id || "";
    const htmlLink = response.data.htmlLink || "";
    const summary = event.summary;

    // Store initial attendee list with 'needsAction' status
    const initialAttendeeResponses = guests.map((email) => ({
      email,
      name:
        email === candidateEmail
          ? candidateName
          : email === settings.googleCalendar?.connectedEmail
            ? interviewerName
            : email.split("@")[0], // Default to email prefix for other attendees
      responseStatus: "needsAction" as const,
      lastUpdated: new Date(),
      notificationSent: false,
    }));

    // Update candidate record with Google Meet info and initial attendee responses
    if (candidateId) {
      await Candidate.findByIdAndUpdate(candidateId, {
        "assignment.googleMeet": {
          eventId,
          meetingLink,
          htmlLink,
          summary,
          description,
          attendeeResponses: initialAttendeeResponses,
          lastSyncedAt: new Date(),
        },
      });
      console.log(
        "✅ Updated candidate with meeting details and attendee list"
      );
    }

    // Try to set up webhook for this event (non-blocking)
    try {
      // Generate unique channel ID
      const channelId = `hiretrack-${organizationId}-${Date.now()}`;
      const expirationTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now

      // Only set up webhook if we have a valid BASE_URL (production environment)
      if (process.env.BASE_URL && process.env.ENVIRONMENT === "production") {
        const webhookUrl = `${process.env.BASE_URL}/api/google-calendar/webhook`;

        // Watch the event for changes
        const watchResponse = await calendar.events.watch({
          calendarId: "primary",
          requestBody: {
            id: channelId,
            type: "web_hook",
            address: webhookUrl,
            token:
              process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN ||
              "hiretrack-webhook-secret",
            expiration: expirationTime.toString(),
          },
        });

        // Store webhook subscription
        if (watchResponse.data.resourceId) {
          const { WebhookSubscription } = await import("@/lib/mongodb");
          await WebhookSubscription.create({
            organizationId,
            resourceId: watchResponse.data.resourceId,
            channelId: channelId,
            eventId: eventId,
            candidateId: candidateId,
            jobId: body.jobId || "",
            expirationTime: new Date(expirationTime),
            active: true,
          });
          console.log("✅ Webhook subscription created for event:", eventId);
        }
      } else {
        console.log(
          "ℹ️ Webhook not configured (development environment or missing BASE_URL)"
        );
      }
    } catch (webhookError) {
      console.error(
        "⚠️ Failed to set up webhook (non-critical):",
        webhookError
      );
      // Continue without webhook - manual sync will be available
    }

    return NextResponse.json({
      success: true,
      eventId,
      meetingLink,
      htmlLink,
      summary,
      description,
      attendees: initialAttendeeResponses,
      message: "Google Meet scheduled successfully",
    });
  } catch (error) {
    console.error("Google Meet scheduling error:", error);

    // Handle token expiry
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
          error instanceof Error ? error.message : "Failed to schedule meeting",
      },
      { status: 500 }
    );
  }
}
