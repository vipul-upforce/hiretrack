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

export interface CreateOrgResponse {
  message: string;
  organization: string;
  _id?: string;
}

export const orgApi = createApi({
  reducerPath: "orgApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    credentials: "include",
  }),
  tagTypes: ["Users"],
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
  }),
});

export const {
  useCreateAdminMutation,
  useCreateOrgMutation,
  useUpdateAdminMutation,
  useUpdateCustomFieldsMutation,
  useGetCustomFieldsQuery,
  useLazyGetCustomFieldsQuery,
} = orgApi;
// export const { useCreateAdminMutation } = orgApi;
