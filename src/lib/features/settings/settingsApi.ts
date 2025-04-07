import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Add interface for test connection request
interface TestConnectionRequest {
  storageType: "cloudinary" | "s3" | "smtp" | "resend";
  credentials: {
    cloud_name?: string;
    api_key?: string;
    api_secret?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    user?: string;
    pass?: string;
  };
}

// Add interface for test connection response
interface TestConnectionResponse {
  success: boolean;
  message: string;
}

export const settingsApi = createApi({
  reducerPath: "settingsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
  }),
  tagTypes: ["Settings"],
  endpoints: (builder) => ({
    getSMTPConfigs: builder.query({
      query: () => ({
        url: `/settings/smtp`,
        method: "GET",
      }),
    }),
    getGeminiConfigs: builder.query({
      query: () => ({
        url: `/settings/gemini`,
        method: "GET",
      }),
    }),
    getFSConfigs: builder.query({
      query: () => ({
        url: `/settings/fs`,
        method: "GET",
      }),
    }),
    updateSMTPConfigs: builder.mutation({
      query: (mailConfig) => ({
        url: "/settings/smtp",
        method: "PUT",
        body: mailConfig,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateGemini: builder.mutation({
      query: (genimiConfig) => ({
        url: "/settings/gemini",
        method: "PUT",
        body: genimiConfig,
      }),
      invalidatesTags: ["Settings"],
    }),
    testConnection: builder.mutation<
      TestConnectionResponse,
      TestConnectionRequest
    >({
      query: (body) => ({
        url: "/test-connection",
        method: "POST",
        body,
      }),
    }),
    updateFSConfigs: builder.mutation({
      query: (fsConfig) => {
        return {
          url: "/settings/fs",
          method: "PUT",
          body: fsConfig,
        };
      },
      invalidatesTags: ["Settings"],
    }),
    getPortalConfigs: builder.query({
      query: () => ({
        url: `/settings/portal`,
        method: "get",
      }),
    }),
    updatePortalConfigs: builder.mutation({
      query: (portalConfigs) => {
        return {
          url: "/settings/portal",
          method: "PUT",
          body: portalConfigs,
        };
      },
    }),
    createResetToken: builder.mutation({
      query: ({ email, selectedOrgId }) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body: { email, selectedOrgId },
      }),
    }),
  }),
});

export const {
  useGetSMTPConfigsQuery,
  useUpdateSMTPConfigsMutation,
  useGetFSConfigsQuery,
  useUpdateFSConfigsMutation,
  useCreateResetTokenMutation,
  useGetPortalConfigsQuery,
  useUpdatePortalConfigsMutation,
  useTestConnectionMutation,
  useGetGeminiConfigsQuery,
  useUpdateGeminiMutation,
} = settingsApi;

// Export types for use in components
export type { TestConnectionRequest, TestConnectionResponse };
