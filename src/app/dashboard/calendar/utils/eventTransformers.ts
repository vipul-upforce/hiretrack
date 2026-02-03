/**
 * Calendar event transformation utilities
 */
import { Candidate } from '@/types/candidate';
import { CandidateAssignment, CustomCalendarEvent, Job } from '../page';
import { CalendarViewType, eventColors } from './dateRangeUtils';

/**
 * Transform a single CandidateAssignment into a CustomCalendarEvent
 * Returns an event even if time is null (for "Not Scheduled" section)
 */
export const transformAssignmentToEvent = (
  candidate: CandidateAssignment,
  index: number,
  calendarView: CalendarViewType,
): CustomCalendarEvent | undefined => {
  const rawTime = candidate?.assignment?.time;
  
  // If no time is set, create an event without start/end dates for "Not Scheduled" section
  // Only skip if there's no assignment at all or no interviewer assigned
  if (!candidate?.assignment) return undefined;
  
  const hasInterviewer = candidate.assignment.interviewerId && (
    typeof candidate.assignment.interviewerId === 'object' 
      ? candidate.assignment.interviewerId?._id 
      : candidate.assignment.interviewerId
  );
  
  // Skip if no interviewer is assigned
  if (!hasInterviewer) return undefined;
  
  // If time is null/undefined, create event without start/end for "Not Scheduled"
  const startTime = rawTime ? new Date(rawTime) : undefined;
  const endTime = startTime ? new Date(startTime.getTime() + 1000) : undefined;

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

  // Avoid nested ternaries for end and endStr
  let end: Date | undefined;
  let endStr: string = '';

  if (startTime) {
    if (calendarView === 'dayGridMonth') {
      end = endTime;
      endStr = endTime?.toISOString() || '';
    } else {
      end = startTime;
      endStr = '';
    }
  } else {
    end = undefined;
    endStr = '';
  }

  return {
    id: candidate._id,
    title,
    start: startTime, // undefined for unscheduled candidates
    startStr: startTime ? startTime.toISOString() : '',
    end,
    endStr,
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

    // Check if the updated candidate still has a valid assignment
    // If not, return null to close the dialog (handled by useSSE)
    if (!updatedCandidate?.assignment) return null;
    
    const hasInterviewer = updatedCandidate.assignment.interviewerId && (
      typeof updatedCandidate.assignment.interviewerId === 'object' 
        ? updatedCandidate.assignment.interviewerId?._id 
        : updatedCandidate.assignment.interviewerId
    );
    
    if (!hasInterviewer) return null;

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
