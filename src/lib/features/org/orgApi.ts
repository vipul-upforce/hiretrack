import { ITag } from "@/lib/models/organization";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

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
}

export interface CreateOrgResponse {
  message: string;
  organization: string;
  _id?: string;
}

// Define the Batch and ProcessedItem types
export interface ProcessedItem {
  filename: string;
  candidateId: string;
  status: "success" | "failure";
  message: string;
  processedAt: string;
  _id: string;
}

export interface Batch {
  _id: string;
  organizationId: string;
  totalFiles: number;
  successCount: number;
  failureCount: number;
  status: "pending" | "processing" | "completed" | "failed";
  items: ProcessedItem[];
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const orgApi = createApi({
  reducerPath: "orgApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    credentials: "include",
  }),
  tagTypes: ["Users", "Batches", "Tags"], // Add Batches to tagTypes
  endpoints: (builder) => ({
    createAdmin: builder.mutation<CreateAdminResponse, CreateAdminRequest>({
      query: (credentials) => ({
        url: "/auth/signup",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Users"],
    }),
    updateAdmin: builder.mutation<UpdateAdminResponse, UpdateAdminRequest>({
      query: (data) => ({
        url: "/users",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Users"],
    }),
    createOrg: builder.mutation<CreateOrgResponse, CreateOrgRequest>({
      query: (data) => ({
        url: "/organization",
        method: "POST",
        body: data,
      }),
    }),
    updateCustomFields: builder.mutation({
      query: (data) => ({
        url: "/organization/cs",
        method: "POST",
        body: data,
      }),
    }),
    getCustomFields: builder.query({
      query: (orgId) => ({
        url: `/organization/cs/${orgId}`,
        method: "GET",
      }),
    }),
    getCustomFieldsByOrgName: builder.query({
      query: (orgName) => ({
        url: orgName ? `/organization/cf/${orgName}` : "/organization/cf",
        method: "GET",
      }),
    }),
    sendMail: builder.mutation<{ message: string }, IScheduledMailRequest>({
      query: (data) => ({
        url: `/event-mail`,
        method: "POST",
        body: data,
      }),
    }),
    sendStatusMail: builder.mutation<
      { message: string },
      IScheduledStatusMailRequest
    >({
      query: (data) => ({
        url: `/status-mail`,
        method: "POST",
        body: data,
      }),
    }),
    sendUnassignMail: builder.mutation<{ message: string }, any>({
      query: (data) => ({
        url: `/event-mail`,
        method: "PUT",
        body: data,
      }),
    }),
    // New endpoint to fetch batches
    fetchBatches: builder.query<Batch[], string>({
      query: (organizationId) => `/process-cv?organizationId=${organizationId}`,
      providesTags: ["Batches"], // Tag for refetching
    }),
    // New endpoint to post a batch
    postBatch: builder.mutation<
      Batch,
      { formData: FormData; organizationId: string }
    >({
      query: ({ formData, organizationId }) => ({
        url: `/process-cv?organizationId=${organizationId}`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Batches"], // Invalidate Batches tag to refetch
    }),
    fetchOrgTags: builder.query<{ tags: ITag[] }, { organizationId: string }>({
      query: ({ organizationId }) => ({
        url: `/organization/tags?organizationId=${organizationId}`,
        method: "GET",
      }),
      providesTags: ["Tags"],
    }),
    updateOrgTags: builder.mutation<
      { tags: ITag[] },
      { tags: ITag[]; organizationId: string }
    >({
      query: ({ tags, organizationId }) => ({
        url: `/organization/tags?organizationId=${organizationId}`,
        method: "PUT",
        body: tags,
      }),
      invalidatesTags: ["Tags"],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useCreateAdminMutation,
  useSendMailMutation,
  useSendStatusMailMutation,
  useSendUnassignMailMutation,
  useCreateOrgMutation,
  useUpdateAdminMutation,
  useUpdateCustomFieldsMutation,
  useGetCustomFieldsQuery,
  useLazyGetCustomFieldsQuery,
  useLazyGetCustomFieldsByOrgNameQuery,
  useFetchBatchesQuery, // Hook for fetching batches
  usePostBatchMutation, // Hook for posting a batch,,
  useFetchOrgTagsQuery,
  useUpdateOrgTagsMutation,
} = orgApi;
// export const { useCreateAdminMutation } = orgApi;
