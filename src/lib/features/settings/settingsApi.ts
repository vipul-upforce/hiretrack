import { baseApi } from '@/lib/api/baseApi';
import { VersionListResponse } from '@/app/dashboard/settings/components/about/types';

// Interface for test connection request
interface TestConnectionRequest {
  storageType: 'cloudinary' | 's3' | 'smtp' | 'resend';
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

export interface DiskFolderItem {
  name: string;
  relativePath: string;
  size: string;
  rawSize: number;
  type: 'file' | 'folder';
  childrenCount?: number;
}

export interface DiskFolder {
  name: string;
  path: string;
  size: string;
  type: 'folder';
}

export interface DiskStats {
  total: string;
  free: string;
  used: string;
  percentUsed: string;
  raw: {
    total: number;
    free: number;
    used: number;
  };
}

export interface DiskSpaceResponse {
  success: boolean;
  diskStats?: DiskStats;
  folders: DiskFolder[];
}

export interface DiskFolderDetailResponse {
  success: boolean;
  root: string;
  currentPath: string;
  files: DiskFolderItem[];
}

// Interface for test connection response
interface TestConnectionResponse {
  success: boolean;
  message: string;
  data?: any;
  details?: any;
  error?: any;
  connectionStatusUpdated?: boolean;
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

type SystemLogsResponse = {
  path: string;
  files: string[];
  sizeBytes: number;
  size: string;
};

// Interface for EmailHistoryRecord
export interface EmailHistoryRecord {
  _id: string;
  recipientName?: string;
  recipientEmail: string;
  subject?: string;
  sentByName?: string;
  sentByEmail: string;
  createdAt: string;
  status: 'sent' | 'failed' | 'pending';
  body?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: { fileName: string; fileSize: number; shareUrl: string }[];
}

export interface EvaluationConfigItem {
  temperature: number;
  customPrompt?: string | null;
  autoEvaluateAllCandidates: boolean;
  maxPdfPages: number;
  enableConfidenceScores: boolean;
  enableRedFlagsDetection: boolean;
  enableSkillsMatrix: boolean;
  enableComparativeRanking: boolean;
}

export interface GetEvaluationConfigsResponse {
  evaluationConfig: EvaluationConfigItem;
}

export interface UpdateEvaluationConfigsRequest {
  temperature: number;
  customPrompt: string | null;
  autoEvaluateAllCandidates: boolean;
  maxPdfPages: number;
  enableConfidenceScores: boolean;
  enableRedFlagsDetection: boolean;
  enableSkillsMatrix: boolean;
  enableComparativeRanking: boolean;
}

export interface UpdateEvaluationConfigsResponse {
  success: boolean;
  message?: string;
  evaluationConfig?: EvaluationConfigItem;
  error?: string;
}

export interface ValidateAiProviderRequest {
  provider: string;
  apiKey: string;
  model: string;
}

export interface ValidateAiProviderResponse {
  isValid: boolean;
  message?: string;
  error?: string;
}

export interface GoogleCalendarConfig {
  clientId?: string;
  clientSecret?: string;
  connected?: boolean;
  redirectUri?: string;
}

export interface GoogleCalendarConfigResponse {
  googleCalendar: GoogleCalendarConfig;
}

export interface GoogleCalendarCredentialsRequest {
  clientId: string;
  clientSecret: string;
}

export interface DownloadAssetsResponse {
  blob: Blob;
  filename: string;
}

export interface PortalFile {
  id: string;
  name: string;
  url: string;
  type?: string;
  size?: number;
}

export interface PortalConfigData {
  portalName: string;
  portalLogo: PortalFile | null;
  portalLogoDark: PortalFile | null;
  portalFavicon: PortalFile | null;
  portalHeader: PortalFile | null;
  portalFooter: PortalFile | null;
  primaryColor: string;
  secondaryColor: string;
  fileStorage?: { storageType: string };
}

export interface PortalConfigUpdateResponse {
  message: string;
  portalConfigs: PortalConfigData;
}

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBackups: builder.query<any, void>({
      query: () => '/backups',
      providesTags: ['Backups'],
    }),
    takeSnapshot: builder.mutation<any, void>({
      query: () => ({
        url: '/db/take-snapshot',
        method: 'GET',
      }),
      invalidatesTags: ['Backups'],
    }),
    deleteBackup: builder.mutation<any, string>({
      query: (fileName) => ({
        url: '/db/take-snapshot',
        method: 'POST',
        body: { fileName },
      }),
      invalidatesTags: ['Backups'],
    }),
    getSMTPConfigs: builder.query({
      query: () => ({
        url: '/settings/smtp',
        method: 'GET',
      }),
    }),
    getMailTemplates: builder.query({
      query: () => ({
        url: '/settings/templates',
        method: 'GET',
      }),
    }),
    getGeminiConfigs: builder.query({
      query: () => ({
        url: '/settings/gemini',
        method: 'GET',
      }),
    }),
    getAIProvidersConfigs: builder.query({
      query: () => ({
        url: '/settings/ai-providers',
        method: 'GET',
      }),
    }),
    get2FAConfigs: builder.query({
      query: () => ({
        url: '/settings/twofa',
        method: 'GET',
      }),
    }),
    getCaptchaConfigs: builder.query({
      query: () => ({
        url: '/settings/captcha',
        method: 'GET',
      }),
    }),
    getTimeZone: builder.query({
      query: () => ({
        url: '/settings/timezone',
        method: 'GET',
      }),
    }),
    getMultipleOrgConfigs: builder.query({
      query: () => ({
        url: '/settings/multipleorg',
        method: 'GET',
      }),
    }),
    getFSConfigs: builder.query({
      query: () => ({
        url: '/settings/fs',
        method: 'GET',
      }),
    }),
    getGoogleCalendarConfig: builder.query({
      query: () => ({
        url: '/settings/google-calendar',
        method: 'GET',
      }),
      providesTags: ['Settings'],
    }),
    updateSMTPConfigs: builder.mutation({
      query: (mailConfig) => ({
        url: '/settings/smtp',
        method: 'PUT',
        body: mailConfig,
      }),
      invalidatesTags: ['Settings'],
    }),
    fetchAssetsMetadata: builder.query({
      query: () => ({
        url: '/download/assets',
        method: 'POST',
        body: {},
      }),
      providesTags: ['Assets'],
    }),
    updateMailTemplates: builder.mutation({
      query: (mailTemplates) => ({
        url: '/settings/templates',
        method: 'PUT',
        body: mailTemplates,
      }),
      invalidatesTags: ['Settings'],
    }),
    updateGemini: builder.mutation({
      query: (genimiConfig) => ({
        url: '/settings/gemini',
        method: 'PUT',
        body: genimiConfig,
      }),
      invalidatesTags: ['Settings'],
    }),
    updateAIProviders: builder.mutation({
      query: (aiProvidersConfig) => ({
        url: '/settings/ai-providers',
        method: 'PUT',
        body: aiProvidersConfig,
      }),
      invalidatesTags: ['Settings'],
    }),
    update2FA: builder.mutation({
      query: (twoFAConfig) => ({
        url: '/settings/twofa',
        method: 'PUT',
        body: twoFAConfig,
      }),
      invalidatesTags: ['Settings'],
    }),
    updateCaptcha: builder.mutation({
      query: (captchaConfig) => ({
        url: '/settings/captcha',
        method: 'PUT',
        body: captchaConfig,
      }),
      invalidatesTags: ['Settings'],
    }),
    updateTimeZone: builder.mutation({
      query: (timezone) => ({
        url: '/settings/timezone',
        method: 'PUT',
        body: timezone,
      }),
      invalidatesTags: ['Settings'],
    }),
    updateMultipleOrg: builder.mutation({
      query: (multipleOrgConfig) => ({
        url: '/settings/multipleorg',
        method: 'PUT',
        body: multipleOrgConfig,
      }),
      invalidatesTags: ['Settings'],
    }),
    testConnection: builder.mutation<
      TestConnectionResponse,
      TestConnectionRequest
    >({
      query: (body) => ({
        url: '/test-connection',
        method: 'POST',
        body,
      }),
    }),
    updateFSConfigs: builder.mutation({
      query: (fsConfig) => ({
        url: '/settings/fs',
        method: 'PUT',
        body: fsConfig,
      }),
      invalidatesTags: ['Settings'],
    }),
    getPortalConfigs: builder.query<PortalConfigData, void>({
      query: () => ({
        url: '/settings/portal',
        method: 'get',
      }),
      providesTags: ['Settings'],
    }),
    updatePortalConfigs: builder.mutation<
      PortalConfigUpdateResponse,
      Partial<PortalConfigData> & {
        portalHeaderHtml?: string;
        portalFooterHtml?: string;
      }
    >({
      query: (portalConfigs) => ({
        url: '/settings/portal',
        method: 'PUT',
        body: portalConfigs,
      }),
    }),
    updateGoogleCalendar: builder.mutation({
      query: (googleCalendarConfig) => ({
        url: '/settings/google-calendar',
        method: 'PUT',
        body: googleCalendarConfig,
      }),
      invalidatesTags: ['Settings'],
    }),
    disconnectGoogleCalendar: builder.mutation({
      query: () => ({
        url: '/settings/google-calendar',
        method: 'DELETE',
      }),
      invalidatesTags: ['Settings'],
    }),
    testGoogleCalendarConnection: builder.mutation<
      TestConnectionResponse,
      void
    >({
      query: () => ({
        url: '/google-calendar/test-connection',
        method: 'POST',
      }),
      invalidatesTags: ['Settings'],
    }),
    createResetToken: builder.mutation({
      query: ({ email, selectedOrgId }) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: { email, selectedOrgId },
      }),
    }),
    getNginxLogFiles: builder.query<SystemLogsResponse, void>({
      query: () => '/nginx-logs',
      providesTags: ['NginxLogs'],
      transformResponse: (response: SystemLogsResponse) => ({
        path: response.path,
        files: response.files || [],
        sizeBytes: response.sizeBytes || 0,
        size: response.size || '0 MB',
      }),
      keepUnusedDataFor: 300,
    }),
    getPm2LogFiles: builder.query<SystemLogsResponse, void>({
      query: () => '/pm2-logs',
      providesTags: ['PM2Logs'],
      transformResponse: (response: SystemLogsResponse) => ({
        path: response.path,
        files: response.files || [],
        sizeBytes: response.sizeBytes || 0,
        size: response.size || '0 MB',
      }),
      keepUnusedDataFor: 300,
    }),
    getPm2LogFileContent: builder.query<
      { content: string[]; totalLines: number; start: number; end: number },
      {
        file: string;
        mode?: 'tail' | 'range';
        start?: number;
        end?: number;
        limit?: number;
        query?: string;
      }
    >({
      query: ({ file, mode, start, end, limit, query }) => {
        const params = new URLSearchParams();
        if (mode) params.append('mode', mode);
        if (start !== undefined) params.append('start', start.toString());
        if (end !== undefined) params.append('end', end.toString());
        if (limit) params.append('limit', limit.toString());
        if (query) params.append('query', query || '');
        return `/pm2-logs/${file}?${params.toString()}`;
      },
      keepUnusedDataFor: 300,
    }),
    getServerLogs: builder.query<
      { logs: LogEntry[]; offset: number; totalLines: number },
      { offset: number; limit: number; query?: string }
    >({
      query: ({ offset, limit, query = '' }) => {
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
      { content: string[]; totalLines: number; start: number; end: number },
      {
        file: string;
        mode?: 'tail' | 'range';
        start?: number;
        end?: number;
        limit?: number;
        query?: string;
      }
    >({
      query: ({ file, mode, start, end, limit, query }) => {
        const params = new URLSearchParams();
        if (mode) params.append('mode', mode);
        if (start !== undefined) params.append('start', start.toString());
        if (end !== undefined) params.append('end', end.toString());
        if (limit) params.append('limit', limit.toString());
        if (query) params.append('query', query || '');
        return `/nginx-logs/${file}?${params.toString()}`;
      },
      keepUnusedDataFor: 300,
    }),
    getEmailHistory: builder.query<
      { emails: EmailHistoryRecord[]; pagination: { total: number } },
      { page: number; limit: number; search?: string; status?: string }
    >({
      query: ({ page, limit, search = '', status = '' }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(search && { search }),
          ...(status && status !== 'all' && { status }),
        });
        return `/email-history?${params.toString()}`;
      },
      providesTags: ['EmailHistory'],
    }),
    getAutoUpdate: builder.query<AutoUpdateResponse, void>({
      query: () => '/settings/auto-update',
      providesTags: ['AutoUpdate'],
    }),

    toggleAutoUpdate: builder.mutation<AutoUpdateResponse, void>({
      query: () => ({
        url: '/settings/auto-update',
        method: 'POST',
      }),
      invalidatesTags: ['AutoUpdate'],
    }),

    getVersionList: builder.query<VersionListResponse, void>({
      query: () => '/version/list',
      providesTags: ['VersionList'],
    }),

    getDiskSpace: builder.query<DiskSpaceResponse, void>({
      query: () => '/disk-space',
      providesTags: ['DiskSpace'],
    }),
    getDiskFolderDetails: builder.query<
      DiskFolderDetailResponse,
      { root: string; path?: string }
    >({
      query: ({ root, path = '' }) =>
        `/disk-space?root=${root}&path=${encodeURIComponent(path)}`,
      providesTags: (result, error, arg) => [
        { type: 'DiskSpace', id: `${arg.root}-${arg.path}` },
      ],
    }),

    triggerUpdate: builder.mutation<TriggerUpdateResponse, void>({
      query: () => ({
        url: '/system/update',
        method: 'POST',
      }),
      invalidatesTags: ['SystemUpdate', 'VersionList'],
    }),

    validateAiProvider: builder.mutation<
      ValidateAiProviderResponse,
      ValidateAiProviderRequest
    >({
      query: (body) => ({
        url: '/settings/ai-providers/validate',
        method: 'POST',
        body,
      }),
    }),
    downloadAssets: builder.mutation<DownloadAssetsResponse, void>({
      query: () => ({
        url: '/download/assets',
        method: 'GET',
        responseHandler: async (response) => {
          const blob = await response.blob();
          const contentDisposition = response.headers.get(
            'Content-Disposition',
          );
          const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
          const filename = fileNameMatch
            ? fileNameMatch[1]
            : `assets-${Date.now()}.tar.gz`;

          return { blob, filename };
        },
      }),
      invalidatesTags: ['Assets'],
    }),

    getEvaluationConfigs: builder.query<GetEvaluationConfigsResponse, void>({
      query: () => ({
        url: '/settings/evaluation',
        method: 'GET',
      }),
      providesTags: ['Settings'],
    }),
    updateEvaluationConfigs: builder.mutation<
      UpdateEvaluationConfigsResponse,
      UpdateEvaluationConfigsRequest
    >({
      query: (config) => ({
        url: '/settings/evaluation',
        method: 'PUT',
        body: config,
      }),
      invalidatesTags: ['Settings'],
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
  useGetDiskSpaceQuery,
  useGetDiskFolderDetailsQuery,
  useLazyGetPm2LogFileContentQuery,
  useGetPm2LogFilesQuery,
  useGetEvaluationConfigsQuery,
  useUpdateEvaluationConfigsMutation,
  useValidateAiProviderMutation,
  useTestGoogleCalendarConnectionMutation,
  useDownloadAssetsMutation,
} = settingsApi;

export type { TestConnectionRequest, TestConnectionResponse };
