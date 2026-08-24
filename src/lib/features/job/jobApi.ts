import { baseApi } from '@/lib/api/baseApi';
import { Job } from '@/types/job';
import { Candidate } from '@/types/candidate';
import { JobLanesResponse } from '@/lib/features/lane/laneApi';

export const jobApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    fetchJobs: builder.query<Job[], void>({
      query: () => '/jobs',
      providesTags: ['Job'],
    }),
    fetchOpenJobs: builder.query<Job[], void>({
      query: () => '/jobs/open',
      providesTags: ['Job'],
    }),
    fetchOpenJob: builder.query<Job[], { orgName: string; title: string }>({
      query: ({ orgName, title }) => ({
        url: `/jobs/open-jobs?o=${orgName}${title ? `&title=${title}` : ''}`,
        method: 'GET',
      }),
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
    // DEPRECATED: Use getJobLanes from laneApi instead
    // Kept for backward compatibility
    fetchJobLanes: builder.query<JobLanesResponse, string>({
      query: (id) => `/jobs/${id}/lanes`,
      providesTags: ['Job', 'Lane'],
    }),
    updateJobStatus: builder.mutation<
      Job,
      { id: string; status: string; openJobCardsOrder: string[] }
    >({
      query: ({ id, status, openJobCardsOrder }) => ({
        url: `/jobs/${id}/status`,
        method: 'PATCH',
        body: { status, openJobCardsOrder },
      }),
      invalidatesTags: ['Job'],
    }),
    // fetchAssignments: builder.query<Job[], void>({
    //   query: () => "/jobs/assignments",
    //   providesTags: ["Job"],
    // }),
    deleteJob: builder.mutation<void, string>({
      query: (id) => ({
        url: `/jobs/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Job'],
    }),
    assignJob: builder.mutation<
      { success: boolean; updatedCandidate: Candidate },
      { jobId: string; candidateId: string }
    >({
      query: (data) => ({
        url: '/jobs/open',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Job', 'Candidate'],
    }),
    bulkAssignJob: builder.mutation({
      query: (data: { jobId: string; candidateIds: string[] }) => ({
        url: '/jobs/bulk-move',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Candidate'],
    }),
   
  }),
});

export const {
  useFetchJobsQuery,
  useCreateJobMutation,
  useUpdateJobMutation,
  useFetchJobByIdQuery,
  useFetchJobLanesQuery,
  useUpdateJobStatusMutation,
  // useFetchAssignmentsQuery,
  useDeleteJobMutation,
  useFetchOpenJobsQuery,
  useFetchOpenJobQuery,
  useAssignJobMutation,
  useBulkAssignJobMutation,
} = jobApi;
