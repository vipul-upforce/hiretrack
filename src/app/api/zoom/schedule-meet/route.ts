import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Settings, Candidate } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { createOAuth2Client } from '@/lib/google-calendar/config';
import { decryptText } from '@/lib/encryption';
import { google } from 'googleapis';
import { uploadFile, uploadFileToS3, saveFileLocally } from '@/lib/fileUtils';
import { logger } from '@/lib/logger/logger.server';
import { MeetingAttachment } from '@/lib/features/calendar/calendarApi';
import { getZoomAccessToken } from '@/lib/zoom/zoomAuth';
import { sendUnifiedMail } from '@/lib/notifications/email/unifiedEmailService';
import { getMappedEmailTemplate } from '@/lib/notifications/email/getMappedEmailTemplate';
import { generateCalendarLinks } from '@/app/api/event-mail/calendarUtils';

interface ScheduleMeetRequest {
  candidateId?: string;
  candidateName: string;
  candidateEmail: string;
  interviewerName: string;
  interviewerEmail?: string;
  scheduledTime: string;
  duration: number;
  guests?: string[];
  jobTitle?: string;
  organizationName?: string;
  jobId?: string;
  meetingNotes?: string;
  meetingAttachments?: MeetingAttachment[];
}

export async function POST(req: NextRequest) {
  try {
    const [userData, body] = await Promise.all([
      getAuthenticatedUser(req),
      req.json(),
      connectToDatabase(),
    ]);

    if (!Settings) {
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 500 },
      );
    }

    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = userData.organizationId || '';

    const {
      candidateId,
      candidateName,
      candidateEmail,
      interviewerName,
      interviewerEmail,
      scheduledTime,
      duration,
      guests,
      jobTitle = 'Position',
      organizationName = 'Company',
      meetingNotes = '',
      meetingAttachments = [],
    } = body as ScheduleMeetRequest;

    if (typeof duration === 'number' && duration > 40) {
      return NextResponse.json(
        { error: 'Zoom meeting duration cannot exceed 40 minutes' },
        { status: 400 },
      );
    }

    const settings = await Settings.findOne({ organizationId })
      .select('zoom googleCalendar timeZone fileStorage')
      .lean()
      .exec();

    if (
      !settings?.zoom?.accountId ||
      !settings.zoom.clientId ||
      !settings.zoom.clientSecret
    ) {
      return NextResponse.json(
        { error: 'Zoom is not configured' },
        { status: 400 },
      );
    }

    const { accessToken } = await getZoomAccessToken({
      organizationId,
      zoomConfig: settings.zoom,
    });

    // Get organization timezone from settings
    let organizationTimezone = settings.timeZone?.name || 'Asia/Kolkata';
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
    organizationTimezone =
      timezoneMap[organizationTimezone] || organizationTimezone;

    const zoomMeetingPayload = {
      topic: `Interview with ${candidateName} - ${jobTitle}`,
      type: 2,
      start_time: new Date(scheduledTime).toISOString(),
      duration: duration || 30,
      timezone: organizationTimezone,
      agenda: meetingNotes || '',
      settings: {
        join_before_host: false,
        mute_upon_entry: true,
        waiting_room: false,
      },
    };

    const zoomResponse = await fetch(
      'https://api.zoom.us/v2/users/me/meetings',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(zoomMeetingPayload),
      },
    );

    if (!zoomResponse.ok) {
      const errorText = await zoomResponse.text();
      logger.error(
        { status: zoomResponse.status, errorText },
        'Error scheduling Zoom meeting',
      );
      return NextResponse.json(
        { error: 'Failed to schedule Zoom meeting' },
        { status: 500 },
      );
    }

    const zoomData = (await zoomResponse.json()) as {
      id: number | string;
      join_url?: string;
      start_url?: string;
      topic?: string;
      agenda?: string;
    };

    const meetingId = String(zoomData.id || '');
    const meetingLink = zoomData.join_url || '';
    const startUrl = zoomData.start_url || '';

    // Upload meeting attachments and add to description (for calendar/email)
    const validAttachments =
      meetingAttachments?.filter(
        (att: MeetingAttachment) => att && att.name && att.url,
      ) || [];

    let uploadedAttachments: Array<{ name: string; url: string }> = [];
    if (validAttachments.length > 0) {
      const fileStorageSettings = settings.fileStorage;
      const uploadPromises = validAttachments.map(
        async (attachment: MeetingAttachment) => {
          try {
            let uploadedUrl = '';
            const timestamp = new Date().getTime();
            const uploadName =
              attachment.name || `meeting_attachment_${timestamp}`;

            const base64Data = attachment.url.startsWith('data:')
              ? attachment.url
              : `data:${attachment.type};base64,${attachment.url}`;

            switch (fileStorageSettings?.storageType) {
              case 'cloudinary':
                uploadedUrl = await uploadFile(
                  base64Data,
                  'documents',
                  organizationId,
                  uploadName,
                );
                break;
              case 's3':
                uploadedUrl = await uploadFileToS3(
                  base64Data,
                  'documents',
                  organizationId,
                  uploadName,
                );
                break;
              default:
                uploadedUrl = await saveFileLocally(
                  base64Data,
                  'documents',
                  uploadName,
                );
            }

            return { name: attachment.name, url: uploadedUrl };
          } catch (error) {
            logger.error(
              { error, url: req.url },
              'Failed to upload attachment:',
              error,
            );
            return { name: attachment.name, url: 'Upload failed' };
          }
        },
      );

      uploadedAttachments = await Promise.all(uploadPromises);
    }

    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    let description = `Interview scheduled for ${candidateName} for the position of ${jobTitle} at ${organizationName}.
      
Interviewer: ${interviewerName}
Candidate: ${candidateName}`;

    if (meetingNotes) {
      description += `\n\nMeeting Notes:\n${meetingNotes}`;
    }

    if (meetingLink) {
      description += `\n\nZoom Meeting Link:\n${meetingLink}`;
    }

    if (uploadedAttachments.length > 0) {
      description += '\n\nAttachments:';
      uploadedAttachments.forEach((attachment) => {
        const fullUrl = attachment.url.startsWith('/api/files')
          ? `${baseUrl}${attachment.url}`
          : attachment.url;
        description += `\n- ${attachment.name}: ${fullUrl}`;
      });
    }

    description += '\n\nThis meeting was scheduled through HireTrack.';

    let calendarEventId = '';
    let calendarHtmlLink = '';
    let summary = zoomMeetingPayload.topic;
    let calendarDescription = description;

    if (settings?.googleCalendar?.isConnected) {
      const clientSecret = decryptText(
        settings.googleCalendar.clientSecret,
        organizationId,
      );

      const refreshToken = decryptText(
        settings.googleCalendar.refreshToken,
        organizationId,
      );

      const oauth2Client = createOAuth2Client({
        clientId: settings.googleCalendar.clientId,
        clientSecret,
        redirectUri: '',
      });

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
        expiry_date: settings.googleCalendar.expiryDate,
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const startDateTime = new Date(scheduledTime);
      const endDateTime = new Date(
        startDateTime.getTime() + (duration || 30) * 60000,
      );

      const event = {
        summary,
        description: calendarDescription,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: organizationTimezone,
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: organizationTimezone,
        },
        attendees: (guests || []).map((email: string) => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all',
      });

      calendarEventId = response.data.id || '';
      calendarHtmlLink = response.data.htmlLink || '';
      calendarDescription = response.data.description || calendarDescription;
      summary = response.data.summary || summary;
    } else {
      try {
        const startDateTime = new Date(scheduledTime);
        const endDateTime = new Date(
          startDateTime.getTime() + (duration || 30) * 60000,
        );
        const calendarLinks = await generateCalendarLinks(
          req,
          zoomMeetingPayload.topic,
          startDateTime.toISOString(),
          endDateTime.toISOString(),
          jobTitle,
          interviewerName,
          candidateName,
          'interview',
          `${settings.timeZone?.offset || ''} ${settings.timeZone?.name || ''}`,
        );

        const { emailContent, emailSubject } = await getMappedEmailTemplate(
          'interview-assignment',
          {
            eventTitle: zoomMeetingPayload.topic,
            interviewDate: calendarLinks.startDateString,
            endDate: calendarLinks.endDateString,
            jobTitle,
            interviewerName,
            candidateName,
            interviewType: 'Interview',
            meetingLink,
            outlookCalendarLink: calendarLinks.outlookCalendarLink,
            candidateProfileLink: `${baseUrl}/candidate/${candidateId}`,
            organizationName,
            dashboardLink: `${baseUrl}/dashboard`,
          },
          organizationId,
        );

        const primaryRecipient =
          interviewerEmail || candidateEmail || (guests || [])[0] || '';
        const cc =
          candidateEmail && candidateEmail !== primaryRecipient
            ? [candidateEmail]
            : [];
        const bcc = (guests || []).filter(
          (email: string) =>
            email &&
            email !== primaryRecipient &&
            email !== (candidateEmail || ''),
        );

        if (primaryRecipient) {
          await sendUnifiedMail({
            organizationId,
            to: primaryRecipient,
            cc,
            bcc,
            subject: emailSubject,
            html: emailContent,
            sentBy: userData.id || 'system',
            sentByEmail: userData.email || '',
            sentByName: userData.name || 'System',
            recipientType: 'external',
            metadata: {
              jobId: body.jobId,
              candidateId,
              templateUsed: 'interview-assignment',
              eventType: 'interview_assignment',
            },
          });
        }
      } catch (emailError) {
        logger.error(
          { error: emailError, url: req.url },
          'Failed to send Zoom meeting email',
        );
      }
    }

    if (candidateId && Candidate) {
      const zoomMeetData = {
        meetingId,
        meetingLink,
        startUrl,
        eventId: calendarEventId,
        htmlLink: calendarHtmlLink,
        summary,
        description: calendarDescription,
        lastSyncedAt: new Date(),
      };

      // Use an aggregation pipeline (array syntax) to handle 'assignment: null' safely
      await Candidate.findByIdAndUpdate(candidateId, [
        {
          $set: {
            assignment: {
              $mergeObjects: [
                // If assignment is null or missing, use {}, otherwise use existing assignment
                { $ifNull: ['$assignment', {}] },
                // Merge in the new zoomMeet data
                { zoomMeet: zoomMeetData },
              ],
            },
          },
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      meetingId,
      meetingLink,
      startUrl,
      eventId: calendarEventId,
      htmlLink: calendarHtmlLink,
      summary,
      description: calendarDescription,
      message: 'Zoom meeting scheduled successfully',
    });
  } catch (error) {
    logger.error({ error, url: req.url }, 'Error scheduling Zoom meeting');
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to schedule meeting',
      },
      { status: 500 },
    );
  }
}
