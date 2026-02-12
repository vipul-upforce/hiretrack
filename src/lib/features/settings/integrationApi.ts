import { baseApi } from '@/lib/api/baseApi';
import {
  TestConnectionRequest,
  TestConnectionResponse,
  GoogleCalendarConfigResponse,
  ZoomConfigResponse,
  MicrosoftTeamsConfigResponse,
} from './types/config.types';

export const integrationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    testConnection: builder.mutation<
      TestConnectionResponse,
      TestConnectionRequest
    >({
      query: (body) => ({ url: '/test-connection', method: 'POST', body }),
    }),
    getGoogleCalendarConfig: builder.query<GoogleCalendarConfigResponse, void>({
      query: () => ({ url: '/settings/google-calendar', method: 'GET' }),
      providesTags: ['Settings'],
    }),
    updateGoogleCalendar: builder.mutation({
      query: (config) => ({
        url: '/settings/google-calendar',
        method: 'PUT',
        body: config,
      }),
      invalidatesTags: ['Settings'],
    }),
    disconnectGoogleCalendar: builder.mutation({
      query: () => ({ url: '/settings/google-calendar', method: 'DELETE' }),
      invalidatesTags: ['Settings'],
    }),
    testGoogleCalendarConnection: builder.mutation<
      TestConnectionResponse,
      void
    >({
      query: () => ({
        url: '/google-calendar/test-connection',
        method: 'POST',
      }),
      invalidatesTags: ['Settings'],
    }),
    getZoomConfig: builder.query<ZoomConfigResponse, void>({
      query: () => ({ url: '/settings/zoom', method: 'GET' }),
      providesTags: ['Settings'],
    }),
    updateZoomConfig: builder.mutation({
      query: (config) => ({
        url: '/settings/zoom',
        method: 'PUT',
        body: config,
      }),
      invalidatesTags: ['Settings'],
    }),
    disconnectZoom: builder.mutation({
      query: () => ({ url: '/settings/zoom', method: 'DELETE' }),
      invalidatesTags: ['Settings'],
    }),
    testZoomConnection: builder.mutation<TestConnectionResponse, void>({
      query: () => ({
        url: '/zoom/test-connection',
        method: 'POST',
      }),
      invalidatesTags: ['Settings'],
    }),
    getMicrosoftTeamsConfig: builder.query<MicrosoftTeamsConfigResponse, void>({
      query: () => ({ url: '/settings/microsoft-teams', method: 'GET' }),
      providesTags: ['Settings'],
    }),
    updateMicrosoftTeamsConfig: builder.mutation({
      query: (config) => ({
        url: '/settings/microsoft-teams',
        method: 'PUT',
        body: config,
      }),
      invalidatesTags: ['Settings'],
    }),
    disconnectMicrosoftTeams: builder.mutation({
      query: () => ({
        url: '/settings/microsoft-teams',
        method: 'DELETE',
      }),
      invalidatesTags: ['Settings'],
    }),
    testMicrosoftTeamsConnection: builder.mutation<
      TestConnectionResponse,
      void
    >({
      query: () => ({
        url: '/microsoft-teams/test-connection',
        method: 'POST',
      }),
      invalidatesTags: ['Settings'],
    }),
  }),
});

export const {
  useTestConnectionMutation,
  useGetGoogleCalendarConfigQuery,
  useUpdateGoogleCalendarMutation,
  useDisconnectGoogleCalendarMutation,
  useTestGoogleCalendarConnectionMutation,
  useGetZoomConfigQuery,
  useUpdateZoomConfigMutation,
  useDisconnectZoomMutation,
  useTestZoomConnectionMutation,
  useGetMicrosoftTeamsConfigQuery,
  useUpdateMicrosoftTeamsConfigMutation,
  useDisconnectMicrosoftTeamsMutation,
  useTestMicrosoftTeamsConnectionMutation,
} = integrationApi;
