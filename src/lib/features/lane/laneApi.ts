import { baseApi } from '@/lib/api/baseApi';

// Response types matching backend
export interface JobLanesResponse {
  jobId: string;
  jobTitle: string;
  lanes: Array<{ name: string; _id: string }>;
  useCustomLanes: boolean;
  laneRestrictions: {
    nonEditable: string[];
    nonDeletable: string[];
  };
}

export interface DefaultLanesResponse {
  defaultLanes: string[];
  laneRestrictions: {
    nonEditable: string[];
    nonDeletable: string[];
  };
}

export interface UpdateLanesResponse {
  message: string;
  jobId?: string;
  lanes: string[];
  useCustomLanes: boolean;
}

export interface AddDefaultLaneResponse {
  message: string;
  defaultLanes: string[];
}

export const laneApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // LEGACY: Get lanes (backward compatible)
    getLanes: builder.query({
      query: ({ userId, jobId }: { userId?: string; jobId?: string }) => {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (jobId) params.append('jobId', jobId);
        return `lanes?${params.toString()}`;
      },
      providesTags: ['Lane'],
    }),
    // Get job-specific lanes
    getJobLanes: builder.query<JobLanesResponse, string>({
      query: (jobId: string) => `jobs/${jobId}/lanes`,
      providesTags: ['Lane'],
    }),
    // Update job lanes (PUT /api/jobs/[id]/lanes)
    updateLanes: builder.mutation<
      UpdateLanesResponse,
      { jobId: string; lanes: string[]; useCustomLanes: boolean }
    >({
      query: ({ jobId, lanes, useCustomLanes }) => ({
        url: `jobs/${jobId}/lanes`,
        method: 'PUT',
        body: { lanes, useCustomLanes },
      }),
      invalidatesTags: ['Lane'],
    }),
    // LEGACY: Edit organization-level lane (backward compatible)
    editLane: builder.mutation<
      { message: string },
      { organizationId: string; prevLaneId: string; newLaneId: string }
    >({
      query: (data) => ({
        url: `lanes/${data.prevLaneId || ''}`,
        method: 'PATCH',
        body: { newLaneName: data.newLaneId },
      }),
      invalidatesTags: ['Lane'],
    }),
    // LEGACY: Delete organization-level lane (backward compatible)
    deleteLane: builder.mutation<
      { message: string },
      { laneId: string; organizationId: string | object }
    >({
      query: ({ organizationId, laneId }) => ({
        url: `lanes/${laneId}`,
        method: 'DELETE',
        body: { organizationId },
      }),
      invalidatesTags: ['Lane'],
    }),
    // Add job-specific lane (POST /api/jobs/[id]/lanes)
    addJobLane: builder.mutation<
      UpdateLanesResponse,
      { jobId: string; laneName: string; position?: number }
    >({
      query: ({ jobId, laneName, position }) => ({
        url: `jobs/${jobId}/lanes`,
        method: 'POST',
        body: { laneName, position },
      }),
      invalidatesTags: ['Lane'],
    }),
    // Delete job-specific lane
    deleteJobLane: builder.mutation<
      { message: string },
      { jobId: string; laneName: string; migrationLane?: string }
    >({
      // Use query param for migrationLane so it works when DELETE body is stripped
      query: ({ jobId, laneName, migrationLane }) => {
        const base = `jobs/${jobId}/lanes/${encodeURIComponent(laneName)}`;
        const query =
          migrationLane != null && migrationLane !== ''
            ? `?migrationLane=${encodeURIComponent(migrationLane)}`
            : '';
        return {
          url: `${base}${query}`,
          method: 'DELETE',
        };
      },
      invalidatesTags: ['Lane'],
    }),
    // Rename job-specific lane
    renameJobLane: builder.mutation<
      { message: string },
      { jobId: string; laneName: string; newLaneName: string }
    >({
      query: ({ jobId, laneName, newLaneName }) => ({
        url: `jobs/${jobId}/lanes/${laneName}`,
        method: 'PATCH',
        body: { newLaneName },
      }),
      invalidatesTags: ['Lane'],
    }),
    // Update lane-specific sorting configuration

  }),
});

// Default Lanes API
export const defaultLanesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDefaultLanes: builder.query<DefaultLanesResponse, void>({
      query: () => `/organizations/default-lanes`,
      providesTags: ['DefaultLanes'],
    }),
    updateDefaultLanes: builder.mutation<
      { message: string; defaultLanes: string[]; laneRestrictions: DefaultLanesResponse['laneRestrictions'] },
      { defaultLanes: string[] }
    >({
      query: (body) => ({
        url: `/organizations/default-lanes`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['DefaultLanes', 'Lane'],
    }),
    addDefaultLane: builder.mutation<
      AddDefaultLaneResponse,
      { laneName: string; position?: number }
    >({
      query: (body) => ({
        url: `/organizations/default-lanes`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['DefaultLanes', 'Lane'],
    }),
    deleteDefaultLane: builder.mutation<
      { message: string; defaultLanes: string[] },
      { laneName: string }
    >({
      query: (body) => ({
        url: `/organizations/default-lanes`,
        method: 'DELETE',
        body,
      }),
      invalidatesTags: ['DefaultLanes', 'Lane'],
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
  useAddJobLaneMutation,
  useDeleteJobLaneMutation,
  useRenameJobLaneMutation,
} = laneApi;
