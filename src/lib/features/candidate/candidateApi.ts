/* eslint-disable max-lines */
import { baseApi } from '@/lib/api/baseApi';
import { Candidate } from '@/types/candidate';
import { ICandidateHistory } from '@/lib/models/history';
import { OneOfMulOrganization } from '@/components/auth/OrganizationDialog';
import { OrgInfo } from '@/lib/models/user';
import { NextResponse } from 'next/server';

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

export interface EmailAttachment {
  fileName: string;
  fileSize: number;
  shareId: string;
  shareUrl: string;
}

/**
 * An entry representing the assignment count for a specific interviewer.
 */
export interface InterviewerAssignmentCountEntry {
  interviewerId: string; // User _id as string
  name: string;
  email: string;
  count: number;
}

export interface SendEmailToCandidateRequest {
  candidateId: string;
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailToCandidateResponse {
  success: boolean;
  message: string;
  emailHistoryId?: string;
}

export interface UpdateRemarkRequest {
  id: string;
  description: string;
  rating?: number | null;
  isPrivate?: boolean;
}

export interface ShareCandidateRequest {
  candidateId: string;
  selection: Record<string, boolean>;
}

interface DuplicateEntry {
  candidateId: string;
  name: string;
  email: string;
  expectedCTC?: number;
  currentCTC?: number;
  experience?: number;
  relevantExperience?: number;
  jobId?: string;
  jobTitle?: string;
  appliedDate?: string;
  isDeleted?: boolean;
}

export const candidateApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    fetchCandidates: builder.query<Candidate[], string>({
      query: (jobId) => `/jobs/${jobId}/candidates`,
      providesTags: ['Candidate'],
    }),
    fetchCandidateById: builder.query<Candidate, string>({
      query: (candidateId) => `/candidates/${candidateId}`,
      providesTags: ['Candidate'],
    }),
    fetchAssignments: builder.query<
      [
        {
          data: Candidate[];
          totalInterviews: number;
          todaysInterviews: number;
          thisweeksInterviews: number;
          assignmentCount: InterviewerAssignmentCountEntry[];
        },
      ],
      {
        isPagination?: boolean;
        page?: number;
        limit?: number;
        filterValue?: string;
        assignedTo?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        /** Extra offset to add to skip, used to compensate for SSE-added items */
        sseOffset?: number;
      }
    >({
      query: ({
        isPagination = true,
        page = 1,
        limit = 10,
        filterValue = '',
        assignedTo = '',
        sortBy = 'assignment.time',
        sortOrder = 'asc',
        sseOffset = 0,
      }) => {
        const params = new URLSearchParams({
          isPagination: String(isPagination),
          page: String(page),
          limit: String(limit),
          filterValue,
          assignedTo,
          sortBy,
          sortOrder,
          sseOffset: String(sseOffset),
        });
        return `/candidates/assignments?${params.toString()}`;
      },
      providesTags: ['Candidate'],
    }),
    refetchCandidate: builder.mutation<Candidate, string>({
      query: (candidateId) => ({
        url: `/candidates/${candidateId}`,
        method: 'GET',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Candidate', id }],
    }),
    fetchCandidateHistory: builder.query<
      { history: ICandidateHistory[] },
      string
    >({
      query: (candidateId) => `/candidates/${candidateId}/history`,
      providesTags: (_result, _error, id) => [{ type: 'Candidate', id }],
    }),
    fetchCandidateDetails: builder.query<
      {
        _id: string;
        resume: Candidate['resume'];
        attachments: Candidate['attachments'];
        remarks: Candidate['remarks'];
      },
      string
    >({
      query: (candidateId) => `/candidates/${candidateId}/details`,
      providesTags: (_result, _error, id) => [{ type: 'Candidate', id }],
    }),
    createCandidate: builder.mutation<Candidate, Partial<Candidate>>({
      query: (body) => ({
        url: '/candidates',
        method: 'POST',
        body: { ...body, dateTime: new Date().toISOString() },
      }),
      invalidatesTags: ['Candidate'],
    }),
    createGuestCandidate: builder.mutation<Candidate, Partial<Candidate>>({
      query: (newCandidate) => ({
        url: '/candidates/guest-apply',
        method: 'POST',
        body: { ...newCandidate, dateTime: new Date().toISOString() },
      }),
      invalidatesTags: ['Candidate'],
    }),
    updateCandidate: builder.mutation<Candidate, Partial<Candidate>>({
      query: (body) => ({
        url: `/candidates/${body._id}`,
        method: 'PUT',
        body: { ...body, dateTime: new Date().toISOString() },
      }),
      invalidatesTags: ['Candidate'],
    }),
    updateCandidateStatus: builder.mutation<
      Candidate,
      { id: string; status: string }
    >({
      query: ({ id, status }) => ({
        url: `/candidates/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Candidate'],
    }),
    fetchAppliedApplication: builder.query({
      query: () => ({
        url: '/candidates/apply-application',
        method: 'GET',
      }),
      providesTags: ['CandidateApplication'],
    }),
    updateAppliedApplication: builder.mutation({
      query: ({ id }) => ({
        url: `/candidates/apply-application?jobid=${id}`,
        method: 'POST',
      }),
      invalidatesTags: ['CandidateApplication'],
    }),

    /**
     * Fetches assigned candidates along with assignment statistics and interviewer mapping.
     * Supports date range filtering for calendar views.
     *
     * The returned data structure:
     * {
     *   data: CandidateAssignmentWithExtras[];
     *   totalInterviews: number;
     *   todaysInterviews: number;
     *   thisweeksInterviews: number;
     *   assignmentCount: InterviewerAssignmentCountEntry[];
     *   dateRange?: { startDate: string; endDate: string; view: string };
     * }
     */
    fetchAssignedCandidates: builder.query<
      [
        {
          data: Candidate[];
          totalInterviews: number;
          todaysInterviews: number;
          thisweeksInterviews: number;
          assignmentCount: InterviewerAssignmentCountEntry[];
          dateRange?: {
            startDate: string;
            endDate: string;
            view: string;
          };
        },
      ],
      {
        startDate?: string;
        endDate?: string;
        view?: 'month' | 'week' | 'day' | 'agenda';
        filterValue?: string;
      } | void
    >({
      query: (params) => {
        if (!params) return '/candidates/assignments';
        const { startDate, endDate, view, filterValue } = params;
        const searchParams = new URLSearchParams();
        if (startDate) searchParams.set('startDate', startDate);
        if (endDate) searchParams.set('endDate', endDate);
        if (view) searchParams.set('view', view);
        if (filterValue) searchParams.set('filterValue', filterValue);
        const queryString = searchParams.toString();
        return queryString
          ? `/candidates/assignments?${queryString}`
          : '/candidates/assignments';
      },
      providesTags: ['Candidate'],
    }),
    filterCandidates: builder.query({
      query: (data) => ({
        url: `/candidates/filter?page=${data.page}&limit=${data.limit}`,
        method: 'POST',
        body: data,
      }),
    }),
    updateCandidateHistory: builder.mutation<
      ICandidateHistory[],
      {
        jobId:
          | string
          | null
          | { _id: string; title: string; description: string };
        candidateId: string;
        newEntry: ICandidateHistory;
      }
    >({
      query: ({ jobId, candidateId, newEntry }) => ({
        url: '/candidates/history',
        method: 'PUT',
        body: {
          jobId,
          candidateId,
          newEntry,
          dateTime: new Date().toISOString(),
        },
      }),
      invalidatesTags: ['Candidate'],
    }),
    updateCandidateRemark: builder.mutation<void, UpdateRemarkRequest>({
      query: (data) => ({
        url: '/candidates/history',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Candidate'],
    }),
    generateCandidatePdf: builder.mutation<Blob, ShareCandidateRequest>({
      query: (data) => ({
        url: '/candidates/share-pdf',
        method: 'POST',
        body: data,
        responseHandler: (response) => response.blob(),
      }),
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
        url: '/candidates/evaluate',
        method: 'PUT',
        body: { candidateId },
      }),
      invalidatesTags: ['Candidate'],
    }),
    deleteCandidate: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/candidates/${id}`,
        method: 'DELETE',
        body: {
          dateTime: new Date().toISOString(),
        },
      }),
      invalidatesTags: ['Candidate'],
    }),
    candidateSignup: builder.mutation<AuthResponse, AuthRequest>({
      query: (credentials) => ({
        url: '/candidates/signup',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Candidate'],
    }),
    applicationEventMail: builder.mutation<
      NextResponse,
      {
        candidateId: string;
      }
    >({
      query: ({ candidateId }) => ({
        url: '/candidates/event-mail',
        method: 'POST',
        body: { candidateId },
      }),
      invalidatesTags: ['Candidate'],
    }),
    bulkArchiveCandidates: builder.mutation<
      {
        success: boolean;
        message: string;
        updatedCount: number;
        skippedCount: number;
        failedCount: number;
      },
      {
        candidateIds: string[];
        action: 'archive' | 'unarchive';
      }
    >({
      query: ({ candidateIds, action }) => ({
        url: '/candidates/bulk-archive',
        method: 'POST',
        body: { candidateIds, action },
      }),
      invalidatesTags: ['Candidate'],
    }),
    bulkAssignCandidates: builder.mutation<
      {
        success: boolean;
        message: string;
        updatedCount: number;
        failedCount: number;
      },
      {
        candidateIds: string[];
        interviewerId: string;
        time?: string;
      }
    >({
      query: (body) => ({
        url: '/candidates/bulk-assign',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Candidate'],
    }),
    bulkUnassignCandidates: builder.mutation<
      {
        success: boolean;
        message: string;
        updatedCount: number;
        skippedCount: number;
        failedCount: number;
      },
      { candidateIds: string[] }
    >({
      query: (body) => ({
        url: '/candidates/bulk-unassign',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Candidate'],
    }),
    /** Unified bulk update: assign, unassign, archive, moveJob, addRemark, addFollowUp, statusUpdate
     * Supports both single operation (backward compatible) and multiple operations array
     */
    bulkUpdateCandidates: builder.mutation<
      {
        success: boolean;
        message: string;
        updatedCount: number;
        failedCount: number;
        skippedCount?: number;
      },
      | import('@/app/api/candidates/bulk-update/types').BulkUpdateParams
      | import('@/app/api/candidates/bulk-update/types').BulkUpdateRequest
    >({
      query: (body) => ({
        url: '/candidates/bulk-update',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Candidate'],
    }),
    sendEmailToCandidate: builder.mutation<
      SendEmailToCandidateResponse,
      SendEmailToCandidateRequest
    >({
      query: (emailData) => ({
        url: '/candidates/email',
        method: 'POST',
        body: emailData,
      }),
      invalidatesTags: (_result, _error, { candidateId }) => [
        { type: 'Candidate', id: candidateId },
        'EmailHistory',
      ],
    }),

    getDuplicateCandidates: builder.query<
      DuplicateEntry[],
      { id: string; email: string; organizationId: string }
    >({
      query: ({ id, email, organizationId }) =>
        `/candidates/${id}/duplicates?email=${email}&organizationId=${organizationId}`,
    }),

    uploadFiles: builder.mutation<
      {
        success: boolean;
        files: Array<{
          id: string;
          name: string;
          url: string;
          type: string;
          size: number;
        }>;
        customFields?: Record<
          string,
          Array<{
            id: string;
            name: string;
            url: string;
            type: string;
            size: number;
          }>
        >;
      },
      { formData: FormData; organizationId?: string; jobId?: string }
    >({
      query: ({ formData, organizationId, jobId }) => {
        const params = new URLSearchParams();
        if (organizationId) {
          params.append('organizationId', organizationId);
        } else if (jobId) {
          params.append('jobId', jobId);
        }
        const queryString = params.toString();
        console.log('queryString', queryString);
        console.log('formData', formData);
        return {
          url: `/files/upload${queryString ? `?${queryString}` : ''}`,
          method: 'POST',
          body: formData,
        };
      },
    }),
  }),
});

export const {
  useFetchCandidatesQuery,
  useFetchCandidateByIdQuery,
  useFetchAssignmentsQuery,
  useLazyFetchAssignmentsQuery,
  useLazyFetchCandidateByIdQuery,
  useCreateCandidateMutation,
  useCreateGuestCandidateMutation,
  useUpdateCandidateMutation,
  useEvaluateCandidateMutation,
  useUpdateCandidateStatusMutation,
  useFetchAssignedCandidatesQuery,
  useLazyFetchAssignedCandidatesQuery,
  useFetchAppliedApplicationQuery,
  useUpdateAppliedApplicationMutation,
  useUpdateCandidateHistoryMutation,
  useDeleteCandidateMutation,
  useFilterCandidatesQuery,
  useLazyFetchCandidatesQuery,
  useRefetchCandidateMutation,
  useCandidateSignupMutation,
  useApplicationEventMailMutation,
  useBulkArchiveCandidatesMutation,
  useBulkAssignCandidatesMutation,
  useBulkUnassignCandidatesMutation,
  useBulkUpdateCandidatesMutation,
  useLazyFetchCandidateHistoryQuery,
  useLazyFetchCandidateDetailsQuery,
  useUpdateCandidateRemarkMutation,
  useSendEmailToCandidateMutation,
  useGenerateCandidatePdfMutation,
  useGetDuplicateCandidatesQuery,
  useUploadFilesMutation,
} = candidateApi;
