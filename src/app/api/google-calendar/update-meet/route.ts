import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings, Candidate } from "@/lib/mongodb";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { createOAuth2Client } from "@/lib/google-calendar/config";
import { decryptText } from "@/lib/encryption";
import { google } from "googleapis";

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
    const token = req.cookies.get("token");
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
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    if (scheduledTime && duration) {
      const startDateTime = new Date(scheduledTime);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
      
      // Get organization timezone from settings
      let organizationTimezone = settings.timeZone?.name || 'Asia/Kolkata';
      
      // Map common timezone names to Google Calendar format
      const timezoneMap: { [key: string]: string } = {
        'Asia/Kolkata': 'Asia/Kolkata',
        'America/New_York': 'America/New_York',
        'America/Los_Angeles': 'America/Los_Angeles',
        'Europe/London': 'Europe/London',
        'GMT+05:30': 'Asia/Kolkata',
        'GMT+00:00': 'UTC',
        'GMT-05:00': 'America/New_York',
        'GMT-08:00': 'America/Los_Angeles',
      };
      
      organizationTimezone = timezoneMap[organizationTimezone] || organizationTimezone;
      
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

    // Update candidate record if candidateId is provided
    if (candidateId && Candidate) {
      try {
        const updateFields: any = {};
        if (response.data.hangoutLink) {
          updateFields["assignment.googleMeet.meetingLink"] = response.data.hangoutLink;
        }
        if (response.data.htmlLink) {
          updateFields["assignment.googleMeet.htmlLink"] = response.data.htmlLink;
        }
        if (Object.keys(updateFields).length > 0) {
          await Candidate.findByIdAndUpdate(candidateId, { $set: updateFields });
        }
      } catch (error) {
        console.error("Failed to update candidate record:", error);
      }
    }

    return NextResponse.json({
      success: true,
      eventId: response.data.id,
      meetingLink: response.data.hangoutLink,
      htmlLink: response.data.htmlLink,
      message: "Google Meet updated successfully",
    });
  } catch (error) {
    console.error("Google Meet update error:", error);
    
    if (error instanceof Error && error.message.includes("invalid_grant")) {
      return NextResponse.json(
        { error: "Google Calendar token expired. Please reconnect in settings." },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update meeting",
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
    const token = req.cookies.get("token");
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
          $unset: { "assignment.googleMeet": "" }
        });
      } catch (error) {
        console.error("Failed to update candidate record:", error);
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
        { error: "Google Calendar token expired. Please reconnect in settings." },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to cancel meeting",
      },
      { status: 500 }
    );
  }
}