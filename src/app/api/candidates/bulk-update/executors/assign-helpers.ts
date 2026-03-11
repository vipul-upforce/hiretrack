/**
 * Helpers for bulk-assign: schedule Google Meet, Zoom, and Microsoft Teams per candidate.
 * Extracted to keep assign.ts under the line limit.
 */
import type { ICandidate } from '@/lib/models/candidate';
import { logger } from '@/lib/logger/logger.server';
import type { BulkUpdateContext } from '../types';

export type GoogleMeetSchedulingResult = {
  eventId: string;
  meetingLink: string;
  htmlLink: string;
  summary: string;
  description: string;
  meetingNotes?: string;
  meetingAttachments?: unknown[];
} | null;

export type ZoomMeetSchedulingResult = {
  meetingId: string;
  meetingLink: string;
  startUrl?: string;
  eventId?: string;
  htmlLink?: string;
  summary?: string;
  description?: string;
  meetingNotes?: string;
  meetingAttachments?: unknown[];
} | null;

export type TeamsMeetSchedulingResult = {
  meetingId: string;
  meetingLink: string;
  eventId?: string;
  htmlLink?: string;
  summary?: string;
  description?: string;
  meetingNotes?: string;
  meetingAttachments?: unknown[];
} | null;

function buildRequestHeaders(ctx: BulkUpdateContext): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ctx.requestHeaders) {
    if (ctx.requestHeaders.get('authorization')) {
      headers.authorization = ctx.requestHeaders.get('authorization')!;
    }
    if (ctx.requestHeaders.get('cookie')) {
      headers.cookie = ctx.requestHeaders.get('cookie')!;
    }
  }
  return headers;
}

const getBaseUrl = () =>
  process.env.BASE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  'http://localhost:3000';

export async function scheduleGoogleMeetForCandidate(
  ctx: BulkUpdateContext,
  opts: {
    candidateId: string;
    candidateObj: ICandidate;
    interviewerId: string;
    interviewerName: string;
    interviewerEmail?: string;
    time: string;
    meetDuration: number;
    meetingNotes: string;
    meetingAttachments: unknown[];
    additionalGuests: string[];
    user: BulkUpdateContext['user'];
  },
): Promise<{ data: GoogleMeetSchedulingResult; meetingLink?: string; outlookCalendarLink?: string }> {
  const {
    candidateId,
    candidateObj,
    interviewerId,
    interviewerName,
    time,
    meetDuration,
    meetingNotes,
    meetingAttachments: processedMeetingAttachments,
    additionalGuests,
    user,
  } = opts;
  const guests = [
    ...(opts.interviewerEmail ? [opts.interviewerEmail] : []),
    ...(candidateObj.email ? [candidateObj.email] : []),
    ...(user.email && user.email !== opts.interviewerEmail ? [user.email] : []),
    ...additionalGuests,
  ];
  const headers = buildRequestHeaders(ctx);
  try {
    const scheduleResponse = await fetch(
      `${getBaseUrl()}/api/google-calendar/schedule-meet`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          candidateId,
          candidateName: candidateObj.name,
          candidateEmail: candidateObj.email,
          interviewerId,
          interviewerName,
          scheduledTime: time,
          duration: meetDuration,
          guests,
          jobTitle:
            (candidateObj.jobId as { title?: string })?.title || 'Position',
          organizationName:
            user.organizationInfo?.name || user.organizationId || 'Company',
          meetingNotes,
          meetingAttachments: processedMeetingAttachments,
        }),
      },
    );
    if (!scheduleResponse.ok) {
      logger.error(
        { status: scheduleResponse.status, candidateId },
        'Bulk assign: failed to schedule Google Meet',
      );
      return { data: null };
    }
    const scheduleResult = await scheduleResponse.json();
    const data: NonNullable<GoogleMeetSchedulingResult> = {
      eventId: scheduleResult.eventId,
      meetingLink: scheduleResult.meetingLink,
      htmlLink: scheduleResult.htmlLink,
      summary: scheduleResult.summary,
      description: scheduleResult.description,
      meetingNotes,
      meetingAttachments: processedMeetingAttachments,
    };
    return {
      data,
      meetingLink: scheduleResult.meetingLink ?? undefined,
      outlookCalendarLink: scheduleResult.outlookCalendarLink ?? undefined,
    };
  } catch (err) {
    logger.error(
      { error: err, candidateId },
      'Bulk assign: Google Meet scheduling error',
    );
    return { data: null };
  }
}

export async function scheduleZoomMeetForCandidate(
  ctx: BulkUpdateContext,
  opts: {
    candidateId: string;
    candidateObj: ICandidate;
    interviewerId: string;
    interviewerName: string;
    interviewerEmail?: string;
    time: string;
    zoomMeetDuration: number;
    zoomMeetingNotes: string;
    zoomMeetingAttachments: unknown[];
    zoomAdditionalGuests: string[];
    user: BulkUpdateContext['user'];
  },
): Promise<{ data: ZoomMeetSchedulingResult; meetingLink?: string }> {
  const {
    candidateId,
    candidateObj,
    interviewerId,
    interviewerName,
    time,
    zoomMeetDuration,
    zoomMeetingNotes,
    zoomMeetingAttachments: processedZoomMeetingAttachments,
    zoomAdditionalGuests,
    user,
  } = opts;
  const guests = [
    ...(opts.interviewerEmail ? [opts.interviewerEmail] : []),
    ...(candidateObj.email ? [candidateObj.email] : []),
    ...(user.email && user.email !== opts.interviewerEmail ? [user.email] : []),
    ...zoomAdditionalGuests,
  ];
  const headers = buildRequestHeaders(ctx);
  try {
    const scheduleResponse = await fetch(
      `${getBaseUrl()}/api/zoom/schedule-meet`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          candidateId,
          candidateName: candidateObj.name,
          candidateEmail: candidateObj.email,
          interviewerId,
          interviewerName,
          interviewerEmail: opts.interviewerEmail,
          scheduledTime: time,
          duration: zoomMeetDuration,
          guests,
          jobTitle:
            (candidateObj.jobId as { title?: string })?.title || 'Position',
          organizationName:
            user.organizationInfo?.name || user.organizationId || 'Company',
          meetingNotes: zoomMeetingNotes,
          meetingAttachments: processedZoomMeetingAttachments,
        }),
      },
    );
    if (!scheduleResponse.ok) {
      logger.error(
        { status: scheduleResponse.status, candidateId },
        'Bulk assign: failed to schedule Zoom meeting',
      );
      return { data: null };
    }
    const scheduleResult = await scheduleResponse.json();
    const data: NonNullable<ZoomMeetSchedulingResult> = {
      meetingId: scheduleResult.meetingId,
      meetingLink: scheduleResult.meetingLink,
      startUrl: scheduleResult.startUrl,
      eventId: scheduleResult.eventId,
      htmlLink: scheduleResult.htmlLink,
      summary: scheduleResult.summary,
      description: scheduleResult.description,
      meetingNotes: zoomMeetingNotes,
      meetingAttachments: processedZoomMeetingAttachments,
    };
    return {
      data,
      meetingLink: scheduleResult.meetingLink ?? undefined,
    };
  } catch (err) {
    logger.error(
      { error: err, candidateId },
      'Bulk assign: Zoom scheduling error',
    );
    return { data: null };
  }
}

export async function scheduleTeamsMeetForCandidate(
  ctx: BulkUpdateContext,
  opts: {
    candidateId: string;
    candidateObj: ICandidate;
    interviewerId: string;
    interviewerName: string;
    interviewerEmail?: string;
    time: string;
    teamsMeetDuration: number;
    teamsMeetingNotes: string;
    teamsMeetingAttachments: unknown[];
    teamsAdditionalGuests: string[];
    user: BulkUpdateContext['user'];
  },
): Promise<{ data: TeamsMeetSchedulingResult; meetingLink?: string }> {
  const {
    candidateId,
    candidateObj,
    interviewerId,
    interviewerName,
    time,
    teamsMeetDuration,
    teamsMeetingNotes,
    teamsMeetingAttachments: processedTeamsMeetingAttachments,
    teamsAdditionalGuests,
    user,
  } = opts;
  const guests = [
    ...(opts.interviewerEmail ? [opts.interviewerEmail] : []),
    ...(candidateObj.email ? [candidateObj.email] : []),
    ...(user.email && user.email !== opts.interviewerEmail ? [user.email] : []),
    ...teamsAdditionalGuests,
  ];
  const headers = buildRequestHeaders(ctx);
  try {
    const scheduleResponse = await fetch(
      `${getBaseUrl()}/api/microsoft-teams/schedule-meet`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          candidateId,
          candidateName: candidateObj.name,
          candidateEmail: candidateObj.email,
          interviewerId,
          interviewerName,
          interviewerEmail: opts.interviewerEmail,
          scheduledTime: time,
          duration: teamsMeetDuration,
          guests,
          jobTitle:
            (candidateObj.jobId as { title?: string })?.title || 'Position',
          organizationName:
            user.organizationInfo?.name || user.organizationId || 'Company',
          meetingNotes: teamsMeetingNotes,
          meetingAttachments: processedTeamsMeetingAttachments,
        }),
      },
    );
    if (!scheduleResponse.ok) {
      logger.error(
        { status: scheduleResponse.status, candidateId },
        'Bulk assign: failed to schedule Microsoft Teams meeting',
      );
      return { data: null };
    }
    const scheduleResult = await scheduleResponse.json();
    const data: NonNullable<TeamsMeetSchedulingResult> = {
      meetingId: scheduleResult.meetingId,
      meetingLink: scheduleResult.meetingLink,
      eventId: scheduleResult.eventId,
      htmlLink: scheduleResult.htmlLink,
      summary: scheduleResult.summary,
      description: scheduleResult.description,
      meetingNotes: teamsMeetingNotes,
      meetingAttachments: processedTeamsMeetingAttachments,
    };
    return {
      data,
      meetingLink: scheduleResult.meetingLink ?? undefined,
    };
  } catch (err) {
    logger.error(
      { error: err, candidateId },
      'Bulk assign: Microsoft Teams scheduling error',
    );
    return { data: null };
  }
}
