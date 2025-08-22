import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Candidate } from "@/types/candidate";
import { ICandidateHistory } from "@/lib/models/history";
import { OneOfMulOrganization } from "@/components/auth/OrganizationDialog";
import { OrgInfo } from "@/lib/models/user";
import { NextResponse } from "next/server";

interface AuthRequest {
  email: string;
  password: string;
  name?: string;
  confirmPassword?: string;
  orgId?: string;
}

interface ICandidate {
  id: string;
  name: string;
  email: string;
  role?: string;
  organizationInfo?: OrgInfo;
}
interface AuthResponse {
  message: string;
  user: ICandidate;
  _id?: string;
  organizations?: OneOfMulOrganization[];
}

export const candidateApi = createApi({
  reducerPath: "candidateApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Candidate", "CandidateApplication"],
  endpoints: (builder) => ({
    fetchCandidates: builder.query<Candidate[], string>({
      query: (jobId) => {
        // debugger
        return `/jobs/${jobId}/candidates`;
      },
      providesTags: ["Candidate"],
    }),
    fetchCandidateById: builder.query<Candidate, string>({
      query: (candidateId) => `/candidates/${candidateId}`,
      providesTags: ["Candidate"],
    }),
    createCandidate: builder.mutation<Candidate, Partial<Candidate>>({
      query: (newCandidate) => ({
        url: "/candidates",
        method: "POST",
        body: { ...newCandidate, dateTime: new Date().toISOString() },
      }),
      invalidatesTags: ["Candidate"],
    }),
    createGuestCandidate: builder.mutation<Candidate, Partial<Candidate>>({
      query: (newCandidate) => ({
        url: "/candidates/guest-apply",
        method: "POST",
        body: { ...newCandidate, dateTime: new Date().toISOString() },
      }),
      invalidatesTags: ["Candidate"],
    }),
    updateCandidate: builder.mutation<Candidate, Partial<Candidate>>({
      query: (candidate) => ({
        url: `/candidates/${candidate._id}`,
        method: "PUT",
        body: { ...candidate, dateTime: new Date().toISOString() },
      }),
      // invalidatesTags: ['Candidate'],
    }),
    updateCandidateStatus: builder.mutation<
      Candidate,
      { id: string; status: string }
    >({
      query: ({ id, status }) => ({
        url: `/candidates/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Candidate"],
    }),
    fetchAppliedApplication: builder.query({
      query: () => ({
        url: `/candidates/apply-application`,
        method: "GET",
      }),
      providesTags: ["CandidateApplication"],
    }),
    updateAppliedApplication: builder.mutation({
      query: ({ id }) => ({
        url: `/candidates/apply-application?jobid=` + id,
        method: "POST",
      }),
      invalidatesTags: ["CandidateApplication"],
    }),
    fetchAssignedCandidates: builder.query<Candidate[], void>({
      query: () => "/candidates/assignments",
      providesTags: ["Candidate"],
    }),
    filterCandidates: builder.query({
      query: (data) => ({
        url: `/candidates/filter?page=${data.page}&limit=${data.limit}`,
        method: "POST",
        body: data,
      }),
    }),
    updateCandidateHistory: builder.mutation<
      ICandidateHistory[],
      {
        jobId: string | { _id: string; title: string; description: string };
        candidateId: string;
        newEntry: ICandidateHistory;
      }
    >({
      query: ({ jobId, candidateId, newEntry }) => ({
        url: "/candidates/history",
        method: "PUT",
        body: {
          jobId,
          candidateId,
          newEntry,
          dateTime: new Date().toISOString(),
        },
      }),
      invalidatesTags: ["Candidate"],
    }),
    evaluateCandidate: builder.mutation<
      {
        message: string;
        candidate: Candidate;
        error?: string;
      },
      {
        candidateId: string;
      }
    >({
      query: ({ candidateId }) => ({
        url: "/candidates/evaluate",
        method: "PUT",
        body: { candidateId },
      }),
      invalidatesTags: ["Candidate"],
    }),
    deleteCandidate: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/candidates/${id}`,
        method: "DELETE",
        body: {
          dateTime: new Date().toISOString(),
        },
      }),
      invalidatesTags: ["Candidate"],
    }),
    candidateSignup: builder.mutation<AuthResponse, AuthRequest>({
      query: (credentials) => ({
        url: "/candidates/signup",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Candidate"],
    }),
    applicationEventMail: builder.mutation<
      NextResponse,
      {
        candidateId: string;
      }
    >({
      query: ({ candidateId }) => ({
        url: `/candidates/event-mail`,
        method: "POST",
        body: { candidateId },
      }),
      invalidatesTags: ["Candidate"],
    }),
  }),
});

export const {
  useFetchCandidatesQuery,
  useFetchCandidateByIdQuery,
  useLazyFetchCandidateByIdQuery,
  useCreateCandidateMutation,
  useCreateGuestCandidateMutation,
  useUpdateCandidateMutation,
  useEvaluateCandidateMutation,
  useUpdateCandidateStatusMutation,
  useFetchAssignedCandidatesQuery,
  useFetchAppliedApplicationQuery,
  useUpdateAppliedApplicationMutation,
  useUpdateCandidateHistoryMutation,
  useDeleteCandidateMutation,
  useFilterCandidatesQuery,
  useLazyFetchCandidatesQuery,
  useCandidateSignupMutation,
  useApplicationEventMailMutation,
} = candidateApi;
