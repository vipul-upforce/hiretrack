import { baseApi } from '@/lib/api/baseApi';

export interface MeetingGuest {
  email: string;
  responseStatus?: string;
}

export interface MeetingAttachment {
  id?: string;
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface ScheduleMeetingRequest {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  interviewerId: string;
  interviewerName: string;
  scheduledTime: string; // ISO string
  duration: number;
  guests: string[];
  jobTitle: string;
  organizationName: string;
  meetingNotes?: string;
  meetingAttachments?: MeetingAttachment[];
}

export interface UpdateMeetingRequest {
  eventId: string;
  candidateId: string;
  scheduledTime: string; // ISO string
  duration: number;
  guests: string[];
}

export interface CancelMeetingRequest {
  eventId: string;
  candidateId: string;
  cancelNotes?: string;
}

export interface MeetingResponse {
  eventId: string;
  meetingLink: string;
  htmlLink: string;
  summary: string;
  description: string;
  error?: string;
}

export const calendarApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    scheduleMeeting: builder.mutation<MeetingResponse, ScheduleMeetingRequest>({
      query: (data) => ({
        url: '/google-calendar/schedule-meet',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Candidate'],
    }),
    updateMeeting: builder.mutation<MeetingResponse, UpdateMeetingRequest>({
      query: (data) => ({
        url: '/google-calendar/update-meet',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Candidate'],
    }),
    cancelMeeting: builder.mutation<void, CancelMeetingRequest>({
      query: ({ eventId, candidateId, cancelNotes }) => ({
        url: '/google-calendar/update-meet',
        method: 'DELETE',
        params: { eventId, candidateId, cancelNotes: cancelNotes || '' },
      }),
      invalidatesTags: ['Candidate'],
    }),
  }),
});

export const {
  useScheduleMeetingMutation,
  useUpdateMeetingMutation,
  useCancelMeetingMutation,
} = calendarApi;
