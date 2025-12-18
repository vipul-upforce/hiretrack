import { baseApi } from '@/lib/api/baseApi';
import {
  TestConnectionRequest,
  TestConnectionResponse,
  GoogleCalendarConfigResponse,
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
  }),
});

export const {
  useTestConnectionMutation,
  useGetGoogleCalendarConfigQuery,
  useUpdateGoogleCalendarMutation,
  useDisconnectGoogleCalendarMutation,
  useTestGoogleCalendarConnectionMutation,
} = integrationApi;
