import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  Settings,
  Candidate,
  History,
  User,
} from '@/lib/mongodb';
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

/** Normalize email for comparison (lowercase, trimmed). */
function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

/**
 * Resolve the meeting initiator (organizer/sender). Invite update/cancel is sent as this Azure user,
 * not necessarily the calendar connectedEmail or the logged-in dashboard user.
 */
function resolveInitiator(params: {
  bodyInitiatorEmail?: string;
  bodyInitiatorName?: string;
  authenticatedEmail: string;
  interviewerEmail?: string;
  interviewerName?: string;
}): { initiatorEmail: string; initiatorName: string } {
  const email =
    normalizeEmail(params.bodyInitiatorEmail) ||
    normalizeEmail(params.authenticatedEmail) ||
    normalizeEmail(params.interviewerEmail) ||
    '';
  const name =
    (typeof params.bodyInitiatorName === 'string' &&
      params.bodyInitiatorName.trim()) ||
    (typeof params.interviewerName === 'string' &&
      params.interviewerName.trim()) ||
    email;
  return { initiatorEmail: email, initiatorName: name };
}

type GraphUserLookupResult = {
  id: string;
  userPrincipalName?: string;
  mail?: string;
};

async function tryResolveGraphUser(
  accessToken: string,
  initiatorEmail: string,
): Promise<{
  graphUserPath: string;
  resolvedBy: 'upn' | 'mailFilter';
} | null> {
  const encoded = encodeURIComponent(initiatorEmail);

  const directResponse = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encoded}?$select=id,userPrincipalName,mail`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (directResponse.ok) {
    const user = (await directResponse.json()) as GraphUserLookupResult;
    logger.info(
      { initiatorEmail, userId: user.id, resolvedBy: 'upn' },
      'Resolved initiator via direct UPN lookup',
    );
    return { graphUserPath: `users/${user.id}`, resolvedBy: 'upn' };
  }

  const directError = await directResponse.text();
  logger.warn(
    { initiatorEmail, status: directResponse.status, error: directError },
    'Direct UPN lookup failed, trying mail filter',
  );

  if (directResponse.status === 401 || directResponse.status === 403) {
    return null;
  }

  const filterResponse = await fetch(
    `https://graph.microsoft.com/v1.0/users?$filter=mail eq '${initiatorEmail.replace(/'/g, "''")}'&$select=id,userPrincipalName,mail&$top=1`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (filterResponse.ok) {
    const data = (await filterResponse.json()) as { value?: GraphUserLookupResult[] };
    const user = data.value?.[0];
    if (user?.id) {
      logger.info(
        { initiatorEmail, userId: user.id, resolvedBy: 'mailFilter' },
        'Resolved initiator via mail filter',
      );
      return { graphUserPath: `users/${user.id}`, resolvedBy: 'mailFilter' };
    }
    logger.warn(
      { initiatorEmail, resultCount: data.value?.length ?? 0 },
      'Mail filter returned OK but no matching user found',
    );
  } else {
    const filterError = await filterResponse.text();
    logger.warn(
      { initiatorEmail, status: filterResponse.status, error: filterError },
      'Mail filter lookup also failed',
    );
    if (filterResponse.status === 401 || filterResponse.status === 403) {
      return null;
    }
  }

  return null;
}

/**
 * Resolve the Graph user path for initiatorEmail, retrying once with a
 * force-refreshed app token when the cached token gets 401/403.
 */
async function resolveGraphUserPathForEmail(params: {
  accessToken: string;
  initiatorEmail: string;
  organizationId: string;
  teamsConfig: {
    tenantId?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    expiryDate?: number | null;
  };
}): Promise<{
  graphUserPath: string;
  resolvedBy: 'upn' | 'mailFilter';
  accessToken: string;
}> {
  const { initiatorEmail, organizationId, teamsConfig } = params;

  const first = await tryResolveGraphUser(params.accessToken, initiatorEmail);
  if (first) {
    return { ...first, accessToken: params.accessToken };
  }

  logger.info(
    { initiatorEmail },
    'User lookup failed; force-refreshing app token and retrying',
  );
  const freshToken = await getTeamsAccessToken({
    organizationId,
    teamsConfig,
    forceRefresh: true,
  });

  const second = await tryResolveGraphUser(freshToken.accessToken, initiatorEmail);
  if (second) {
    return { ...second, accessToken: freshToken.accessToken };
  }

  throw new Error(
    `User not found in Microsoft Graph for initiatorEmail=${initiatorEmail}. ` +
      'Verified with a fresh token. Check: (1) the email matches a UPN or primary mail in Entra ID → Users, ' +
      '(2) User.Read.All (Application) is granted with admin consent, ' +
      '(3) wait a few minutes after granting for propagation.',
  );
}

interface UpdateMeetRequest {
  candidateId?: string;
  meetingId: string;
  eventId?: string;
  scheduledTime?: string;
  duration?: number;
  guests?: string[];
  meetingNotes?: string;
  meetingAttachments?: MeetingAttachment[];
  initiatorEmail?: string;
  initiatorName?: string;
  interviewerEmail?: string;
  interviewerName?: string;
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
      initiatorEmail: bodyInitiatorEmail,
      initiatorName: bodyInitiatorName,
      interviewerEmail,
      interviewerName: bodyInterviewerName,
    } = body as UpdateMeetRequest;

    const { initiatorEmail } = resolveInitiator({
      bodyInitiatorEmail,
      bodyInitiatorName,
      authenticatedEmail: userData.email || '',
      interviewerEmail,
      interviewerName: bodyInterviewerName,
    });

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 },
      );
    }

    if (!initiatorEmail) {
      return NextResponse.json(
        {
          error:
            'Initiator email is required for Teams meeting updates. Provide initiatorEmail or ensure the authenticated user/interviewer has an email.',
        },
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

    // Determine which token to use based on initiator + connected account (same as schedule flow)
    const connectedEmail = normalizeEmail(
      settings.microsoftTeams.connectedEmail,
    );
    const hasDelegated =
      !!settings.microsoftTeams.refreshToken &&
      settings.microsoftTeams.isConnected;
    const initiatorIsConnected =
      hasDelegated && connectedEmail && connectedEmail === initiatorEmail;

    let accessToken: string;
    let useDelegatedPermissions = false;
    let graphUserPath: string | null = null;

    if (initiatorIsConnected) {
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
        const resolved = await resolveGraphUserPathForEmail({
          accessToken,
          initiatorEmail,
          organizationId,
          teamsConfig: settings.microsoftTeams,
        });
        graphUserPath = resolved.graphUserPath;
        accessToken = resolved.accessToken;
      }
    } else {
      const appToken = await getTeamsAccessToken({
        organizationId,
        teamsConfig: settings.microsoftTeams,
      });
      accessToken = appToken.accessToken;
      const resolved = await resolveGraphUserPathForEmail({
        accessToken,
        initiatorEmail,
        organizationId,
        teamsConfig: settings.microsoftTeams,
      });
      graphUserPath = resolved.graphUserPath;
      accessToken = resolved.accessToken;
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
        teamsApiUrl = `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`;
      } else if (graphUserPath) {
        teamsApiUrl = `https://graph.microsoft.com/v1.0/${graphUserPath}/onlineMeetings/${meetingId}`;
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
        teamsApiUrl = `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`;
      } else if (graphUserPath) {
        teamsApiUrl = `https://graph.microsoft.com/v1.0/${graphUserPath}/onlineMeetings/${meetingId}`;
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
    if (eventId && (useDelegatedPermissions || graphUserPath)) {
      try {
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

        let calendarToken = accessToken;
        let calendarApiUrl: string;
        if (useDelegatedPermissions) {
          const calendarAccessToken = await getMicrosoftCalendarAccessToken({
            organizationId,
            teamsConfig: settings.microsoftTeams,
          });
          calendarToken = calendarAccessToken.accessToken;
          calendarApiUrl = `https://graph.microsoft.com/v1.0/me/events/${eventId}`;
        } else {
          calendarApiUrl = `https://graph.microsoft.com/v1.0/${graphUserPath}/events/${eventId}`;
        }

        const updateResponse = await fetch(calendarApiUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${calendarToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        });

        if (updateResponse.ok) {
          const eventData = await updateResponse.json();
          summary = eventData.subject || summary;
          // Intentionally do not overwrite `description` with
          // `eventData.body?.content`: Microsoft Graph returns the rendered
          // Outlook event body as HTML (wrapped in <html>/<body> tags). We
          // keep the plain-text `description` we built locally so it stays
          // safe to use as a reminder note or UI preview.
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

    // Send meeting updated notification (non-blocking)
    try {
      if (candidateId && Candidate && User) {
        const candidate = await Candidate.findById(candidateId)
          .populate('assignment.interviewerId', '_id name')
          .populate('jobId', '_id title')
          .select('name assignment.interviewerId jobId')
          .lean()
          .exec();

        if (candidate) {
          let interviewerId = userData.id?.toString() || '';
          const assignmentInterviewer = candidate.assignment?.interviewerId as
            | { _id?: unknown; name?: string }
            | undefined;
          if (assignmentInterviewer?._id) {
            interviewerId = String(assignmentInterviewer._id);
          } else if (initiatorEmail) {
            const userByEmail = await User.findOne({
              organizationId,
              email: initiatorEmail,
            })
              .select('_id')
              .lean()
              .exec();
            if (userByEmail?._id) {
              interviewerId = String(userByEmail._id);
            }
          }

          const interviewerNameResolved =
            assignmentInterviewer?.name || 'Interviewer';
          const jobId =
            candidate.jobId &&
            typeof candidate.jobId !== 'string' &&
            '_id' in candidate.jobId
              ? candidate.jobId._id.toString()
              : candidate.jobId?.toString() || '';
          const jobTitleResolved =
            candidate.jobId &&
            typeof candidate.jobId !== 'string' &&
            'title' in candidate.jobId
              ? candidate.jobId.title
              : 'Unknown Job';

          let meetingDate: Date;
          if (scheduledTime) {
            meetingDate = new Date(scheduledTime);
          } else {
            meetingDate = new Date();
          }

          await NotificationService.notifyMeetingUpdated({
            organizationId,
            candidateId,
            candidateName: candidate.name,
            jobId,
            jobTitle: jobTitleResolved,
            interviewerId,
            interviewerName: interviewerNameResolved,
            meetingDate,
            triggerUserId: userData.id?.toString() || '',
            triggerUserName: userData.name || '',
          });
        }
      }
    } catch (notifyError) {
      logger.error(
        { error: notifyError, url: req.url },
        'Failed to send meeting updated notification:',
        notifyError,
      );
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
    const bodyInitiatorEmail = searchParams.get('initiatorEmail') || '';
    const bodyInitiatorName = searchParams.get('initiatorName') || '';
    const interviewerEmail = searchParams.get('interviewerEmail') || '';
    const interviewerName = searchParams.get('interviewerName') || '';

    const { initiatorEmail } = resolveInitiator({
      bodyInitiatorEmail,
      bodyInitiatorName,
      authenticatedEmail: userData.email || '',
      interviewerEmail,
      interviewerName,
    });

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 },
      );
    }
    if (!initiatorEmail) {
      return NextResponse.json(
        {
          error:
            'Initiator email is required for Teams meeting cancellation. Provide initiatorEmail or ensure the authenticated user/interviewer has an email.',
        },
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

    // Determine which token to use based on initiator + connected account (same as schedule flow)
    const connectedEmail = normalizeEmail(
      settings.microsoftTeams.connectedEmail,
    );
    const hasDelegated =
      !!settings.microsoftTeams.refreshToken &&
      settings.microsoftTeams.isConnected;
    const initiatorIsConnected =
      hasDelegated && connectedEmail && connectedEmail === initiatorEmail;

    let accessToken: string;
    let useDelegatedPermissions = false;
    let graphUserPath: string | null = null;

    if (initiatorIsConnected) {
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
        const resolved = await resolveGraphUserPathForEmail({
          accessToken,
          initiatorEmail,
          organizationId,
          teamsConfig: settings.microsoftTeams,
        });
        graphUserPath = resolved.graphUserPath;
        accessToken = resolved.accessToken;
      }
    } else {
      const appToken = await getTeamsAccessToken({
        organizationId,
        teamsConfig: settings.microsoftTeams,
      });
      accessToken = appToken.accessToken;
      const resolved = await resolveGraphUserPathForEmail({
        accessToken,
        initiatorEmail,
        organizationId,
        teamsConfig: settings.microsoftTeams,
      });
      graphUserPath = resolved.graphUserPath;
      accessToken = resolved.accessToken;
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
      (useDelegatedPermissions || graphUserPath)
    ) {
      try {
        let calendarToken = accessToken;
        let calendarApiUrl: string;
        if (useDelegatedPermissions) {
          const calendarAccessToken = await getMicrosoftCalendarAccessToken({
            organizationId,
            teamsConfig: settings.microsoftTeams,
          });
          calendarToken = calendarAccessToken.accessToken;
          calendarApiUrl = `https://graph.microsoft.com/v1.0/me/events/${eventId}`;
        } else {
          calendarApiUrl = `https://graph.microsoft.com/v1.0/${graphUserPath}/events/${eventId}`;
        }

        // Try to cancel the event by updating its status or deleting it
        const cancelResponse = await fetch(calendarApiUrl, {
          method: cancelNotes.trim() ? 'PATCH' : 'DELETE',
          headers: {
            Authorization: `Bearer ${calendarToken}`,
            'Content-Type': 'application/json',
          },
          body: cancelNotes.trim()
            ? JSON.stringify({
                subject: cancelSubject,
                body: {
                  contentType: 'HTML',
                  content: `<p>--- MEETING CANCELLED ---</p><p>Reason: ${cancelNotes}</p><p>Cancelled on: ${new Date().toISOString()}</p>`,
                },
              })
            : undefined,
        });

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
      teamsApiUrl = `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}`;
    } else if (graphUserPath) {
      teamsApiUrl = `https://graph.microsoft.com/v1.0/${graphUserPath}/onlineMeetings/${meetingId}`;
    } else {
      teamsApiUrl = '';
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

        const finalInterviewerName =
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
          interviewerName: finalInterviewerName,
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
