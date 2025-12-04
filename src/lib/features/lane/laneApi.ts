import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ILane } from '@/lib/models/Lane';

export const laneApi = createApi({
  reducerPath: 'laneApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Lane'],
  endpoints: (builder) => ({
    getLanes: builder.query({
      query: ({ userId, jobId }: { userId?: string; jobId?: string }) => {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (jobId) params.append('jobId', jobId);
        return `lanes?${params.toString()}`;
      },
      providesTags: ['Lane'],
    }),
    // NEW: Get job-specific lanes
    getJobLanes: builder.query({
      query: (jobId: string) => `jobs/${jobId}/lanes`,
      providesTags: ['Lane'],
    }),
    updateLanes: builder.mutation<ILane, { userId: string; lanes: string[] }>({
      query: (data) => ({
        url: 'lanes',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Lane'],
    }),
    editLane: builder.mutation<
      ILane,
      { organizationId: string; prevLaneId: string; newLaneId: string }
    >({
      query: (data) => ({
        url: `lanes/${data.prevLaneId || ''}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Lane'],
    }),
    deleteLane: builder.mutation<
      void,
      { laneId: string; organizationId: string | object }
    >({
      query: ({ organizationId, laneId }) => ({
        url: `lanes/${laneId}`,
        method: 'DELETE',
        body: { organizationId },
      }),
      invalidatesTags: ['Lane'],
    }),
    // NEW: Delete job-specific lane
    deleteJobLane: builder.mutation<
      void,
      { jobId: string; laneName: string; migrationLane?: string }
    >({
      query: ({ jobId, laneName, migrationLane }) => ({
        url: `jobs/${jobId}/lanes/${laneName}`,
        body: {
          migrationLane,
        },
        method: 'DELETE',
      }),
      invalidatesTags: ['Lane'],
    }),
    // NEW: Rename job-specific lane
    renameJobLane: builder.mutation<
      void,
      { jobId: string; laneName: string; newLaneName: string }
    >({
      query: ({ jobId, laneName, newLaneName }) => ({
        url: `jobs/${jobId}/lanes/${laneName}`,
        method: 'PATCH',
        body: { newLaneName },
      }),
      invalidatesTags: ['Lane'],
    }),
  }),
});

// Default Lanes
export const defaultLanesApi = createApi({
  reducerPath: 'defaultLanesApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/organizations' }),
  tagTypes: ['DefaultLanes'],
  endpoints: (builder) => ({
    getDefaultLanes: builder.query({
      query: () => 'default-lanes',
      providesTags: ['DefaultLanes'],
    }),
    updateDefaultLanes: builder.mutation({
      query: (defaultLanes) => ({
        url: 'default-lanes',
        method: 'PUT',
        body: { defaultLanes },
      }),
      invalidatesTags: ['DefaultLanes'],
    }),
    addDefaultLane: builder.mutation({
      query: (laneName) => ({
        url: 'default-lanes',
        method: 'POST',
        body: { laneName },
      }),
      invalidatesTags: ['DefaultLanes'],
    }),
    deleteDefaultLane: builder.mutation({
      query: (laneName) => ({
        url: 'default-lanes',
        method: 'DELETE',
        body: { laneName },
      }),
      invalidatesTags: ['DefaultLanes'],
    }),
  }),
});

export const {
  useGetDefaultLanesQuery,
  useUpdateDefaultLanesMutation,
  useAddDefaultLaneMutation,
  useDeleteDefaultLaneMutation,
} = defaultLanesApi;

export const {
  useGetLanesQuery,
  useGetJobLanesQuery,
  useUpdateLanesMutation,
  useEditLaneMutation,
  useDeleteLaneMutation,
  useDeleteJobLaneMutation,
  useRenameJobLaneMutation,
} = laneApi;
