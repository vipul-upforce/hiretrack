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
import { uploadFile, uploadFileToS3, saveFileLocally } from '@/lib/fileUtils';
import { MeetingAttachment } from '@/lib/features/calendar/calendarApi';
import { NotificationService } from '@/lib/notifications/notificationService';
import { logger } from '@/lib/logger/logger.server';
import { broadcastCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import { ICandidate } from '@/lib/models/candidate';
import { ICandidateHistory } from '@/lib/models/history';
import { getZoomAccessToken } from '@/lib/zoom/zoomAuth';
import {
  getZoomInvitationRecipients,
  sendZoomInvitationEmail,
} from '@/app/api/zoom/invitationEmail';

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
      meetingNotes,
      meetingAttachments,
    } = body as UpdateMeetRequest;

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

    let candidateName = '';
    let candidateEmail = '';
    let interviewerName = 'Interviewer';
    let interviewerEmail = '';
    let jobTitle = 'Position';
    let jobIdForEmail = '';
    let fallbackScheduledTime = '';
    let existingGuestEmails: string[] = [];
    let existingMeetingNotes = '';
    let existingAttachments: Array<{ name: string; url: string }> = [];
    let existingMeetingLink = '';

    if (candidateId && Candidate) {
      const candidate = (await Candidate.findById(candidateId)
        .select(
          'name email jobId assignment.time assignment.interviewerId assignment.zoomMeet',
        )
        .populate({
          path: 'jobId',
          select: '_id title',
        })
        .populate({
          path: 'assignment.interviewerId',
          select: '_id name email',
        })
        .lean()) as ICandidate | null;

      if (candidate) {
        candidateName = candidate.name || '';
        candidateEmail = candidate.email || '';
        if (candidate.assignment?.time) {
          fallbackScheduledTime = new Date(
            candidate.assignment.time,
          ).toISOString();
        }

        const jobData = candidate.jobId;
        if (jobData && typeof jobData !== 'string') {
          if ('title' in jobData && jobData.title) jobTitle = jobData.title;
          if ('_id' in jobData && jobData._id)
            jobIdForEmail = String(jobData._id);
        } else if (jobData) {
          jobIdForEmail = String(jobData);
        }

        const interviewerData = candidate.assignment?.interviewerId;
        if (interviewerData && typeof interviewerData !== 'string') {
          interviewerName = interviewerData.name || interviewerName;
          interviewerEmail = interviewerData.email || '';
        }

        existingGuestEmails = candidate.assignment?.zoomMeet?.guestEmails || [];
        existingMeetingNotes =
          candidate.assignment?.zoomMeet?.meetingNotes || '';
        existingMeetingLink = candidate.assignment?.zoomMeet?.meetingLink || '';
        existingAttachments = (
          candidate.assignment?.zoomMeet?.meetingAttachments || []
        )
          .filter((item) => item?.name && item?.url)
          .map((item) => ({ name: item.name, url: item.url }));
      }
    }

    if (!Settings) {
      return NextResponse.json(
        { error: 'Settings model not available' },
        { status: 500 },
      );
    }

    const settings = await Settings.findOne({ organizationId })
      .select('zoom googleCalendar timeZone.name timeZone.offset fileStorage')
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

    // Upload meeting attachments (same pattern as schedule-meet)
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

    // Update Zoom meeting (time, duration, agenda)
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
        agenda: meetingNotes !== undefined ? meetingNotes || '' : undefined,
      }),
    });

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
        description?: string;
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

      // Build description with meeting notes and attachments (same format as schedule-meet)
      const hasNotesOrAttachments =
        meetingNotes !== undefined || uploadedAttachments.length > 0;

      if (hasNotesOrAttachments) {
        const existingEvent = await calendar.events.get({
          calendarId: 'primary',
          eventId,
        });

        let descriptionToUpdate = existingEvent.data.description || '';

        if (meetingNotes) {
          descriptionToUpdate += `\n\nMeeting Notes:\n${meetingNotes}`;
        }

        if (uploadedAttachments.length > 0) {
          const protocol = req.headers.get('x-forwarded-proto') || 'http';
          const host = req.headers.get('host') || 'localhost:3000';
          const baseUrl = `${protocol}://${host}`;

          descriptionToUpdate += '\n\nAttachments:';
          uploadedAttachments.forEach((attachment) => {
            const fullUrl = attachment.url.startsWith('/api/files')
              ? `${baseUrl}${attachment.url}`
              : attachment.url;
            descriptionToUpdate += `\n- ${attachment.name}: ${fullUrl}`;
          });
        }
        updateData.description = descriptionToUpdate;
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

    const effectiveMeetingLink = meetingLink || existingMeetingLink;
    const effectiveMeetingNotes =
      meetingNotes !== undefined ? meetingNotes : existingMeetingNotes;
    const effectiveMeetingAttachments =
      uploadedAttachments.length > 0
        ? uploadedAttachments
        : existingAttachments;
    const invitationRecipients = getZoomInvitationRecipients({
      guests: guests && guests.length > 0 ? guests : existingGuestEmails,
      candidateEmail,
      interviewerEmail,
    });

    if (candidateId && Candidate) {
      const updateFields: Record<string, unknown> = {
        'assignment.zoomMeet.meetingLink': effectiveMeetingLink,
        'assignment.zoomMeet.startUrl': startUrl,
        'assignment.zoomMeet.lastSyncedAt': new Date(),
      };

      if (summary) updateFields['assignment.zoomMeet.summary'] = summary;
      if (description)
        updateFields['assignment.zoomMeet.description'] = description;
      if (meetingNotes !== undefined)
        updateFields['assignment.zoomMeet.meetingNotes'] = meetingNotes;
      if (meetingAttachments !== undefined)
        updateFields['assignment.zoomMeet.meetingAttachments'] =
          uploadedAttachments.length > 0 ? uploadedAttachments : [];
      if (htmlLink) updateFields['assignment.zoomMeet.htmlLink'] = htmlLink;
      if (invitationRecipients.length > 0)
        updateFields['assignment.zoomMeet.guestEmails'] = invitationRecipients;

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
          } else if (interviewerEmail) {
            const userByEmail = await User.findOne({
              organizationId,
              email: interviewerEmail,
            })
              .select('_id')
              .lean()
              .exec();
            if (userByEmail?._id) {
              interviewerId = String(userByEmail._id);
            }
          }

          const interviewerNameResolved =
            assignmentInterviewer?.name || interviewerName;
          const jobId =
            candidate.jobId && typeof candidate.jobId !== 'string' && '_id' in candidate.jobId
              ? candidate.jobId._id.toString()
              : candidate.jobId?.toString() || jobIdForEmail;
          const jobTitleResolved =
            candidate.jobId && typeof candidate.jobId !== 'string' && 'title' in candidate.jobId
              ? candidate.jobId.title
              : jobTitle;

          let meetingDate: Date;
          if (scheduledTime) {
            meetingDate = new Date(scheduledTime);
          } else if (fallbackScheduledTime) {
            meetingDate = new Date(fallbackScheduledTime);
          } else {
            meetingDate = new Date();
          }

          await NotificationService.notifyMeetingUpdated({
            organizationId,
            candidateId,
            candidateName,
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

    if (!settings?.googleCalendar?.isConnected) {
      try {
        await sendZoomInvitationEmail({
          req,
          organizationId,
          action: 'updated',
          candidateId,
          candidateName,
          candidateEmail,
          interviewerName,
          interviewerEmail,
          guests: invitationRecipients,
          scheduledTime: scheduledTime || fallbackScheduledTime,
          duration: duration || 30,
          meetingLink: effectiveMeetingLink,
          meetingNotes: effectiveMeetingNotes,
          attachments: effectiveMeetingAttachments,
          jobTitle,
          timeZoneOffset: `${settings.timeZone?.offset || ''} ${settings.timeZone?.name || ''}`,
          sentById: userData.id || 'system',
          sentByEmail: userData.email || '',
          sentByName: userData.name || 'System',
          jobId: jobIdForEmail,
        });
      } catch (invitationError) {
        logger.error(
          { error: invitationError, url: req.url },
          'Failed to send Zoom update invitation fallback email',
        );
      }
    }

    return NextResponse.json({
      success: true,
      meetingId,
      meetingLink: effectiveMeetingLink,
      startUrl,
      eventId: eventId || '',
      htmlLink,
      summary,
      description,
      duration,
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
    const guestsParam = searchParams.get('guests') || '';

    let requestGuestEmails: string[] = [];
    if (guestsParam) {
      try {
        const parsed = JSON.parse(guestsParam);
        if (Array.isArray(parsed)) {
          requestGuestEmails = parsed.filter(
            (item): item is string => typeof item === 'string' && !!item,
          );
        }
      } catch {
        requestGuestEmails = guestsParam
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }

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

    let candidateName = 'Candidate';
    let candidateEmail = '';
    let interviewerName = 'Interviewer';
    let interviewerEmail = '';
    let jobTitleForEmail = 'Position';
    let jobIdForEmail = '';
    let scheduledTimeForEmail = '';
    let storedGuestEmails: string[] = [];
    let storedMeetingLink = '';
    let storedMeetingNotes = '';
    let storedAttachments: Array<{ name: string; url: string }> = [];

    if (candidateId && Candidate) {
      const candidate = (await Candidate.findById(candidateId)
        .select(
          'name email jobId assignment.time assignment.interviewerId assignment.zoomMeet',
        )
        .populate({
          path: 'jobId',
          select: '_id title',
        })
        .populate({
          path: 'assignment.interviewerId',
          select: '_id name email',
        })
        .lean()) as ICandidate | null;

      if (candidate) {
        candidateName = candidate.name || candidateName;
        candidateEmail = candidate.email || '';

        if (candidate.assignment?.time) {
          scheduledTimeForEmail = new Date(
            candidate.assignment.time,
          ).toISOString();
        }

        const jobData = candidate.jobId;
        if (jobData && typeof jobData !== 'string') {
          if ('title' in jobData && jobData.title) {
            jobTitleForEmail = jobData.title;
          }
          if ('_id' in jobData && jobData._id) {
            jobIdForEmail = String(jobData._id);
          }
        } else if (jobData) {
          jobIdForEmail = String(jobData);
        }

        const interviewerData = candidate.assignment?.interviewerId;
        if (interviewerData && typeof interviewerData !== 'string') {
          interviewerName = interviewerData.name || interviewerName;
          interviewerEmail = interviewerData.email || '';
        }

        storedGuestEmails = candidate.assignment?.zoomMeet?.guestEmails || [];
        storedMeetingLink = candidate.assignment?.zoomMeet?.meetingLink || '';
        storedMeetingNotes = candidate.assignment?.zoomMeet?.meetingNotes || '';
        storedAttachments = (
          candidate.assignment?.zoomMeet?.meetingAttachments || []
        )
          .filter((item) => item?.name && item?.url)
          .map((item) => ({ name: item.name, url: item.url }));
      }
    }

    const invitationRecipients = getZoomInvitationRecipients({
      guests:
        requestGuestEmails.length > 0 ? requestGuestEmails : storedGuestEmails,
      candidateEmail,
      interviewerEmail,
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

    if (!settings?.googleCalendar?.isConnected) {
      try {
        await sendZoomInvitationEmail({
          req,
          organizationId,
          action: 'cancelled',
          candidateId: candidateId || undefined,
          candidateName,
          candidateEmail,
          interviewerName,
          interviewerEmail,
          guests: invitationRecipients,
          scheduledTime: scheduledTimeForEmail || undefined,
          meetingLink: storedMeetingLink,
          meetingNotes: storedMeetingNotes,
          attachments: storedAttachments,
          jobTitle: jobTitleForEmail,
          cancelNotes,
          timeZoneOffset: `${settings.timeZone?.offset || ''} ${settings.timeZone?.name || ''}`,
          sentById: userData.id || 'system',
          sentByEmail: userData.email || '',
          sentByName: userData.name || 'System',
          jobId: jobIdForEmail,
        });
      } catch (invitationError) {
        logger.error(
          { error: invitationError, url: req.url },
          'Failed to send Zoom cancellation invitation fallback email',
        );
      }
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
                  ? `Zoom Meeting Cancelled. Reason: ${cancelNotes}`
                  : 'Zoom Meeting Cancelled.',
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
