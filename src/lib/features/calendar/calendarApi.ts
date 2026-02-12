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
  interviewerEmail?: string;
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
  meetingNotes?: string;
  meetingAttachments?: MeetingAttachment[];
}

export interface CancelMeetingRequest {
  eventId: string;
  candidateId: string;
  cancelNotes?: string;
}

export interface ScheduleZoomMeetingRequest extends ScheduleMeetingRequest {
  meetingNotes?: string;
  meetingAttachments?: MeetingAttachment[];
}

export interface UpdateZoomMeetingRequest {
  meetingId: string;
  eventId?: string;
  candidateId: string;
  scheduledTime: string; // ISO string
  duration: number;
  guests: string[];
  meetingNotes?: string;
  meetingAttachments?: MeetingAttachment[];
}

export interface CancelZoomMeetingRequest {
  meetingId: string;
  eventId?: string;
  candidateId: string;
  cancelNotes?: string;
  guests?: string[];
}

export interface ScheduleTeamsMeetingRequest extends ScheduleMeetingRequest {
  meetingNotes?: string;
  meetingAttachments?: MeetingAttachment[];
}

export interface UpdateTeamsMeetingRequest {
  meetingId: string;
  eventId?: string;
  candidateId: string;
  scheduledTime: string; // ISO string
  duration: number;
  guests: string[];
  meetingNotes?: string;
  meetingAttachments?: MeetingAttachment[];
}

export interface CancelTeamsMeetingRequest {
  meetingId: string;
  eventId?: string;
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

export interface ZoomMeetingResponse {
  meetingId: string;
  meetingLink: string;
  startUrl?: string;
  eventId?: string;
  htmlLink?: string;
  summary?: string;
  description?: string;
  error?: string;
}

export interface TeamsMeetingResponse {
  meetingId: string;
  meetingLink: string;
  eventId?: string;
  htmlLink?: string;
  summary?: string;
  description?: string;
  error?: string;
}

export type AttendeeResponseStatus =
  | 'needsAction'
  | 'accepted'
  | 'declined'
  | 'tentative';

export interface AttendeeResponse {
  email: string;
  name: string;
  responseStatus: AttendeeResponseStatus;
  comment?: string;
  lastUpdated: string; // ISO Date String
  notificationSent: boolean;
}

export interface SyncEventRequest {
  candidateId: string;
  eventId: string;
}

export interface SyncEventResponse {
  success: boolean;
  message?: string;
  data: {
    eventId: string;
    eventStatus?: string;
    attendeeResponses: AttendeeResponse[];
    notificationsSent: number;
    changesDetected: boolean;
  };
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
    syncEvent: builder.mutation<SyncEventResponse, SyncEventRequest>({
      query: (data) => ({
        url: '/google-calendar/sync-event',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Candidate'],
    }),
    scheduleZoomMeeting: builder.mutation<
      ZoomMeetingResponse,
      ScheduleZoomMeetingRequest
    >({
      query: (data) => ({
        url: '/zoom/schedule-meet',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Candidate'],
    }),
    updateZoomMeeting: builder.mutation<
      ZoomMeetingResponse,
      UpdateZoomMeetingRequest
    >({
      query: (data) => ({
        url: '/zoom/update-meet',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Candidate'],
    }),
    cancelZoomMeeting: builder.mutation<void, CancelZoomMeetingRequest>({
      query: ({ meetingId, candidateId, eventId, cancelNotes, guests }) => ({
        url: '/zoom/update-meet',
        method: 'DELETE',
        params: {
          meetingId,
          candidateId,
          eventId: eventId || '',
          cancelNotes: cancelNotes || '',
          guests: guests && guests.length > 0 ? JSON.stringify(guests) : '',
        },
      }),
      invalidatesTags: ['Candidate'],
    }),
    scheduleTeamsMeeting: builder.mutation<
      TeamsMeetingResponse,
      ScheduleTeamsMeetingRequest
    >({
      query: (data) => ({
        url: '/microsoft-teams/schedule-meet',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Candidate'],
    }),
    updateTeamsMeeting: builder.mutation<
      TeamsMeetingResponse,
      UpdateTeamsMeetingRequest
    >({
      query: (data) => ({
        url: '/microsoft-teams/update-meet',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Candidate'],
    }),
    cancelTeamsMeeting: builder.mutation<void, CancelTeamsMeetingRequest>({
      query: ({ meetingId, candidateId, eventId, cancelNotes }) => ({
        url: '/microsoft-teams/update-meet',
        method: 'DELETE',
        params: {
          meetingId,
          candidateId,
          eventId: eventId || '',
          cancelNotes: cancelNotes || '',
        },
      }),
      invalidatesTags: ['Candidate'],
    }),
  }),
});

export const {
  useScheduleMeetingMutation,
  useUpdateMeetingMutation,
  useCancelMeetingMutation,
  useSyncEventMutation,
  useScheduleZoomMeetingMutation,
  useUpdateZoomMeetingMutation,
  useCancelZoomMeetingMutation,
  useScheduleTeamsMeetingMutation,
  useUpdateTeamsMeetingMutation,
  useCancelTeamsMeetingMutation,
} = calendarApi;
