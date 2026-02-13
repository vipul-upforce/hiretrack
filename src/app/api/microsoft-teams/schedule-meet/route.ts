import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Settings, Candidate } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { NotificationService } from '@/lib/notifications/notificationService';
import { decryptText } from '@/lib/encryption';
import { uploadFile, uploadFileToS3, saveFileLocally } from '@/lib/fileUtils';
import { logger } from '@/lib/logger/logger.server';
import { MeetingAttachment } from '@/lib/features/calendar/calendarApi';
import {
  getTeamsAccessToken,
  getMicrosoftCalendarAccessToken,
} from '@/lib/microsoft-teams/teamsAuth';
import { createOAuth2Client } from '@/lib/google-calendar/config';
import { google } from 'googleapis';
import { sendUnifiedMail } from '@/lib/notifications/email/unifiedEmailService';
import { getMappedEmailTemplate } from '@/lib/notifications/email/getMappedEmailTemplate';
import { generateCalendarLinks } from '@/app/api/event-mail/calendarUtils';

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
    } = body;

    const settings = await Settings.findOne({ organizationId })
      .select('microsoftTeams googleCalendar timeZone fileStorage')
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
    // Prefer delegated permissions if available (simpler, works with /me endpoint)
    // Fall back to application permissions if no refresh token
    let accessToken: string;
    let useDelegatedPermissions = false;

    if (
      settings.microsoftTeams.refreshToken &&
      settings.microsoftTeams.isConnected
    ) {
      // Try delegated permissions first - works with /me/onlineMeetings
      // This requires OnlineMeetings.ReadWrite delegated permission
      try {
        const calendarToken = await getMicrosoftCalendarAccessToken({
          organizationId,
          teamsConfig: settings.microsoftTeams,
        });
        accessToken = calendarToken.accessToken;
        useDelegatedPermissions = true;
        logger.info('Using delegated permissions for Teams meeting');
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
        useDelegatedPermissions = false;
      }
    } else {
      // Use application permissions - requires user email
      logger.info('Using application permissions for Teams meeting');
      const appToken = await getTeamsAccessToken({
        organizationId,
        teamsConfig: settings.microsoftTeams,
      });
      accessToken = appToken.accessToken;
      useDelegatedPermissions = false;
    }

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

    const startDateTime = new Date(scheduledTime);
    const meetingDuration = duration || 30;
    const endDateTime = new Date(
      startDateTime.getTime() + meetingDuration * 60000,
    );

    // Format date and time in the specific format: Tuesday Feb 10, 2026 ⋅ 4:46pm – 5:26pm (India Standard Time - Kolkata)
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

    const formattedDateTime = formatMeetingDateTime(
      startDateTime,
      endDateTime,
      organizationTimezone,
    );

    // Create Microsoft Teams online meeting
    const meetingSubject = `Invitation: Interview with ${candidateName} - ${jobTitle}`;

    // Build attendees list for Teams meeting
    const attendees = (guests || []).map((email: string) => ({
      upn: email,
      role: 'attendee' as const,
    }));

    // Create online meeting using Microsoft Graph API
    const teamsMeetingPayload = {
      subject: meetingSubject,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      participants: {
        attendees,
      },
    };

    // Determine the correct API endpoint based on permission type
    let teamsApiUrl: string;
    if (useDelegatedPermissions) {
      // Delegated permissions: use /me/onlineMeetings
      teamsApiUrl = 'https://graph.microsoft.com/v1.0/me/onlineMeetings';
    } else {
      // Application permissions: require userPrincipalName (email) or user ID
      const userPrincipalName =
        settings.microsoftTeams.connectedEmail || interviewerEmail || null;

      if (!userPrincipalName) {
        return NextResponse.json(
          {
            error:
              'User email is required for Teams meetings. Please connect Microsoft Calendar or provide interviewer email.',
          },
          { status: 400 },
        );
      }

      // Use userPrincipalName (email) for application permissions
      teamsApiUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userPrincipalName)}/onlineMeetings`;
    }

    const teamsResponse = await fetch(teamsApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(teamsMeetingPayload),
    });

    if (!teamsResponse.ok) {
      const errorText = await teamsResponse.text();
      let errorMessage = 'Failed to schedule Microsoft Teams meeting';

      // Parse error details for better error messages
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage =
            errorData.error.message || errorData.error.code || errorMessage;

          // Provide helpful error messages for common issues
          if (teamsResponse.status === 403) {
            errorMessage =
              'Permission denied. Please ensure OnlineMeetings.ReadWrite permission is granted and admin consent is provided.';
          } else if (teamsResponse.status === 404) {
            if (useDelegatedPermissions) {
              errorMessage =
                'User not found. Please reconnect Microsoft Calendar to refresh permissions.';
            } else {
              errorMessage = `User not found: ${settings.microsoftTeams.connectedEmail || interviewerEmail || 'unknown'}. Please verify the user email is correct.`;
            }
          } else if (teamsResponse.status === 401) {
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
          status: teamsResponse.status,
          errorText,
          teamsApiUrl,
          useDelegatedPermissions,
          hasRefreshToken: !!settings.microsoftTeams.refreshToken,
          connectedEmail: settings.microsoftTeams.connectedEmail,
        },
        'Error scheduling Microsoft Teams meeting',
      );

      return NextResponse.json(
        {
          error: errorMessage,
          details: errorText,
          status: teamsResponse.status,
        },
        { status: teamsResponse.status },
      );
    }

    const teamsData = (await teamsResponse.json()) as {
      id?: string;
      joinUrl?: string;
      joinWebUrl?: string;
      subject?: string;
      startDateTime?: string;
      endDateTime?: string;
    };

    const meetingId = teamsData.id || '';
    const meetingLink = teamsData.joinWebUrl || teamsData.joinUrl || '';

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

    // Build description with notes and attachments
    let description = `Interview scheduled for ${candidateName} for the position of ${jobTitle} at ${organizationName}.
      

Interviewer: ${interviewerName} 
Candidate: ${candidateName}`;

    if (formattedDateTime) {
      description += `\n\nWhen:
        ${formattedDateTime}`;
    }

    // Add guest information if guests are present
    if (guests && guests.length > 0) {
      description += '\n\nGuests :';
      guests.forEach((email: string) => {
        description += `\n- ${email}`;
      });
    }

    if (meetingNotes) {
      description += `\n\nMeeting Notes:\n${meetingNotes}`;
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
    let summary = meetingSubject;
    let calendarDescription = description;

    // Create Outlook Calendar event if Microsoft Calendar is connected via OAuth2
    if (
      settings?.microsoftTeams?.isConnected &&
      settings?.microsoftTeams?.refreshToken
    ) {
      try {
        const calendarAccessToken = await getMicrosoftCalendarAccessToken({
          organizationId,
          teamsConfig: settings.microsoftTeams,
        });

        // Create Outlook Calendar event using Microsoft Graph API
        // Include the Teams meeting link in the event
        const calendarEventBody = `${calendarDescription.replace(/\n/g, '<br>')}${meetingLink ? `<br><br><strong>Teams Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a>` : ''}`;

        const calendarEvent: {
          subject: string;
          body: { contentType: string; content: string };
          start: { dateTime: string; timeZone: string };
          end: { dateTime: string; timeZone: string };
          attendees: Array<{
            emailAddress: { address: string; name: string };
            type: string;
          }>;
          isOnlineMeeting: boolean;
          onlineMeetingProvider: string;
          onlineMeeting?: { joinUrl: string };
        } = {
          subject: summary,
          body: {
            contentType: 'HTML',
            content: calendarEventBody,
          },
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: organizationTimezone,
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: organizationTimezone,
          },
          attendees: (guests || []).map((email: string) => ({
            emailAddress: {
              address: email,
              name: email,
            },
            type: 'required',
          })),
          isOnlineMeeting: true,
          onlineMeetingProvider: 'teamsForBusiness',
        };

        if (meetingLink) {
          calendarEvent.onlineMeeting = {
            joinUrl: meetingLink,
          };
        }

        const calendarResponse = await fetch(
          'https://graph.microsoft.com/v1.0/me/events',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${calendarAccessToken.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(calendarEvent),
          },
        );

        if (calendarResponse.ok) {
          const eventData = await calendarResponse.json();
          calendarEventId = eventData.id || '';
          calendarHtmlLink =
            eventData.webLink ||
            eventData.onlineMeeting?.joinUrl ||
            meetingLink;
          summary = eventData.subject || summary;
          calendarDescription = eventData.body?.content || calendarDescription;
        } else {
          const errorText = await calendarResponse.text();
          logger.error(
            { status: calendarResponse.status, errorText },
            'Failed to create Outlook Calendar event',
          );
        }
      } catch (calendarError) {
        logger.error(
          { error: calendarError },
          'Error creating Outlook Calendar event',
        );
        // Continue without calendar event - Teams meeting is still created
      }
    }

    // Optionally create Google Calendar event if Google Calendar is connected (but not if Outlook Calendar was created)
    if (settings?.googleCalendar?.isConnected && !calendarEventId) {
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
      // Send email notification if Google Calendar is not connected
      try {
        const calendarLinks = await generateCalendarLinks(
          req,
          meetingSubject,
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
            eventTitle: meetingSubject,
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
          'Failed to send Teams meeting email',
        );
      }
    }

    if (candidateId && Candidate) {
      const microsoftTeamsMeet = {
        meetingId,
        meetingLink,
        eventId: calendarEventId,
        htmlLink: calendarHtmlLink,
        summary,
        description: calendarDescription,
        meetingNotes,
        meetingAttachments: uploadedAttachments,
        lastSyncedAt: new Date(),
      };

      await Candidate.findByIdAndUpdate(candidateId, [
        {
          $set: {
            assignment: {
              $mergeObjects: [
                // If assignment is null or missing, use {}, otherwise use existing assignment
                { $ifNull: ['$assignment', {}] },
                // Merge in the new zoomMeet data
                { microsoftTeams: microsoftTeamsMeet },
              ],
            },
          },
        },
      ]);
    }

    // Send meeting scheduled notification (non-blocking)
    try {
      if (candidateId) {
        await NotificationService.notifyMeetingScheduled({
          organizationId,
          candidateId,
          candidateName,
          jobId: body.jobId || '',
          jobTitle: body.jobTitle || '',
          interviewerId: body.interviewerId || '',
          interviewerName: body.interviewerName || '',
          meetingDate: startDateTime,
          triggerUserId: userData.id?.toString() || '',
          triggerUserName: userData.name || '',
        });
      }
    } catch (notifyError) {
      logger.error(
        { error: notifyError, url: req.url },
        'Failed to send meeting scheduled notification:',
        notifyError,
      );
    }

    return NextResponse.json({
      success: true,
      meetingId,
      meetingLink,
      eventId: calendarEventId,
      htmlLink: calendarHtmlLink,
      summary,
      description: calendarDescription,
      message: 'Microsoft Teams meeting scheduled successfully',
    });
  } catch (error) {
    logger.error(
      { error, url: req.url },
      'Error scheduling Microsoft Teams meeting',
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to schedule meeting',
      },
      { status: 500 },
    );
  }
}
