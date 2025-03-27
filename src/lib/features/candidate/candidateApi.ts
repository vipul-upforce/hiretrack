import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Candidate } from '@/types/candidate';
import { ICandidateHistory } from '@/lib/models/history';

export const candidateApi = createApi({
  reducerPath: 'candidateApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Candidate'],
  endpoints: (builder) => ({
    fetchCandidates: builder.query<Candidate[], string>({
      query: (jobId) => `/jobs/${jobId}/candidates`,
      providesTags: ['Candidate'],
    }),
    createCandidate: builder.mutation<Candidate, Partial<Candidate>>({
      query: (newCandidate) => ({
        url: '/candidates',
        method: 'POST',
        body: newCandidate,
      }),
      invalidatesTags: ['Candidate'],
    }),
    updateCandidate: builder.mutation<Candidate, Partial<Candidate>>({
      query: (candidate) => ({
        url: `/candidates/${candidate._id}`,
        method: 'PUT',
        body: candidate,
      }),
      // invalidatesTags: ['Candidate'],
    }),
    updateCandidateStatus: builder.mutation<Candidate, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/candidates/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Candidate'],
    }),
    fetchAssignedCandidates: builder.query<Candidate[], void>({
      query: () => '/candidates/assignments',
      providesTags: ['Candidate'],
    }),
    // fetchCandidateHistory: builder.mutation<ICandidateHistory[], { jobId: string; candidateId: string}>({
    //   query: ({jobId, candidateId}) => ({
    //     url: '/candidates/history',
    //     method: 'POST',
    //     body: {jobId, candidateId},
    //   }),
    //   invalidatesTags: ['Candidate'],
    // }),
    filterCandidates: builder.mutation({
      query: (data) => ({
        url: '/candidates/filter',
        method: 'POST',
        body: data,
      }),
    }),
    updateCandidateHistory: builder.mutation<ICandidateHistory[], { jobId: string |  { _id: string; title: string; description: string; }; candidateId: string, newEntry: ICandidateHistory}>({
      query: ({jobId, candidateId, newEntry}) => ({
        url: '/candidates/history',
        method: 'PUT',
        body: {jobId, candidateId, newEntry},
      }),
      invalidatesTags: ['Candidate'],
    }),
    deleteCandidate: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/candidates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Candidate'],
    }),
  }),
});

export const {
  useFetchCandidatesQuery,
  useCreateCandidateMutation,
  useUpdateCandidateMutation,
  useUpdateCandidateStatusMutation,
  useFetchAssignedCandidatesQuery,
  // useFetchCandidateHistoryMutation,
  useUpdateCandidateHistoryMutation,
  useDeleteCandidateMutation,
  useFilterCandidatesMutation,
  useLazyFetchCandidatesQuery
} = candidateApi; 