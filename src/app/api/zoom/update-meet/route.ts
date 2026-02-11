import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Settings, Candidate, History } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { createOAuth2Client } from '@/lib/google-calendar/config';
import { decryptText } from '@/lib/encryption';
import { google } from 'googleapis';
import { NotificationService } from '@/lib/notifications/notificationService';
import { logger } from '@/lib/logger/logger.server';
import { broadcastCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import { ICandidate } from '@/lib/models/candidate';
import { ICandidateHistory } from '@/lib/models/history';
import { getZoomAccessToken } from '@/lib/zoom/zoomAuth';

interface UpdateMeetRequest {
  candidateId?: string;
  meetingId: string;
  eventId?: string;
  scheduledTime?: string;
  duration?: number;
  guests?: string[];
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
    const { candidateId, meetingId, eventId, scheduledTime, duration, guests } =
      body as UpdateMeetRequest;

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 },
      );
    }

    if (typeof duration === 'number' && duration > 40) {
      return NextResponse.json(
        { error: 'Zoom meeting duration cannot exceed 40 minutes' },
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
      .select('zoom googleCalendar timeZone.name timeZone.offset')
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

    if (scheduledTime || duration) {
      await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_time: scheduledTime
            ? new Date(scheduledTime).toISOString()
            : undefined,
          duration: duration || undefined,
          timezone: organizationTimezone,
        }),
      });
    }

    // Update Google Calendar event if applicable
    let summary = '';
    let description = '';
    let htmlLink = '';

    if (eventId && settings?.googleCalendar?.isConnected) {
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
        start?: { dateTime: string; timeZone: string };
        end?: { dateTime: string; timeZone: string };
        attendees?: Array<{ email: string }>;
      } = {};

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

      const response = await calendar.events.patch({
        calendarId: 'primary',
        eventId,
        requestBody: updateData,
        sendUpdates: 'all',
      });

      summary = response.data.summary || '';
      description = response.data.description || '';
      htmlLink = response.data.htmlLink || '';
    }

    // Fetch updated Zoom meeting info
    let meetingLink = '';
    let startUrl = '';
    try {
      const meetingResponse = await fetch(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (meetingResponse.ok) {
        const meetingData = (await meetingResponse.json()) as {
          join_url?: string;
          start_url?: string;
        };
        meetingLink = meetingData.join_url || '';
        startUrl = meetingData.start_url || '';
      }
    } catch (fetchError) {
      logger.error({ error: fetchError }, 'Failed to fetch Zoom meeting info');
    }

    if (candidateId && Candidate) {
      const updateFields: Record<string, unknown> = {
        'assignment.zoomMeet.meetingLink': meetingLink,
        'assignment.zoomMeet.startUrl': startUrl,
        'assignment.zoomMeet.lastSyncedAt': new Date(),
      };

      if (summary) updateFields['assignment.zoomMeet.summary'] = summary;
      if (description)
        updateFields['assignment.zoomMeet.description'] = description;
      if (htmlLink) updateFields['assignment.zoomMeet.htmlLink'] = htmlLink;

      await Candidate.findByIdAndUpdate(candidateId, {
        $set: updateFields,
      });
    }

    return NextResponse.json({
      success: true,
      meetingId,
      meetingLink,
      startUrl,
      eventId: eventId || '',
      htmlLink,
      summary,
      description,
      message: 'Zoom meeting updated successfully',
    });
  } catch (error) {
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
      .select('zoom googleCalendar timeZone.name')
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

    // Cancel Zoom meeting
    await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Cancel Google Calendar event if present
    if (eventId && settings?.googleCalendar?.isConnected) {
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
                  description: updatedDescription,
                  status: 'cancelled',
                },
                sendUpdates: 'all',
              });
            } catch (error) {
              logger.error({ error, url: req.url }, 'Failed to cancel event');
            }
          })()
        : calendar.events.patch({
            calendarId: 'primary',
            eventId,
            requestBody: {
              status: 'cancelled',
            },
            sendUpdates: 'all',
          });

      await cancelEventPromise;
    }

    const clearCandidatePromise =
      candidateId && Candidate
        ? Candidate.findByIdAndUpdate(candidateId, {
            $unset: { 'assignment.zoomMeet': '' },
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
              title: 'Zoom Meeting Cancelled',
              assignmentBy: userData?.id,
              previousInterviewer: candidate?.assignment?.interviewerId,
              currentInterviewer: candidate?.assignment?.interviewerId,
              note: {
                userId: userData?.id,
                description: cancelNotes
                  ? `Zoom Meeting Cancelled. Reason: ${cancelNotes}`
                  : 'Zoom Meeting Cancelled.',
              },
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
            .lean()) as (ICandidate & { history?: ICandidateHistory[] }) | null;

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
      message: 'Zoom meeting cancelled successfully',
    });
  } catch (error) {
    logger.error({ error, url: req.url }, 'Error cancelling Zoom meeting');
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to cancel meeting',
      },
      { status: 500 },
    );
  }
}
