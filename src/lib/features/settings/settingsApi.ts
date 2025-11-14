import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { VersionListResponse } from "@/app/dashboard/settings/components/AutoUpdateSettings";

// Interface for test connection request
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

// Interface for test connection response
interface TestConnectionResponse {
  success: boolean;
  message: string;
}

interface AutoUpdateResponse {
  autoUpdate: boolean;
}

interface TriggerUpdateResponse {
  success: boolean;
  error?: string;
}

// Interface for LogEntry
export interface LogEntry {
  candidateId: string;
  jobId: string;
  candidateData: any;
  jobData: any;
  dateTime: string;
  assignmentBy: any[];
  currentInterviewer: {
    _id: string;
    name: string;
    email: string;
    role: string;
  }[];
  remark: any;
  previousInterviewer: {
    _id: string;
    name: string;
    email: string;
    role: string;
  }[];
  title: string;
  note: { description: string; date: string; rating: number; userId: string[] };
  attachments: any[];
}

// Interface for EmailHistoryRecord
export interface EmailHistoryRecord {
  _id: string;
  recipientName?: string;
  recipientEmail: string;
  subject?: string;
  sentByName?: string;
  sentByEmail: string;
  createdAt: string;
  status: "sent" | "failed" | "pending";
  body?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: { fileName: string; fileSize: number; shareUrl: string }[];
}

export const settingsApi = createApi({
  reducerPath: "settingsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
  }),
  tagTypes: [
    "Settings",
    "Backups",
    "NginxLogs",
    "ServerLogs",
    "EmailHistory",
    "Assets",
    "AutoUpdate",
    "SystemUpdate",
    "VersionList",
  ],
  endpoints: (builder) => ({
    getBackups: builder.query<any, void>({
      query: () => "/backups",
      providesTags: ["Backups"],
    }),
    takeSnapshot: builder.mutation<any, void>({
      query: () => ({
        url: "/db/take-snapshot",
        method: "GET",
      }),
      invalidatesTags: ["Backups"],
    }),
    deleteBackup: builder.mutation<any, string>({
      query: (fileName) => ({
        url: "/db/take-snapshot",
        method: "POST",
        body: { fileName },
      }),
      invalidatesTags: ["Backups"],
    }),
    getSMTPConfigs: builder.query({
      query: () => ({
        url: `/settings/smtp`,
        method: "GET",
      }),
    }),
    getMailTemplates: builder.query({
      query: () => ({
        url: `/settings/templates`,
        method: "GET",
      }),
    }),
    getGeminiConfigs: builder.query({
      query: () => ({
        url: `/settings/gemini`,
        method: "GET",
      }),
    }),
    getAIProvidersConfigs: builder.query({
      query: () => ({
        url: `/settings/ai-providers`,
        method: "GET",
      }),
    }),
    get2FAConfigs: builder.query({
      query: () => ({
        url: `/settings/twofa`,
        method: "GET",
      }),
    }),
    getCaptchaConfigs: builder.query({
      query: () => ({
        url: `/settings/captcha`,
        method: "GET",
      }),
    }),
    getTimeZone: builder.query({
      query: () => ({
        url: `/settings/timezone`,
        method: "GET",
      }),
    }),
    getMultipleOrgConfigs: builder.query({
      query: () => ({
        url: `/settings/multipleorg`,
        method: "GET",
      }),
    }),
    getFSConfigs: builder.query({
      query: () => ({
        url: `/settings/fs`,
        method: "GET",
      }),
    }),
    getGoogleCalendarConfig: builder.query({
      query: () => ({
        url: `/settings/google-calendar`,
        method: "GET",
      }),
      providesTags: ["Settings"],
    }),
    updateSMTPConfigs: builder.mutation({
      query: (mailConfig) => ({
        url: "/settings/smtp",
        method: "PUT",
        body: mailConfig,
      }),
      invalidatesTags: ["Settings"],
    }),
    fetchAssetsMetadata: builder.query({
      query: () => ({
        url: "/download/assets",
        method: "POST",
        body: {},
      }),
      providesTags: ["Assets"],
    }),
    updateMailTemplates: builder.mutation({
      query: (mailTemplates) => ({
        url: "/settings/templates",
        method: "PUT",
        body: mailTemplates,
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
    updateAIProviders: builder.mutation({
      query: (aiProvidersConfig) => ({
        url: "/settings/ai-providers",
        method: "PUT",
        body: aiProvidersConfig,
      }),
      invalidatesTags: ["Settings"],
    }),
    update2FA: builder.mutation({
      query: (twoFAConfig) => ({
        url: "/settings/twofa",
        method: "PUT",
        body: twoFAConfig,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateCaptcha: builder.mutation({
      query: (captchaConfig) => ({
        url: "/settings/captcha",
        method: "PUT",
        body: captchaConfig,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateTimeZone: builder.mutation({
      query: (timezone) => ({
        url: "/settings/timezone",
        method: "PUT",
        body: timezone,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateMultipleOrg: builder.mutation({
      query: (multipleOrgConfig) => ({
        url: "/settings/multipleorg",
        method: "PUT",
        body: multipleOrgConfig,
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
      query: (fsConfig) => ({
        url: "/settings/fs",
        method: "PUT",
        body: fsConfig,
      }),
      invalidatesTags: ["Settings"],
    }),
    getPortalConfigs: builder.query({
      query: () => ({
        url: `/settings/portal`,
        method: "get",
      }),
      providesTags: ["Settings"],
    }),
    updatePortalConfigs: builder.mutation({
      query: (portalConfigs) => ({
        url: "/settings/portal",
        method: "PUT",
        body: portalConfigs,
      }),
      invalidatesTags: ["Settings"],
    }),
    updateGoogleCalendar: builder.mutation({
      query: (googleCalendarConfig) => ({
        url: "/settings/google-calendar",
        method: "PUT",
        body: googleCalendarConfig,
      }),
      invalidatesTags: ["Settings"],
    }),
    disconnectGoogleCalendar: builder.mutation({
      query: () => ({
        url: "/settings/google-calendar",
        method: "DELETE",
      }),
      invalidatesTags: ["Settings"],
    }),
    createResetToken: builder.mutation({
      query: ({ email, selectedOrgId }) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body: { email, selectedOrgId },
      }),
    }),
    getNginxLogFiles: builder.query<{ files: string[] }, void>({
      query: () => "/nginx-logs",
      providesTags: ["NginxLogs"],
      transformResponse: (response: { files: string[] }) => ({
        files: response.files || [],
      }),
      keepUnusedDataFor: 300,
    }),
    getServerLogs: builder.query<
      { logs: LogEntry[]; offset: number; totalLines: number },
      { offset: number; limit: number; query?: string }
    >({
      query: ({ offset, limit, query = "" }) => {
        const params = new URLSearchParams({
          offset: offset.toString(),
          limit: limit.toString(),
          query,
        });
        return `/logs?${params.toString()}`;
      },
      keepUnusedDataFor: 300,
    }),
    getNginxFileContent: builder.query<
      { content: string[]; offset: number; totalLines: number },
      { file: string; offset: number; limit: number; query?: string }
    >({
      query: ({ file, offset, limit, query = "" }) => {
        const params = new URLSearchParams({
          offset: offset.toString(),
          limit: limit.toString(),
          query,
        });
        return `/nginx-logs/${file}?${params.toString()}`;
      },
      keepUnusedDataFor: 300,
    }),

    getEmailHistory: builder.query<
      { emails: EmailHistoryRecord[]; pagination: { total: number } },
      { page: number; limit: number; search?: string; status?: string }
    >({
      query: ({ page, limit, search = "", status = "" }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(search && { search }),
          ...(status && status !== "all" && { status }),
        });
        return `/email-history?${params.toString()}`;
      },
      providesTags: ["EmailHistory"],
    }),
    getAutoUpdate: builder.query<AutoUpdateResponse, void>({
      query: () => `/settings/auto-update`,
      providesTags: ["AutoUpdate"],
    }),

    toggleAutoUpdate: builder.mutation<AutoUpdateResponse, void>({
      query: () => ({
        url: `/settings/auto-update`,
        method: "POST",
      }),
      invalidatesTags: ["AutoUpdate"],
    }),

    getVersionList: builder.query<VersionListResponse, void>({
      query: () => `/version/list`,
      providesTags: ["VersionList"],
    }),

    triggerUpdate: builder.mutation<TriggerUpdateResponse, void>({
      query: () => ({
        url: `/system/update`,
        method: "POST",
      }),
      invalidatesTags: ["SystemUpdate", "VersionList"],
    }),
  }),
});

export const {
  useGetBackupsQuery,
  useTakeSnapshotMutation,
  useDeleteBackupMutation,
  useFetchAssetsMetadataQuery,
  useGetSMTPConfigsQuery,
  useUpdateSMTPConfigsMutation,
  useGetFSConfigsQuery,
  useUpdateFSConfigsMutation,
  useCreateResetTokenMutation,
  useGetPortalConfigsQuery,
  useUpdatePortalConfigsMutation,
  useTestConnectionMutation,
  useGetGeminiConfigsQuery,
  useGetAIProvidersConfigsQuery,
  useGet2FAConfigsQuery,
  useUpdateGeminiMutation,
  useUpdateAIProvidersMutation,
  useGetTimeZoneQuery,
  useUpdate2FAMutation,
  useUpdateTimeZoneMutation,
  useUpdateMultipleOrgMutation,
  useGetMultipleOrgConfigsQuery,
  useGetMailTemplatesQuery,
  useUpdateMailTemplatesMutation,
  useGetGoogleCalendarConfigQuery,
  useUpdateGoogleCalendarMutation,
  useDisconnectGoogleCalendarMutation,
  useUpdateCaptchaMutation,
  useGetCaptchaConfigsQuery,
  useLazyGetServerLogsQuery,
  useLazyGetNginxFileContentQuery,
  useGetNginxLogFilesQuery,
  useGetServerLogsQuery,
  useGetNginxFileContentQuery,
  useGetEmailHistoryQuery,
  useGetAutoUpdateQuery,
  useToggleAutoUpdateMutation,
  useLazyGetVersionListQuery,
  useGetVersionListQuery,
  useTriggerUpdateMutation,
} = settingsApi;

export type { TestConnectionRequest, TestConnectionResponse };
