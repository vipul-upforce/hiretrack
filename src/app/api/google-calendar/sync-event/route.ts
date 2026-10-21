import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  Settings,
  Candidate,
  History,
  User,
} from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { createOAuth2Client } from '@/lib/google-calendar/config';
import { decryptText } from '@/lib/encryption';
import { google } from 'googleapis';
import { NotificationService } from '@/lib/notifications/notificationService';

interface SyncEventRequest {
  candidateId: string;
  eventId?: string; // Optional, can be retrieved from candidate record
  jobId?: string; // Optional, can be retrieved from candidate record
}

export async function POST(req: NextRequest) {
  try {
    const [userData] = await Promise.all([
      getAuthenticatedUser(req, ['admin', 'hr', 'interviewer']),
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json(
        { message: 'Unauthorised Access' },
        { status: 401 },
      );
    }
    const { organizationId } = userData;

    const body: SyncEventRequest = await req.json();
    const { candidateId } = body;

    // Get candidate details
    const candidate = await Candidate?.findById(candidateId)
      .populate('jobId')
      .populate('assignment.interviewerId')
      .lean();
    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    // Check if candidate has Google Meet details
    if (!candidate.assignment?.googleMeet?.eventId) {
      return NextResponse.json(
        { error: 'No Google Meet scheduled for this candidate' },
        { status: 400 },
      );
    }

    const { eventId } = candidate.assignment.googleMeet;
    const jobId =
      typeof candidate.jobId === 'object' &&
      candidate.jobId !== null &&
      '_id' in candidate.jobId
        ? candidate.jobId._id.toString()
        : candidate.jobId?.toString() || '';
    const jobTitle =
      typeof candidate.jobId === 'object' &&
      candidate.jobId !== null &&
      'title' in candidate.jobId
        ? candidate.jobId.title
        : 'Position';

    // Get Google Calendar settings
    const settings = await Settings?.findOne({ organizationId });
    if (!settings?.googleCalendar?.isConnected) {
      return NextResponse.json(
        { error: 'Google Calendar is not connected' },
        { status: 400 },
      );
    }

    // Decrypt credentials
    const clientSecret = decryptText(
      settings.googleCalendar.clientSecret,
      organizationId,
    );
    const accessToken = decryptText(
      settings.googleCalendar.accessToken,
      organizationId,
    );
    const refreshToken = decryptText(
      settings.googleCalendar.refreshToken,
      organizationId,
    );

    // Create OAuth2 client
    const oauth2Client = createOAuth2Client({
      clientId: settings.googleCalendar.clientId,
      clientSecret,
      redirectUri: '',
    });

    // Set credentials
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: settings.googleCalendar.expiryDate,
    });

    // Create calendar instance
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Fetch event details from Google Calendar
    const eventResponse = await calendar.events.get({
      calendarId: 'primary',
      eventId,
    });

    const event = eventResponse.data;

    // Process attendee responses
    const attendees = event.attendees || [];
    const previousResponses =
      candidate.assignment.googleMeet.attendeeResponses || [];
    const updatedResponses = [];
    const historyEntries = [];
    const notificationPromises = [];
    for (const attendee of attendees) {
      const attendeeEmail = attendee.email || '';
      const user = await User?.findOne({ email: attendeeEmail }).select('name');
      const attendeeName = attendee.displayName || user?.name || '';
      const responseStatus = attendee.responseStatus || 'needsAction';

      // Find previous response for this attendee
      const previousResponse = previousResponses.find(
        (r) => r.email === attendeeEmail,
      );

      // Check if response has changed
      const hasChanged =
        !previousResponse || previousResponse.responseStatus !== responseStatus;

      // Create updated response object
      const updatedResponse = {
        email: attendeeEmail,
        name: attendeeName,
        responseStatus: responseStatus as
          | 'needsAction'
          | 'accepted'
          | 'declined'
          | 'tentative',
        comment: attendee.comment,
        lastUpdated: new Date(),
        notificationSent: previousResponse?.notificationSent || false,
      };

      updatedResponses.push(updatedResponse);

      // If response changed and notification not already sent for this status
      if (hasChanged && responseStatus !== 'needsAction') {
        const shouldNotify =
          !previousResponse ||
          previousResponse.responseStatus !== responseStatus ||
          !previousResponse.notificationSent;

        if (shouldNotify) {
          // Mark notification as sent
          updatedResponse.notificationSent = true;

          // Create history entry
          let actionVerb: string;
          if (responseStatus === 'accepted') {
            actionVerb = 'accepted';
          } else if (responseStatus === 'declined') {
            actionVerb = 'declined';
          } else if (responseStatus === 'tentative') {
            actionVerb = 'tentatively accepted';
          } else {
            actionVerb = 'updated response for';
          }
          const historyMessage = `${attendeeName} (${attendeeEmail}) ${actionVerb} the interview invitation`;

          historyEntries.push({
            title: `Meeting invite ${responseStatus}`,
            dateTime: new Date().toISOString(),
            currentInterviewer: null,
            previousInterviewer: null,
            assignmentBy: null, // System generated
            note: {
              description: historyMessage,
              date: new Date().toISOString(),
              rating: 0,
              userId: null, // System generated
            },
            attachments: [],
          });

          // Prepare notification based on response status
          const notificationParams = {
            organizationId,
            candidateId,
            candidateName: candidate.name,
            jobId,
            jobTitle,
            userEmail: userData.email,
            attendeeEmail,
            attendeeName: attendeeName as string,
            interviewerId:
              candidate.assignment?.interviewerId?._id?.toString() ||
              candidate.assignment?.interviewerId?.toString(),
            interviewerName: candidate.assignment?.interviewerId?.name,
            interviewerEmail: candidate.assignment?.interviewerId?.email,
            meetingDate: candidate.assignment?.time
              ? new Date(candidate.assignment.time)
              : undefined,
          };

          switch (responseStatus) {
            case 'accepted':
              notificationPromises.push(
                NotificationService.notifyMeetingInviteAccepted(
                  notificationParams,
                ),
              );
              break;
            case 'declined':
              notificationPromises.push(
                NotificationService.notifyMeetingInviteDeclined(
                  notificationParams,
                ),
              );
              break;
            case 'tentative':
              notificationPromises.push(
                NotificationService.notifyMeetingInviteTentative(
                  notificationParams,
                ),
              );
              break;
            default:
              // No notification for other statuses (e.g., 'needsAction')
              break;
          }
        }
      }
    }

    // Update candidate with new attendee responses
    await Candidate?.findByIdAndUpdate(candidateId, {
      'assignment.googleMeet.attendeeResponses': updatedResponses,
      'assignment.googleMeet.lastSyncedAt': new Date(),
    });

    // Add history entries if any changes detected
    if (historyEntries.length > 0) {
      const existingHistory = await History?.findOne({ candidateId });
      if (existingHistory) {
        existingHistory.history.push(...historyEntries);
        await existingHistory.save();
      } else {
        await History?.create({
          candidateId,
          history: historyEntries,
        });
      }
    }

    // Send notifications
    if (notificationPromises.length > 0) {
      await Promise.all(notificationPromises);
    }

    // Return sync results
    return NextResponse.json({
      success: true,
      message: 'Event synced successfully',
      data: {
        eventId,
        eventStatus: event.status,
        attendeeResponses: updatedResponses,
        changesDetected: historyEntries.length > 0,
        notificationsSent: notificationPromises.length,
      },
    });
  } catch (error) {
    // Handle token expiry
    if (error instanceof Error && error.message.includes('invalid_grant')) {
      return NextResponse.json(
        {
          error: 'Google Calendar token expired. Please reconnect in settings.',
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to sync event',
      },
      { status: 500 },
    );
  }
}
