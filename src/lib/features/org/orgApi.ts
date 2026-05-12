import { ITag } from '@/lib/models/organization';
import { baseApi } from '@/lib/api/baseApi';

export interface CreateAdminRequest {
  email: string;
  password: string;
  name?: string;
  confirmPassword?: string;
}
export interface UpdateAdminRequest {
  adminId: string;
  organizationId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  _id?: string;
  organizationId: string;
}

export interface CreateAdminResponse {
  message: string;
  user: User;
  _id?: string;
}
export interface UpdateAdminResponse {
  message: string;
  user: User;
  _id?: string;
}

export interface CreateOrgRequest {
  name: string;
  lanes: string[];
  adminData: { email: string; name: string; password: string; role: string };
}

export interface IScheduledMailRequest {
  id: string;
  email: string;
  eventTitle: string;
  startTime: string;
  endTime: string;
  jobName: string;
  interviewerName: string;
  candidateName: string;
  status: string;
  jobId?: string;
  eventId?: string;
  // remark?: string;
  // rating?: number;
}
export interface IScheduledStatusMailRequest {
  id: string;
  eventTitle: string;
  candidateName: string;
  prev_status: string;
  status: string;
  remark?: string;
  rating?: string;
  jobName?: string;
  startTime?: string;
  endTime?: string;
  jobId?: string;
}
export interface OrgAllowanceResponse {
  allow: boolean;
  data?: { organizationId: string }[];
}

export interface CreateOrgResponse {
  message: string;
  organization: string;
  logout?: boolean;
  _id?: string;
}

// Define the Batch and ProcessedItem types
export interface ProcessedItem {
  filename: string;
  candidateId?: string;
  status: 'success' | 'failure' | 'failed' | 'pending';
  message?: string;
  error?: string;
  processedAt: string;
  _id: string;
}

export interface PendingBatchItem {
  filename: string;
  status: 'pending' | 'processed' | 'failed';
  selected: boolean;
  error?: string;
  file: {
    id?: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
}

export interface Batch {
  _id: string;
  organizationId: string;
  totalFiles: number;
  successCount: number;
  failureCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processingMode?: 'immediate' | 'deferred';
  items: ProcessedItem[];
  pendingItems?: PendingBatchItem[];
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const orgApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createAdmin: builder.mutation<CreateAdminResponse, CreateAdminRequest>({
      query: (credentials) => ({
        url: '/auth/signup',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Users'],
    }),
    updateAdmin: builder.mutation<UpdateAdminResponse, UpdateAdminRequest>({
      query: (data) => ({
        url: '/users',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Users'],
    }),
    createOrg: builder.mutation<CreateOrgResponse, CreateOrgRequest>({
      query: (data) => ({
        url: '/organization',
        method: 'POST',
        body: data,
      }),
    }),
    fetchOrg: builder.query({
      query: () => ({
        url: '/organization',
        method: 'GET',
      }),
    }),
    updateCustomFields: builder.mutation({
      query: (data) => ({
        url: '/organization/cs',
        method: 'POST',
        body: data,
      }),
    }),
    getCustomFields: builder.query({
      query: (orgId) => ({
        url: `/organization/cs/${orgId}`,
        method: 'GET',
      }),
    }),
    getCustomFieldsByOrgName: builder.query({
      query: (orgName) => ({
        url: orgName ? `/organization/cf/${orgName}` : '/organization/cf',
        method: 'GET',
      }),
    }),
    sendMail: builder.mutation<{ message: string }, IScheduledMailRequest>({
      query: (data) => ({
        url: '/event-mail',
        method: 'POST',
        body: data,
      }),
    }),
    sendStatusMail: builder.mutation<
      { message: string },
      IScheduledStatusMailRequest
    >({
      query: (data) => ({
        url: '/status-mail',
        method: 'POST',
        body: data,
      }),
    }),
    sendUnassignMail: builder.mutation<
      { message: string },
      Record<string, unknown>
    >({
      query: (data) => ({
        url: '/event-mail',
        method: 'PUT',
        body: data,
      }),
    }),
    getOrganizationAllowance: builder.query<
      OrgAllowanceResponse,
      { limit?: number } | void
    >({
      query: (params) => ({
        url: params?.limit
          ? `/organization?limit=${params.limit}`
          : '/organization',
        method: 'GET',
      }),
    }),
    checkOrg: builder.query<{ exists: boolean }, string>({
      query: (organizationId) => ({
        url: `/checkorg?organizationId=${organizationId}`,
        method: 'GET',
      }),
    }),
    // New endpoint to fetch batches
    fetchBatches: builder.query<Batch[], string>({
      query: (organizationId) => ({
        url: `/process-cv?organizationId=${organizationId}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, organizationId) => [
        { type: 'Batches' as const, id: organizationId },
      ],
    }),
    // New endpoint to post a batch (response shape varies: immediate summary vs deferred { batch, summary })
    postBatch: builder.mutation<
      unknown,
      { formData: FormData; organizationId: string }
    >({
      query: ({ formData, organizationId }) => ({
        url: `/process-cv?organizationId=${organizationId}`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: 'Batches', id: organizationId },
      ],
    }),
    processPendingCvBatches: builder.mutation<
      { message: string; processedBatches: number },
      { organizationId: string; batchId?: string }
    >({
      query: ({ organizationId, batchId }) => ({
        url: `/process-cv/process-pending?organizationId=${organizationId}${batchId ? `&batchId=${batchId}` : ''}`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: 'Batches', id: organizationId },
      ],
    }),
    retryFailedCvFiles: builder.mutation<
      { message: string; retried: number; processed: number; failed: number },
      { organizationId: string; batchId: string; filename?: string }
    >({
      query: ({ organizationId, batchId, filename }) => ({
        url: `/process-cv/retry-failed?organizationId=${organizationId}&batchId=${batchId}${filename ? `&filename=${encodeURIComponent(filename)}` : ''}`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: 'Batches', id: organizationId },
      ],
    }),
    fetchOrgTags: builder.query<{ tags: ITag[] }, { organizationId: string }>({
      query: ({ organizationId }) => ({
        url: `/organization/tags?organizationId=${organizationId}`,
        method: 'GET',
      }),
      providesTags: ['Tags'],
    }),
    updateOrgTags: builder.mutation<
      { tags: ITag[] },
      { tags: ITag[]; organizationId: string }
    >({
      query: ({ tags, organizationId }) => ({
        url: `/organization/tags?organizationId=${organizationId}`,
        method: 'PUT',
        body: tags,
      }),
      invalidatesTags: ['Tags'],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useCreateAdminMutation,
  useSendMailMutation,
  useSendStatusMailMutation,
  useFetchOrgQuery,
  useSendUnassignMailMutation,
  useCreateOrgMutation,
  useUpdateAdminMutation,
  useUpdateCustomFieldsMutation,
  useGetCustomFieldsQuery,
  useLazyGetCustomFieldsQuery,
  useLazyGetCustomFieldsByOrgNameQuery,
  useFetchBatchesQuery,
  usePostBatchMutation,
  useProcessPendingCvBatchesMutation,
  useRetryFailedCvFilesMutation,
  useFetchOrgTagsQuery,
  useUpdateOrgTagsMutation,
  useGetOrganizationAllowanceQuery,
  useLazyGetOrganizationAllowanceQuery,
  useCheckOrgQuery,
} = orgApi;
