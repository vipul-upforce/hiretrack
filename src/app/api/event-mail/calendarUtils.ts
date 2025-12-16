import { NextRequest } from 'next/server';
import { getFormattedDate } from '@/components/timezoneFormat/getFormattedTZ';

/**
 * Calendar links result
 */
export interface CalendarLinks {
  googleCalendarLink: string;
  outlookCalendarLink: string;
  startDateString: string;
  endDateString: string;
}

/**
 * Generate calendar links for an event
 */
export async function generateCalendarLinks(
  req: NextRequest,
  eventTitle: string,
  startTime: string | undefined,
  endTime: string | undefined,
  jobName: string | undefined,
  interviewerName: string | undefined,
  candidateName: string | undefined,
  status: string | undefined,
  timeZoneOffset?: string,
): Promise<CalendarLinks> {
  // Format dates in parallel
  const [startDateString, startDate, endDateString, endDate] =
    await Promise.all([
      startTime
        ? getFormattedDate(req, new Date(startTime)).then(
            (date) => `${date} ${timeZoneOffset || ''}`,
          )
        : Promise.resolve('N/A'),
      startTime
        ? getFormattedDate(req, new Date(startTime), true).then(
            (date) => date as Date,
          )
        : Promise.resolve(null),
      endTime
        ? getFormattedDate(req, new Date(endTime))
        : Promise.resolve('N/A'),
      endTime
        ? getFormattedDate(req, new Date(endTime), true).then(
            (date) => date as Date,
          )
        : Promise.resolve(null),
    ]);

  const formattedStartTime = startDate
    ? startDate.toISOString().replace(/-|:|\.\d+/g, '')
    : 'N/A';
  const formattedEndTime = endDate
    ? endDate.toISOString().replace(/-|:|\.\d+/g, '')
    : 'N/A';

  const eventDescription = `<div><strong>Job Name:</strong> ${
    jobName || 'N/A'
  }<br>
  <strong>Interviewer Name:</strong> ${interviewerName || 'N/A'}<br>
  <strong>Candidate Name:</strong> ${candidateName || 'N/A'}<br>
  <strong>Status:</strong> ${status || 'N/A'}
</div>
  `;

  const googleCalendarLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    eventTitle,
  )}&dates=${formattedStartTime}/${formattedEndTime}&details=${encodeURIComponent(
    eventDescription || '',
  )}`;

  const outlookCalendarLink = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(
    eventTitle,
  )}&startdt=${startDate ? startDate.toISOString() : 'N/A'}&enddt=${endDate ? endDate.toISOString() : 'N/A'}&body=${encodeURIComponent(
    eventDescription || '',
  )}`;

  return {
    googleCalendarLink,
    outlookCalendarLink,
    startDateString,
    endDateString: endDateString as string,
  };
}
