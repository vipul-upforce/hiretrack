import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Job } from '@/types/job';

export const jobApi = createApi({
  reducerPath: 'jobApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Job'],
  endpoints: (builder) => ({
    fetchJobs: builder.query<Job[], void>({
      query: () => '/jobs',
      providesTags: ['Job'],
    }),
    fetchOpenJobs: builder.query<Job[], void>({
      query: () => '/jobs/open',
      providesTags: ['Job'],
    }),
    createJob: builder.mutation<Job, Partial<Job>>({
      query: (newJob) => ({
        url: '/jobs',
        method: 'POST',
        body: newJob,
      }),
      invalidatesTags: ['Job'],
    }),
    updateJob: builder.mutation<Job, Partial<Job>>({
      query: (updatedJob) => ({
        url: `/jobs/${updatedJob._id}`,
        method: 'PUT',
        body: updatedJob,
      }),
      invalidatesTags: ['Job'],
    }),
    fetchJobById: builder.query<Job, string>({
      query: (id) => `/jobs/${id}`,
      providesTags: ['Job'],
    }),
    updateJobStatus: builder.mutation<Job, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/jobs/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Job'],
    }),
    fetchAssignments: builder.query<Job[], void>({
      query: () => '/jobs/assignments',
      providesTags: ['Job'],
    }),
    deleteJob: builder.mutation<void, string>({
      query: (id) => ({
        url: `/jobs/${id}`,
        method: 'DELETE',
      }),
    }),
    assignJob: builder.mutation({
      query: (data) => ({
        url: '/jobs/open',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const { 
  useFetchJobsQuery, 
  useCreateJobMutation, 
  useUpdateJobMutation,
  useFetchJobByIdQuery,
  useUpdateJobStatusMutation,
  useFetchAssignmentsQuery,
  useDeleteJobMutation,
  useFetchOpenJobsQuery,
  useAssignJobMutation
} = jobApi; 