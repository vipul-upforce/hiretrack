import { useMemo } from 'react';
import {
  CandidateAssignment,
  CustomCalendarEvent,
  CalendarView,
  Job,
} from '../types';

const EVENT_COLORS = [
  { bg: '#3b82f6', border: '#2563eb' },
  { bg: '#10b981', border: '#059669' },
  { bg: '#8b5cf6', border: '#7c3aed' },
  { bg: '#14b8a6', border: '#0d9488' },
  { bg: '#f59e0b', border: '#d97706' },
  { bg: '#ec4899', border: '#db2777' },
];

export function useCalendarEvents(
  assignments: CandidateAssignment[],
  calendarView: CalendarView,
) {
  const events: CustomCalendarEvent[] = useMemo(
    () =>
      assignments.map((candidate: CandidateAssignment, index: number) => {
        const startTime = candidate?.assignment?.time
          ? new Date(candidate.assignment.time)
          : null;
        const endTime = startTime ? new Date(startTime.getTime() + 1000) : null;

        const hasGoogleMeet = candidate?.assignment?.googleMeet;

        const baseTitle =
          candidate?.jobId && typeof candidate.jobId === 'object'
            ? candidate.jobId.title
            : 'Unknown';

        const title = hasGoogleMeet ? `📹 ${baseTitle}` : baseTitle;

        const colorIndex = index % EVENT_COLORS.length;
        const color = hasGoogleMeet
          ? { bg: '#3b82f6', border: '#1d4ed8' }
          : EVENT_COLORS.at(colorIndex);

        return {
          id: candidate._id,
          title,
          start: startTime === null ? undefined : startTime,
          startStr: startTime?.toISOString() || '',
          end:
            calendarView === 'dayGridMonth'
              ? endTime || undefined
              : startTime || undefined,
          endStr:
            calendarView === 'dayGridMonth' ? endTime?.toISOString() || '' : '',
          allDay: false,
          display: 'auto',
          backgroundColor: color?.bg,
          borderColor: color?.border,
          url: '',
          extendedProps: {
            candidate: {
              ...candidate,
              jobId:
                typeof candidate?.jobId === 'string'
                  ? candidate?.jobId
                  : (candidate?.jobId as Job)?._id,
              jobDetails:
                typeof candidate?.jobId === 'string'
                  ? undefined
                  : {
                      title: (candidate?.jobId as Job)?.title,
                      description: (candidate?.jobId as Job)?.description,
                    },
            },
            interviewer:
              typeof candidate?.assignment?.interviewerId === 'string'
                ? {
                    _id: candidate?.assignment?.interviewerId,
                    name: 'Unknown',
                    email: 'Unknown',
                  }
                : candidate?.assignment?.interviewerId || {
                    _id: '',
                    name: 'Unknown',
                    email: 'Unknown',
                  },
          },
        };
      }),
    [assignments, calendarView],
  );

  return { events };
}
