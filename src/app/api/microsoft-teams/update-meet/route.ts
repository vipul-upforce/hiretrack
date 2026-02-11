import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Settings, Candidate, History } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { decryptText } from '@/lib/encryption';
import { uploadFile, uploadFileToS3, saveFileLocally } from '@/lib/fileUtils';
import { MeetingAttachment } from '@/lib/features/calendar/calendarApi';
import { google } from 'googleapis';
import { NotificationService } from '@/lib/notifications/notificationService';
import { logger } from '@/lib/logger/logger.server';
import { broadcastCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import { ICandidate } from '@/lib/models/candidate';
import { ICandidateHistory } from '@/lib/models/history';
import {
  getTeamsAccessToken,
  getMicrosoftCalendarAccessToken,
} from '@/lib/microsoft-teams/teamsAuth';
import { createOAuth2Client } from '@/lib/google-calendar/config';

interface UpdateMeetRequest {
  candidateId?: string;
  meetingId: string;
  eventId?: string;
  scheduledTime?: string;
  duration?: number;
  guests?: string[];
  meetingNotes?: string;
  meetingAttachments?: MeetingAttachment[];
}

export async function PUT(req: NextRequest) {
  try {
    const [userData, , body] = await Promise.all([
      getAuthenticatedUser(req, ['admin', 'hr', 'interviewer']),
      connectToDatabase(),
      req.json(),
    ]);

    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = userData;
    const {
      candidateId,
      meetingId,
      eventId,
      scheduledTime,
      duration,
      guests,
      meetingNotes = '',
      meetingAttachments = [],
    } = body as UpdateMeetRequest;

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 },
      );
    }

    // Fetch candidate data to get candidate name, job title, and interviewer name for subject line
    let candidateName = '';
    let jobTitle = 'Position';
    let interviewerName = '';
    if (candidateId && Candidate) {
      try {
        const candidate = await Candidate.findById(candidateId)
          .select('name jobId assignment.interviewerId')
          .populate({
            path: 'jobId',
            select: 'title',
          })
          .populate({
            path: 'assignment.interviewerId',
            select: 'name',
          })
          .lean();

        if (candidate) {
          candidateName = candidate.name || '';
          if (
            candidate.jobId &&
            typeof candidate.jobId === 'object' &&
            'title' in candidate.jobId
          ) {
            jobTitle = candidate.jobId.title || 'Position';
          }
          if (
            candidate.assignment?.interviewerId &&
            typeof candidate.assignment.interviewerId === 'object' &&
            'name' in candidate.assignment.interviewerId
          ) {
            interviewerName = candidate.assignment.interviewerId.name || '';
          }
        }
      } catch (error) {
        logger.error(
          { error, candidateId },
          'Failed to fetch candidate data for meeting update',
        );
        // Continue without candidate data - will use defaults
      }
    }

    if (!Settings) {
      return NextResponse.json(
        { error: 'Settings model not available' },
        { status: 500 },
      );
    }

    const settings = await Settings.findOne({ organizationId })
      .select(
        'microsoftTeams googleCalendar timeZone.name timeZone.offset fileStorage',
      )
      .lean()
      .exec();

    if (
      !settings?.microsoftTeams?.tenantId ||
      !settings.microsoftTeams.clientId ||
      !settings.microsoftTeams.clientSecret
    ) {
      return NextResponse.json(
        { error: 'Microsoft Teams is not configured' },
        { status: 400 },
      );
    }

    // Determine which token to use based on available credentials
    let accessToken: string;
    let useDelegatedPermissions = false;

    if (
      settings.microsoftTeams.refreshToken &&
      settings.microsoftTeams.isConnected
    ) {
      // Use delegated permissions - works with /me/onlineMeetings
      try {
        const calendarToken = await getMicrosoftCalendarAccessToken({
          organizationId,
          teamsConfig: settings.microsoftTeams,
        });
        accessToken = calendarToken.accessToken;
        useDelegatedPermissions = true;
      } catch (error) {
        logger.error(
          { error },
          'Failed to get delegated token, falling back to application token',
        );
        // Fallback to application permissions
        const appToken = await getTeamsAccessToken({
          organizationId,
          teamsConfig: settings.microsoftTeams,
        });
        accessToken = appToken.accessToken;
      }
    } else {
      // Use application permissions
      const appToken = await getTeamsAccessToken({
        organizationId,
        teamsConfig: settings.microsoftTeams,
      });
      accessToken = appToken.accessToken;
    }

    // Timezone mapping
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

    // Get meeting duration (default to 30 minutes if not provided)
    const meetingDuration = duration || 30;

    // Format date and time in the specific format: Tuesday Feb 10, 2026 ⋅ 4:46pm – 5:26pm (India Standard Time - Kolkata)
    let formattedDateTime: string | undefined;
    if (scheduledTime && duration) {
      const startDateTime = new Date(scheduledTime);
      const endDateTime = new Date(
        startDateTime.getTime() + meetingDuration * 60000,
      );

      const formatMeetingDateTime = (
        startDate: Date,
        endDate: Date,
        timezone: string,
      ): string => {
        // Get timezone display name
        const timezoneDisplayNames: { [key: string]: string } = {
          'Asia/Kolkata': 'India Standard Time - Kolkata',
          'America/New_York': 'Eastern Standard Time - New York',
          'America/Los_Angeles': 'Pacific Standard Time - Los Angeles',
          'Europe/London': 'Greenwich Mean Time - London',
          UTC: 'Coordinated Universal Time',
        };
        const timezoneDisplayName = timezoneDisplayNames[timezone] || timezone;

        // Format date parts
        const dayFormatter = new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          timeZone: timezone,
        });
        const dateFormatter = new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: timezone,
        });
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: timezone,
        });

        const dayName = dayFormatter.format(startDate);
        const datePart = dateFormatter.format(startDate);
        const startTime = timeFormatter.format(startDate).toLowerCase();
        const endTime = timeFormatter.format(endDate).toLowerCase();

        return `${dayName} ${datePart} ⋅ ${startTime} – ${endTime} (${timezoneDisplayName})`;
      };

      formattedDateTime = formatMeetingDateTime(
        startDateTime,
        endDateTime,
        organizationTimezone,
      );
    }

    // Update Microsoft Teams meeting if time/duration changed
    if (scheduledTime || duration) {
      const startDateTime = scheduledTime ? new Date(scheduledTime) : undefined;
      const endDateTime =
        startDateTime && duration
          ? new Date(startDateTime.getTime() + duration * 60000)
          : undefined;

      const updatePayload: {
        subject?: string;
        startDateTime?: string;
        endDateTime?: string;
        participants?: {
          attendees: Array<{ upn: string; role: string }>;
        };
      } = {};

      // Update subject line with candidate name and duration
      if (candidateName) {
        updatePayload.subject = `Updated Invitation: Interview with ${candidateName} - ${jobTitle}`;
      }

      if (startDateTime && endDateTime) {
        updatePayload.startDateTime = startDateTime.toISOString();
        updatePayload.endDateTime = endDateTime.toISOString();
      }

      if (guests) {
        updatePayload.participants = {
          attendees: guests.map((email) => ({
            upn: email,
            role: 'attendee',
          })),
        };
      }

      // Determine the correct API endpoint based on permission type
      let teamsApiUrl: string | null = null;
      if (useDelegatedPermissions) {
        // Delegated permissions: use /me/onlineMeetings
        teamsApiUrl = `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`;
      } else {
        // Application permissions: require userPrincipalName (email)
        const userPrincipalName =
          settings.microsoftTeams.connectedEmail || null;

        if (!userPrincipalName) {
          logger.error(
            {
              meetingId,
              useDelegatedPermissions,
              hasConnectedEmail: !!settings.microsoftTeams.connectedEmail,
            },
            'User email is required for updating Teams meetings with application permissions',
          );
          // Continue without updating Teams meeting
        } else {
          teamsApiUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userPrincipalName)}/onlineMeetings/${meetingId}`;
        }
      }

      if (teamsApiUrl) {
        const updateResponse = await fetch(teamsApiUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          let errorMessage = 'Failed to update Microsoft Teams meeting';

          // Parse error details for better error messages
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error) {
              errorMessage =
                errorData.error.message || errorData.error.code || errorMessage;

              // Provide helpful error messages for common issues
              if (updateResponse.status === 403) {
                errorMessage =
                  'Permission denied. Please ensure OnlineMeetings.ReadWrite permission is granted and admin consent is provided.';
              } else if (updateResponse.status === 404) {
                errorMessage = `Teams meeting not found. Meeting ID: ${meetingId}. The meeting may have been deleted or the ID is incorrect.`;
              } else if (updateResponse.status === 401) {
                errorMessage =
                  'Authentication failed. Please reconnect Microsoft Calendar.';
              }
            }
          } catch (parseError) {
            // If error text is not JSON, use the raw text
            logger.error({ parseError }, 'Failed to parse error response');
          }

          logger.error(
            {
              status: updateResponse.status,
              errorText,
              errorMessage,
              meetingId,
              teamsApiUrl,
              useDelegatedPermissions,
              updatePayload,
            },
            'Failed to update Microsoft Teams meeting',
          );

          // Don't throw - continue with calendar updates even if Teams update fails
        } else {
          logger.info(
            { meetingId, teamsApiUrl, useDelegatedPermissions },
            'Successfully updated Microsoft Teams meeting',
          );
        }
      }
    }

    // Upload meeting attachments and add to description (for calendar/email)
    const validAttachments =
      meetingAttachments?.filter(
        (att: MeetingAttachment) => att && att.name && att.url,
      ) || [];

    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

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

    // Initialize variables for calendar event data
    // Set default summary with candidate name and duration if available
    let summary = candidateName
      ? `Interview with ${candidateName} - ${jobTitle}`
      : '';

    // Set default description with duration next to interviewer and candidate names
    let description = '';
    if (candidateName) {
      let descriptionContent = `Interview scheduled for ${candidateName} for the position of ${jobTitle}.\n\n`;
      if (interviewerName) {
        descriptionContent += `Interviewer: ${interviewerName} - ${meetingDuration} min\n`;
      }
      descriptionContent += `Candidate: ${candidateName} - ${meetingDuration} min`;

      if (formattedDateTime) {
        descriptionContent += `\n\nDate & Time: ${formattedDateTime}`;
      }

      if (meetingNotes) {
        descriptionContent += `\n\nMeeting Notes:\n${meetingNotes}`;
      }

      if (uploadedAttachments.length > 0) {
        descriptionContent += '\n\nAttachments:';
        uploadedAttachments.forEach((attachment) => {
          const fullUrl = attachment.url.startsWith('/api/files')
            ? `${baseUrl}${attachment.url}`
            : attachment.url;
          descriptionContent += `\n- ${attachment.name}: ${fullUrl}`;
        });
      }

      if (guests && guests.length > 0) {
        descriptionContent += '\n\nGuests/Attendees:';
        guests.forEach((email: string) => {
          descriptionContent += `\n- ${email}`;
        });
      }

      description = descriptionContent;
    }

    let htmlLink = '';

    // Fetch updated Teams meeting info before updating calendar events
    let meetingLink = '';
    try {
      // Determine the correct API endpoint based on permission type (same logic as update)
      let teamsApiUrl: string | null = null;
      if (useDelegatedPermissions) {
        // Delegated permissions: use /me/onlineMeetings
        teamsApiUrl = `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`;
      } else {
        // Application permissions: require userPrincipalName (email)
        const userPrincipalName =
          settings.microsoftTeams.connectedEmail || null;

        if (userPrincipalName) {
          teamsApiUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userPrincipalName)}/onlineMeetings/${meetingId}`;
        }
      }

      if (teamsApiUrl) {
        const meetingResponse = await fetch(teamsApiUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (meetingResponse.ok) {
          const meetingData = (await meetingResponse.json()) as {
            joinWebUrl?: string;
            joinUrl?: string;
          };
          meetingLink = meetingData.joinWebUrl || meetingData.joinUrl || '';
        } else {
          const errorText = await meetingResponse.text();
          logger.warn(
            {
              status: meetingResponse.status,
              errorText,
              meetingId,
              teamsApiUrl,
              useDelegatedPermissions,
            },
            'Failed to fetch Teams meeting info',
          );
        }
      }
    } catch (fetchError) {
      logger.error(
        { error: fetchError, meetingId, useDelegatedPermissions },
        'Failed to fetch Teams meeting info',
      );
    }

    // Update Outlook Calendar event if applicable
    if (
      eventId &&
      settings?.microsoftTeams?.isConnected &&
      settings?.microsoftTeams?.refreshToken
    ) {
      try {
        const calendarAccessToken = await getMicrosoftCalendarAccessToken({
          organizationId,
          teamsConfig: settings.microsoftTeams,
        });

        const updatePayload: {
          subject?: string;
          body?: { contentType: string; content: string };
          start?: { dateTime: string; timeZone: string };
          end?: { dateTime: string; timeZone: string };
          attendees?: Array<{
            emailAddress: { address: string; name: string };
            type: string;
          }>;
        } = {};

        // Update subject line with candidate name and duration
        if (candidateName) {
          updatePayload.subject = `Updated Invitation : Interview with ${candidateName} - ${jobTitle}`;
        }

        // Update description with duration next to interviewer and candidate names
        if (candidateName && (interviewerName || scheduledTime || duration)) {
          let descriptionContent = `Interview with ${candidateName} for the position of ${jobTitle}.\n\n`;

          if (interviewerName) {
            descriptionContent += `Interviewer: ${interviewerName} \n`;
          }
          descriptionContent += ` Candidate: ${candidateName} \n`;

          if (formattedDateTime) {
            descriptionContent += `\n\nWhen:
             ${formattedDateTime}`;
          }

          if (meetingNotes) {
            descriptionContent += `\n\nMeeting Notes:
             ${meetingNotes}`;
          }
          if (guests && guests.length > 0) {
            descriptionContent += '\n\nGuests :';
            guests.forEach((email: string) => {
              descriptionContent += `\n- ${email}`;
            });
          }

          if (uploadedAttachments.length > 0) {
            descriptionContent += '\n\nAttachments:';
            uploadedAttachments.forEach((attachment) => {
              const fullUrl = attachment.url.startsWith('/api/files')
                ? `${baseUrl}${attachment.url}`
                : attachment.url;
              descriptionContent += `\n- ${attachment.name}: ${fullUrl}`;
            });
          }
          descriptionContent +=
            '\n\nThis meeting was updated through HireTrack.';
          if (meetingLink) {
            descriptionContent += `\n\nMicrosoft Teams Meeting Link:\n${meetingLink}`;
          }
          description = descriptionContent;

          updatePayload.body = {
            contentType: 'HTML',
            content: descriptionContent.replace(/\n/g, '<br>'),
          };
        }

        if (scheduledTime && duration) {
          const startDateTime = new Date(scheduledTime);
          const endDateTime = new Date(
            startDateTime.getTime() + duration * 60000,
          );
          updatePayload.start = {
            dateTime: startDateTime.toISOString(),
            timeZone: organizationTimezone,
          };
          updatePayload.end = {
            dateTime: endDateTime.toISOString(),
            timeZone: organizationTimezone,
          };
        }

        if (guests) {
          updatePayload.attendees = guests.map((email) => ({
            emailAddress: {
              address: email,
              name: email,
            },
            type: 'required',
          }));
        }

        const updateResponse = await fetch(
          `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${calendarAccessToken.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatePayload),
          },
        );

        if (updateResponse.ok) {
          const eventData = await updateResponse.json();
          summary = eventData.subject || summary;
          description = eventData.body?.content || description;
          htmlLink = eventData.webLink || htmlLink;
        }
      } catch (calendarError) {
        logger.error(
          { error: calendarError },
          'Error updating Outlook Calendar event',
        );
      }
    }

    // Helper function to detect if eventId is an Outlook Calendar eventId
    // Outlook eventIds typically start with "AAMk" or similar patterns
    const isOutlookEventId = (id: string): boolean =>
      id.startsWith('AAMk') || id.includes('@') || id.includes('%3D');

    // Update Google Calendar event if applicable (only if eventId is NOT an Outlook eventId)
    if (
      eventId &&
      !isOutlookEventId(eventId) &&
      settings?.googleCalendar?.isConnected
    ) {
      const clientSecret = decryptText(
        settings.googleCalendar.clientSecret,
        organizationId,
      );
      const accessTokenGoogle = decryptText(
        settings.googleCalendar.accessToken,
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
        access_token: accessTokenGoogle,
        refresh_token: refreshToken,
        expiry_date: settings.googleCalendar.expiryDate,
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const updateData: {
        summary?: string;
        description?: string;
        start?: { dateTime: string; timeZone: string };
        end?: { dateTime: string; timeZone: string };
        attendees?: Array<{ email: string }>;
      } = {};

      // Update summary (subject) with candidate name and duration
      if (candidateName) {
        updateData.summary = `Updated: Interview with ${candidateName} - ${jobTitle}`;
      }

      // Update description with duration next to interviewer and candidate names
      if (candidateName && (interviewerName || scheduledTime || duration)) {
        let descriptionContent = `Interview with ${candidateName} for the position of ${jobTitle}.\n\n`;

        if (interviewerName) {
          descriptionContent += `Interviewer: ${interviewerName}\n`;
        }
        descriptionContent += ` Candidate: ${candidateName} \n`;

        updateData.description = descriptionContent;
      }

      if (scheduledTime && duration) {
        const startDateTime = new Date(scheduledTime);
        const endDateTime = new Date(
          startDateTime.getTime() + duration * 60000,
        );
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

      try {
        const response = await calendar.events.patch({
          calendarId: 'primary',
          eventId,
          requestBody: updateData,
          sendUpdates: 'all',
        });

        summary = response.data.summary || '';
        description = response.data.description || '';
        htmlLink = response.data.htmlLink || '';
      } catch (calendarError) {
        // If event not found (404), it might be an Outlook eventId or the event was deleted
        if (
          calendarError &&
          typeof calendarError === 'object' &&
          'code' in calendarError &&
          calendarError.code === 404
        ) {
          logger.info(
            { eventId },
            'Google Calendar event not found, may be an Outlook eventId or deleted',
          );
        } else {
          logger.error(
            { error: calendarError, eventId },
            'Error updating Google Calendar event',
          );
        }
        // Continue without failing - Teams meeting update is more important
      }
    }

    if (candidateId && Candidate) {
      const updateFields: Record<string, unknown> = {
        'assignment.microsoftTeams.meetingLink': meetingLink,
        'assignment.microsoftTeams.lastSyncedAt': new Date(),
      };

      if (summary) updateFields['assignment.microsoftTeams.summary'] = summary;
      if (description)
        updateFields['assignment.microsoftTeams.description'] = description;
      if (htmlLink)
        updateFields['assignment.microsoftTeams.htmlLink'] = htmlLink;

      await Candidate.findByIdAndUpdate(candidateId, {
        $set: updateFields,
      });
    }

    return NextResponse.json({
      success: true,
      meetingId,
      meetingLink,
      eventId: eventId || '',
      htmlLink,
      summary,
      description,
      message: 'Microsoft Teams meeting updated successfully',
    });
  } catch (error) {
    logger.error(
      { error, url: req.url },
      'Error in update Teams meeting endpoint',
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to update meeting',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
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
    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');
    const candidateId = searchParams.get('candidateId');
    const eventId = searchParams.get('eventId');
    const cancelNotes = searchParams.get('cancelNotes') || '';

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 },
      );
    }
    if (!Settings) {
      return NextResponse.json(
        { error: 'Settings model not available' },
        { status: 500 },
      );
    }

    const settings = await Settings.findOne({ organizationId })
      .select('microsoftTeams googleCalendar timeZone.name')
      .lean()
      .exec();

    if (
      !settings?.microsoftTeams?.tenantId ||
      !settings.microsoftTeams.clientId ||
      !settings.microsoftTeams.clientSecret
    ) {
      return NextResponse.json(
        { error: 'Microsoft Teams is not configured' },
        { status: 400 },
      );
    }

    // Determine which token to use based on available credentials
    let accessToken: string;
    let useDelegatedPermissions = false;

    if (
      settings.microsoftTeams.refreshToken &&
      settings.microsoftTeams.isConnected
    ) {
      // Use delegated permissions - works with /me/onlineMeetings
      try {
        const calendarToken = await getMicrosoftCalendarAccessToken({
          organizationId,
          teamsConfig: settings.microsoftTeams,
        });
        accessToken = calendarToken.accessToken;
        useDelegatedPermissions = true;
      } catch (error) {
        logger.error(
          { error },
          'Failed to get delegated token, falling back to application token',
        );
        // Fallback to application permissions
        const appToken = await getTeamsAccessToken({
          organizationId,
          teamsConfig: settings.microsoftTeams,
        });
        accessToken = appToken.accessToken;
      }
    } else {
      // Use application permissions
      const appToken = await getTeamsAccessToken({
        organizationId,
        teamsConfig: settings.microsoftTeams,
      });
      accessToken = appToken.accessToken;
    }

    // Helper function to detect if eventId is an Outlook Calendar eventId
    // Outlook eventIds typically start with "AAMk" or similar patterns
    const isOutlookEventId = (id: string): boolean =>
      id.startsWith('AAMk') || id.includes('@') || id.includes('%3D');

    // Fetch candidate data to get candidate name for subject line
    let candidateName = '';
    if (candidateId && Candidate) {
      try {
        const candidate = await Candidate.findById(candidateId)
          .select('name')
          .lean();
        if (candidate) {
          candidateName = candidate.name || '';
        }
      } catch (error) {
        logger.error(
          { error, candidateId },
          'Failed to fetch candidate data for cancellation',
        );
      }
    }

    // Build subject line with Cancel Invitation and cancelNotes
    const cancelSubject = candidateName
      ? `Cancel Invitation: Interview with ${candidateName}${cancelNotes.trim() ? ` - ${cancelNotes}` : ''}`
      : `Cancel Invitation${cancelNotes.trim() ? ` - ${cancelNotes}` : ''}`;

    // Cancel Outlook Calendar event if present (check eventId format first)
    // Outlook Calendar events are created when Microsoft Calendar is connected
    if (
      eventId &&
      isOutlookEventId(eventId) &&
      settings?.microsoftTeams?.isConnected &&
      settings?.microsoftTeams?.refreshToken
    ) {
      try {
        const calendarAccessToken = await getMicrosoftCalendarAccessToken({
          organizationId,
          teamsConfig: settings.microsoftTeams,
        });

        // Try to cancel the event by updating its status or deleting it
        const cancelResponse = await fetch(
          `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
          {
            method: cancelNotes.trim() ? 'PATCH' : 'DELETE',
            headers: {
              Authorization: `Bearer ${calendarAccessToken.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: cancelNotes.trim()
              ? JSON.stringify({
                  subject: cancelSubject,
                  isCancelled: true,
                  body: {
                    contentType: 'HTML',
                    content: `<p>--- MEETING CANCELLED ---</p><p>Reason: ${cancelNotes}</p><p>Cancelled on: ${new Date().toISOString()}</p>`,
                  },
                })
              : undefined,
          },
        );

        if (!cancelResponse.ok && cancelResponse.status !== 404) {
          const errorText = await cancelResponse.text();
          logger.error(
            {
              status: cancelResponse.status,
              errorText,
              eventId,
            },
            'Failed to cancel Outlook Calendar event',
          );
        }
      } catch (calendarError) {
        logger.error(
          { error: calendarError },
          'Error cancelling Outlook Calendar event',
        );
      }
    }

    // Cancel Google Calendar event if present (only if eventId is NOT an Outlook eventId)
    if (
      eventId &&
      !isOutlookEventId(eventId) &&
      settings?.googleCalendar?.isConnected
    ) {
      try {
        const clientSecret = decryptText(
          settings.googleCalendar.clientSecret,
          organizationId,
        );
        const accessTokenGoogle = decryptText(
          settings.googleCalendar.accessToken,
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
          access_token: accessTokenGoogle,
          refresh_token: refreshToken,
          expiry_date: settings.googleCalendar.expiryDate,
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const cancelEventPromise = cancelNotes.trim()
          ? (async () => {
              try {
                const existingEvent = await calendar.events.get({
                  calendarId: 'primary',
                  eventId,
                });

                const updatedDescription = `${existingEvent.data.description || ''}\n\n--- MEETING CANCELLED ---\nReason: ${cancelNotes}\nCancelled on: ${new Date().toISOString()}`;

                await calendar.events.patch({
                  calendarId: 'primary',
                  eventId,
                  requestBody: {
                    summary: cancelSubject,
                    description: updatedDescription,
                    status: 'cancelled',
                  },
                  sendUpdates: 'all',
                });
              } catch (error) {
                // If event not found (404), it might have been deleted already
                if (
                  error &&
                  typeof error === 'object' &&
                  'code' in error &&
                  error.code === 404
                ) {
                  logger.info(
                    { eventId },
                    'Google Calendar event not found, may have been deleted already',
                  );
                } else {
                  logger.error(
                    { error, url: req.url },
                    'Failed to cancel Google Calendar event',
                  );
                }
              }
            })()
          : (async () => {
              try {
                await calendar.events.patch({
                  calendarId: 'primary',
                  eventId,
                  requestBody: {
                    summary: cancelSubject,
                    status: 'cancelled',
                  },
                  sendUpdates: 'all',
                });
              } catch (error) {
                // If event not found (404), it might have been deleted already
                if (
                  error &&
                  typeof error === 'object' &&
                  'code' in error &&
                  error.code === 404
                ) {
                  logger.info(
                    { eventId },
                    'Google Calendar event not found, may have been deleted already',
                  );
                } else {
                  logger.error(
                    { error, url: req.url },
                    'Failed to cancel Google Calendar event',
                  );
                }
              }
            })();

        await cancelEventPromise;
      } catch (error) {
        logger.error(
          { error },
          'Error setting up Google Calendar cancellation',
        );
      }
    }

    // Cancel Microsoft Teams meeting
    // Note: Microsoft Graph API may not support DELETE for onlineMeetings
    // The meeting is typically cancelled when the associated calendar event is cancelled
    // However, we'll attempt to delete it if possible
    let teamsApiUrl: string;
    if (useDelegatedPermissions) {
      // Delegated permissions: use /me/onlineMeetings
      teamsApiUrl = `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`;
    } else {
      // Application permissions: require userPrincipalName (email)
      const userPrincipalName = settings.microsoftTeams.connectedEmail || null;

      if (!userPrincipalName) {
        logger.error(
          'User email is required for canceling Teams meetings with application permissions',
        );
        // Continue without canceling Teams meeting
        teamsApiUrl = '';
      } else {
        teamsApiUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userPrincipalName)}/onlineMeetings/${meetingId}`;
      }
    }

    if (teamsApiUrl) {
      try {
        const deleteResponse = await fetch(teamsApiUrl, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        // 404 is acceptable - meeting might have been deleted already via calendar event cancellation
        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          const errorText = await deleteResponse.text();
          logger.error(
            {
              status: deleteResponse.status,
              errorText,
              meetingId,
            },
            'Failed to cancel Microsoft Teams meeting',
          );
        } else if (deleteResponse.status === 404) {
          logger.info(
            { meetingId },
            'Teams meeting not found, may have been deleted already',
          );
        }
      } catch (teamsError) {
        // Log but don't fail - the calendar event cancellation is more important
        logger.error(
          { error: teamsError, meetingId },
          'Error attempting to cancel Teams meeting',
        );
      }
    }

    const clearCandidatePromise =
      candidateId && Candidate
        ? Candidate.findByIdAndUpdate(candidateId, {
            $unset: { 'assignment.microsoftTeams': '' },
          })
            .lean()
            .exec()
            .catch((error) => {
              logger.error(
                { error, url: req.url },
                'Failed to clear candidate record',
              );
            })
        : Promise.resolve(null);

    await Promise.all([clearCandidatePromise]);

    if (candidateId) {
      const candidate = await Candidate?.findById(candidateId)
        .select('_id name jobId assignment.interviewerId')
        .populate({
          path: 'jobId',
          select: '_id title',
        })
        .populate({
          path: 'assignment.interviewerId',
          select: '_id name',
        })
        .lean();

      if (candidate) {
        let jobId = '';
        if (candidate.jobId) {
          if (typeof candidate.jobId !== 'string' && '_id' in candidate.jobId) {
            jobId = candidate.jobId._id.toString();
          } else {
            jobId = candidate.jobId.toString();
          }
        }

        let jobTitle = 'Unknown Job';
        if (
          candidate.jobId &&
          typeof candidate.jobId !== 'string' &&
          'title' in candidate.jobId
        ) {
          jobTitle = candidate.jobId.title;
        }

        if (History) {
          try {
            const historyEntry: ICandidateHistory = {
              dateTime: new Date().toISOString(),
              title: 'Microsoft Teams Meeting Cancelled',
              assignmentBy: userData?.id || null,
              previousInterviewer:
                (candidate?.assignment?.interviewerId as
                  | ICandidateHistory['previousInterviewer']
                  | null) || null,
              currentInterviewer:
                (candidate?.assignment?.interviewerId as
                  | ICandidateHistory['currentInterviewer']
                  | null) || null,
              note: {
                userId: userData?.id || null,
                description: cancelNotes
                  ? `Microsoft Teams Meeting Cancelled. Reason: ${cancelNotes}`
                  : 'Microsoft Teams Meeting Cancelled.',
                date: new Date().toISOString(),
                rating: 0,
              },
              attachments: [],
            };

            await History.findOneAndUpdate(
              {
                candidateId: candidate._id,
                jobId,
              },
              {
                $push: { history: historyEntry },
              },
              { upsert: true, new: true },
            );
          } catch (historyError) {
            logger.error(
              { error: historyError, url: req.url },
              'Failed to save cancellation history',
            );
          }
        }

        const interviewerId =
          candidate.assignment?.interviewerId &&
          typeof candidate.assignment.interviewerId !== 'string' &&
          candidate.assignment.interviewerId._id
            ? candidate.assignment.interviewerId._id.toString()
            : '';

        const interviewerName =
          candidate.assignment?.interviewerId &&
          typeof candidate.assignment.interviewerId !== 'string' &&
          candidate.assignment.interviewerId.name
            ? candidate.assignment.interviewerId.name
            : 'Interviewer';

        await NotificationService.notifyMeetingCancelled({
          organizationId,
          candidateId: candidate._id.toString(),
          candidateName: candidate.name,
          jobId,
          jobTitle,
          interviewerId,
          interviewerName,
          triggerUserId: userData?.id || '',
          triggerUserName: userData?.name || 'System',
        });

        try {
          const fullCandidate = (await Candidate?.findById(candidateId)
            .populate([
              {
                path: 'assignment.interviewerId',
                select: '_id name email',
              },
              {
                path: 'remarks.userId',
                select: '_id name email',
              },
              {
                path: 'followUp.userId',
                select: '_id name email',
              },
              {
                path: 'jobId',
                select: '_id title description',
              },
            ])
            .lean()) as ICandidate | null;

          if (fullCandidate) {
            await broadcastCandidateUpdate(fullCandidate);
          }
        } catch (broadcastError) {
          logger.error(
            { error: broadcastError },
            'Failed to broadcast candidate update',
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Microsoft Teams meeting cancelled successfully',
    });
  } catch (error) {
    logger.error(
      { error, url: req.url },
      'Error cancelling Microsoft Teams meeting',
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to cancel meeting',
      },
      { status: 500 },
    );
  }
}
