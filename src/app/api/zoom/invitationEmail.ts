import { NextRequest } from 'next/server';
import { generateCalendarLinks } from '@/app/api/event-mail/calendarUtils';
import { sendUnifiedMail } from '@/lib/notifications/email/unifiedEmailService';

type ZoomInvitationAction = 'scheduled' | 'updated' | 'cancelled';

interface ZoomInvitationEmailParams {
  req: NextRequest;
  organizationId: string;
  action: ZoomInvitationAction;
  candidateId?: string;
  candidateName: string;
  interviewerName: string;
  interviewerEmail?: string;
  candidateEmail?: string;
  guests?: string[];
  scheduledTime?: string;
  duration?: number;
  meetingLink?: string;
  meetingNotes?: string;
  attachments?: Array<{ name: string; url: string }>;
  cancelNotes?: string;
  jobTitle?: string;
  organizationName?: string;
  timeZoneOffset?: string;
  sentById?: string;
  sentByEmail?: string;
  sentByName?: string;
  jobId?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function getSubject(action: ZoomInvitationAction, title: string): string {
  if (action === 'updated') return `Zoom Interview Updated: ${title}`;
  if (action === 'cancelled') return `Zoom Interview Cancelled: ${title}`;
  return `Zoom Interview Invitation: ${title}`;
}

function getActionLabel(action: ZoomInvitationAction): string {
  if (action === 'updated') return 'Meeting Updated';
  if (action === 'cancelled') return 'Meeting Cancelled';
  return 'Meeting Scheduled';
}

export function getZoomInvitationRecipients(params: {
  guests?: string[];
  candidateEmail?: string;
  interviewerEmail?: string;
}): string[] {
  const map = new Map<string, string>();
  const source = [
    ...(params.guests || []),
    params.candidateEmail || '',
    params.interviewerEmail || '',
  ];

  source.forEach((raw) => {
    const email = raw.trim();
    if (!email || !EMAIL_REGEX.test(email)) return;
    const key = email.toLowerCase();
    if (!map.has(key)) map.set(key, email);
  });

  return Array.from(map.values());
}

export async function sendZoomInvitationEmail(
  params: ZoomInvitationEmailParams,
): Promise<void> {
  const recipients = getZoomInvitationRecipients({
    guests: params.guests,
    candidateEmail: params.candidateEmail,
    interviewerEmail: params.interviewerEmail,
  });

  if (recipients.length === 0) return;

  const protocol = params.req.headers.get('x-forwarded-proto') || 'http';
  const host = params.req.headers.get('host') || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;

  const safeCandidateName = params.candidateName || 'Candidate';
  const safeInterviewerName = params.interviewerName || 'Interviewer';
  const safeJobTitle = params.jobTitle || 'Position';
  const safeOrganizationName = params.organizationName || 'Company';
  const safeDuration =
    typeof params.duration === 'number' && params.duration > 0
      ? params.duration
      : 30;

  const eventTitle = `Interview with ${safeCandidateName} - ${safeJobTitle}`;
  const startIso = params.scheduledTime
    ? new Date(params.scheduledTime).toISOString()
    : undefined;
  const endIso =
    startIso
      ? new Date(new Date(startIso).getTime() + safeDuration * 60000).toISOString()
      : undefined;

  const calendarLinks = await generateCalendarLinks(
    params.req,
    eventTitle,
    startIso,
    endIso,
    safeJobTitle,
    safeInterviewerName,
    safeCandidateName,
    'interview',
    params.timeZoneOffset,
  );

  const attachmentList = (params.attachments || [])
    .filter((item) => item?.name && item?.url)
    .map((item) => {
      const resolvedUrl = item.url.startsWith('/api/files')
        ? `${baseUrl}${item.url}`
        : item.url;
      return `<li><a href="${escapeHtml(resolvedUrl)}">${escapeHtml(item.name)}</a></li>`;
    })
    .join('');

  const recipientList = recipients
    .map((email) => `<li>${escapeHtml(email)}</li>`)
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #1f2937;">
      <h2 style="margin-bottom: 8px;">${escapeHtml(getActionLabel(params.action))}</h2>
      <p style="margin-top: 0;">Zoom interview details are below.</p>
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
        <p><strong>Organization:</strong> ${escapeHtml(safeOrganizationName)}</p>
        <p><strong>Candidate:</strong> ${escapeHtml(safeCandidateName)}</p>
        <p><strong>Interviewer:</strong> ${escapeHtml(safeInterviewerName)}</p>
        <p><strong>Role:</strong> ${escapeHtml(safeJobTitle)}</p>
        <p><strong>Date & Time:</strong> ${escapeHtml(calendarLinks.startDateString)}${calendarLinks.endDateString && calendarLinks.endDateString !== 'N/A' ? ` - ${escapeHtml(calendarLinks.endDateString)}` : ''}</p>
        ${
          params.meetingLink
            ? `<p><strong>Zoom Link:</strong> <a href="${escapeHtml(params.meetingLink)}">${escapeHtml(params.meetingLink)}</a></p>`
            : ''
        }
        ${params.meetingNotes ? `<p><strong>Meeting Notes:</strong> ${escapeHtml(params.meetingNotes)}</p>` : ''}
        ${
          params.action === 'cancelled' && params.cancelNotes?.trim()
            ? `<p><strong>Cancellation Reason:</strong> ${escapeHtml(params.cancelNotes.trim())}</p>`
            : ''
        }
        <p><strong>Guests:</strong></p>
        <ul>${recipientList}</ul>
        ${
          attachmentList
            ? `<p><strong>Attachments:</strong></p><ul>${attachmentList}</ul>`
            : ''
        }
      </div>
    </div>
  `;

  const recipientId = params.candidateId || params.sentById || '';
  const recipientType = params.candidateId ? 'Candidate' : 'user';

  const result = await sendUnifiedMail({
    organizationId: params.organizationId,
    to: recipients,
    subject: getSubject(params.action, eventTitle),
    html,
    sentBy: params.sentById || 'system',
    sentByEmail: params.sentByEmail || '',
    sentByName: params.sentByName || 'System',
    recipientType,
    recipientId,
    metadata: {
      candidateId: params.candidateId,
      jobId: params.jobId,
      templateUsed: 'zoom-manual-invitation',
      eventType: `zoom_meeting_invitation_${params.action}`,
    },
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to send Zoom invitation email');
  }
}
