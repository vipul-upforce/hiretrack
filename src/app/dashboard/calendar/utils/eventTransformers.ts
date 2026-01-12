/**
 * Calendar event transformation utilities
 */
import { Candidate } from '@/types/candidate';
import { CandidateAssignment, CustomCalendarEvent, Job } from '../page';
import { CalendarViewType, eventColors } from './dateRangeUtils';

/**
 * Transform a single CandidateAssignment into a CustomCalendarEvent
 */
export const transformAssignmentToEvent = (
  candidate: CandidateAssignment,
  index: number,
  calendarView: CalendarViewType,
): CustomCalendarEvent | undefined => {
  const rawTime = candidate?.assignment?.time;
  if (!rawTime) return undefined;

  const startTime = new Date(rawTime);
  const endTime = new Date(startTime.getTime() + 1000);

  const hasGoogleMeet = candidate?.assignment?.googleMeet;
  const baseTitle =
    candidate?.jobId && typeof candidate.jobId === 'object'
      ? candidate.jobId.title
      : 'Unknown';
  const title = hasGoogleMeet ? `📹 ${baseTitle}` : baseTitle;

  const colorIndex = index % eventColors.length;
  const color = hasGoogleMeet
    ? { bg: '#3b82f6', border: '#1d4ed8' }
    : eventColors[colorIndex];

  return {
    id: candidate._id,
    title,
    start: startTime,
    startStr: startTime.toISOString(),
    end: calendarView === 'dayGridMonth' ? endTime : startTime,
    endStr: calendarView === 'dayGridMonth' ? endTime.toISOString() : '',
    allDay: false,
    display: 'auto',
    backgroundColor: color.bg,
    borderColor: color.border,
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
  } as CustomCalendarEvent;
};

/**
 * Transform SSE Candidate update to CustomCalendarEvent
 * Used by useSSE hook to update calendar events
 */
export const createSSETransformer =
  () =>
  (
    updatedCandidate: Candidate,
    currentSelected: CustomCalendarEvent | Candidate | null,
  ): CustomCalendarEvent | null => {
    if (!currentSelected || !('extendedProps' in currentSelected)) {
      return null;
    }

    const currentEvent = currentSelected as CustomCalendarEvent;
    const startTime = updatedCandidate?.assignment?.time
      ? new Date(updatedCandidate.assignment.time)
      : currentEvent?.start || new Date();
    const endTime = updatedCandidate?.assignment?.time
      ? new Date(new Date(startTime).setHours(startTime.getHours() + 1))
      : currentEvent?.end || new Date();

    const hasGoogleMeet = updatedCandidate?.assignment?.googleMeet;
    const baseTitle =
      updatedCandidate?.jobId && typeof updatedCandidate.jobId === 'object'
        ? updatedCandidate.jobId.title
        : 'Unknown';
    const title = hasGoogleMeet ? `📹 ${baseTitle}` : baseTitle;

    return {
      ...currentEvent,
      id: updatedCandidate._id,
      title,
      start: startTime,
      end: endTime,
      startStr: startTime.toISOString(),
      endStr: endTime.toISOString(),
      extendedProps: {
        ...currentEvent.extendedProps,
        candidate: {
          ...updatedCandidate,
          jobId:
            typeof updatedCandidate.jobId === 'string'
              ? updatedCandidate.jobId
              : (updatedCandidate.jobId as Job)?._id,
          jobDetails:
            typeof updatedCandidate.jobId === 'string'
              ? undefined
              : {
                  title: (updatedCandidate.jobId as Job)?.title,
                  description: (updatedCandidate.jobId as Job)?.description,
                },
        },
        interviewer:
          typeof updatedCandidate?.assignment?.interviewerId === 'string'
            ? {
                _id: updatedCandidate.assignment.interviewerId,
                name: 'Unknown',
                email: 'Unknown',
              }
            : updatedCandidate?.assignment?.interviewerId || {
                _id: '',
                name: 'Unknown',
                email: 'Unknown',
              },
      },
    };
  };
