import type { EmailNotificationType } from '@/components/ui/email-notification-toggle';
import { baseApi } from '@/lib/api/baseApi';

export interface EmailNotificationSettings {
  global: Record<EmailNotificationType, { enabled: boolean; source: string }>;
  jobLevel?: Record<
    string,
    Record<EmailNotificationType, { enabled: boolean; source: string }>
  >;
}

export interface OrganizationSettingsResponse {
  organizationSettings: {
    defaultSettings: Record<EmailNotificationType, boolean>;
    adminOverrides: Record<string, Record<EmailNotificationType, boolean>>;
  };
  users: Array<{
    _id: string;
    name: string;
    email: string;
    role: string;
    hasCustomSettings: boolean;
    currentOverride: Record<EmailNotificationType, boolean> | null;
  }>;
}

type ApiSuccessResponse<T> = T & { success: true };

export interface GetUserEmailNotificationSettingsResponse {
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  settings: {
    email?: Record<EmailNotificationType, { enabled: boolean; source: string }>;
    inApp?: Record<EmailNotificationType, { enabled: boolean; source: string }>;
    jobLevel?: {
      email?: Record<
        EmailNotificationType,
        { enabled: boolean; source: string }
      >;
      inApp?: Record<
        EmailNotificationType,
        { enabled: boolean; source: string }
      >;
    };
  };
}

export interface UpdateUserEmailNotificationSettingsRequest {
  userId: string;
  updates: {
    global?: Record<EmailNotificationType, boolean>;
    jobLevel?: Record<string, Record<EmailNotificationType, boolean>>;
  };
}

export interface UpdateUserEmailNotificationSettingsResponse {
  message: string;
  settings?: unknown;
  user?: {
    name?: string;
    email?: string;
    role?: string;
  };
}

export interface GetJobEmailNotificationSettingsResponse {
  job: {
    _id: string;
    title: string;
  };
  currentJobSettings: Record<EmailNotificationType, boolean> | null;
  effectiveSettings: Record<
    EmailNotificationType,
    { enabled: boolean; source: string }
  >;
  hasJobLevelOverrides: boolean;
}

export interface UpdateJobEmailNotificationSettingsRequest {
  jobId: string;
  settings: Record<EmailNotificationType, boolean>;
}

export interface UpdateJobEmailNotificationSettingsResponse {
  message: string;
  jobSettings: Record<EmailNotificationType, boolean>;
  effectiveSettings: Record<
    EmailNotificationType,
    { enabled: boolean; source: string }
  >;
}

export interface GlobalEmailNotificationSettings {
  newApplications: boolean;
  interviewAssignments: boolean;
  statusUpdates: boolean;
  newRemarks: boolean;
  stepCompleted: boolean;
  mentions: boolean;
  detailsUpdated: boolean;
  meetingScheduled: boolean;
  meetingUpdated: boolean;
  meetingCancelled: boolean;
  meetingInviteAccepted: boolean;
  meetingInviteDeclined: boolean;
  meetingInviteTentative: boolean;
  followupAdded: boolean;
  followupUpdated: boolean;
  followupRemoved: boolean;
  jobCreated: boolean;
  jobUpdated: boolean;
  userAdded: boolean;
  bulkImportCompleted: boolean;
  candidateRejected: boolean;
  interviewCompleted: boolean;
  candidateMoved?: boolean;
}

export interface GetGlobalEmailNotificationSettingsResponse {
  globalSettings: GlobalEmailNotificationSettings;
  effectiveSettings: {
    email?: Record<EmailNotificationType, { enabled: boolean; source: string }>;
    inApp?: Record<EmailNotificationType, { enabled: boolean; source: string }>;
  };
}

export interface UpdateGlobalEmailNotificationSettingsRequest {
  settings: GlobalEmailNotificationSettings;
}

export interface UpdateGlobalEmailNotificationSettingsResponse {
  message: string;
  globalSettings: GlobalEmailNotificationSettings;
  effectiveSettings: {
    email?: Record<EmailNotificationType, { enabled: boolean; source: string }>;
    inApp?: Record<EmailNotificationType, { enabled: boolean; source: string }>;
  };
}

export interface GetUserEmailNotificationSettingsQueryArg {
  userId: string;
  jobId?: string;
}

export const emailNotificationSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserEmailNotificationSettings: builder.query<
      ApiSuccessResponse<GetUserEmailNotificationSettingsResponse>,
      GetUserEmailNotificationSettingsQueryArg
    >({
      query: ({ userId, jobId }) => {
        const params = new URLSearchParams();
        if (jobId) params.append('jobId', jobId);
        const suffix = params.toString() ? `?${params.toString()}` : '';
        return `/${userId}${suffix}`;
      },
      providesTags: (_result, _error, arg) => [
        { type: 'EmailNotificationUser', id: arg.userId },
      ],
    }),

    updateUserEmailNotificationSettings: builder.mutation<
      ApiSuccessResponse<UpdateUserEmailNotificationSettingsResponse>,
      UpdateUserEmailNotificationSettingsRequest
    >({
      query: ({ userId, updates }) => ({
        url: `/${userId}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'EmailNotificationUser', id: arg.userId },
        { type: 'EmailNotificationOrganization', id: 'ORG' },
        { type: 'EmailNotificationGlobal', id: 'GLOBAL' },
      ],
    }),

    getJobEmailNotificationSettings: builder.query<
      ApiSuccessResponse<GetJobEmailNotificationSettingsResponse>,
      { jobId: string }
    >({
      query: ({ jobId }) => `/job/${jobId}`,
      providesTags: (_result, _error, arg) => [
        { type: 'EmailNotificationJob', id: arg.jobId },
      ],
    }),

    updateJobEmailNotificationSettings: builder.mutation<
      ApiSuccessResponse<UpdateJobEmailNotificationSettingsResponse>,
      UpdateJobEmailNotificationSettingsRequest
    >({
      query: ({ jobId, settings }) => ({
        url: `/job/${jobId}`,
        method: 'PUT',
        body: { settings },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'EmailNotificationJob', id: arg.jobId },
      ],
    }),

    getOrganizationEmailNotificationSettings: builder.query<
      ApiSuccessResponse<OrganizationSettingsResponse>,
      void
    >({
      query: () => '',
      providesTags: [{ type: 'EmailNotificationOrganization', id: 'ORG' }],
    }),

    updateOrganizationEmailNotificationSettings: builder.mutation<
      ApiSuccessResponse<{
        message: string;
        settings: OrganizationSettingsResponse['organizationSettings'];
      }>,
      {
        updates: {
          defaultSettings?: Record<EmailNotificationType, boolean>;
          adminOverrides?: Record<
            string,
            Record<EmailNotificationType, boolean>
          >;
        };
      }
    >({
      query: ({ updates }) => ({
        url: '',
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: [{ type: 'EmailNotificationOrganization', id: 'ORG' }],
    }),

    getGlobalEmailNotificationSettings: builder.query<
      ApiSuccessResponse<GetGlobalEmailNotificationSettingsResponse>,
      void
    >({
      query: () => '/global',
      providesTags: [{ type: 'EmailNotificationGlobal', id: 'GLOBAL' }],
    }),

    updateGlobalEmailNotificationSettings: builder.mutation<
      ApiSuccessResponse<UpdateGlobalEmailNotificationSettingsResponse>,
      UpdateGlobalEmailNotificationSettingsRequest
    >({
      query: (body) => ({
        url: '/global',
        method: 'PUT',
        body,
      }),
      invalidatesTags: [{ type: 'EmailNotificationGlobal', id: 'GLOBAL' }],
    }),
  }),
});

export const {
  useGetUserEmailNotificationSettingsQuery,
  useUpdateUserEmailNotificationSettingsMutation,
  useGetJobEmailNotificationSettingsQuery,
  useUpdateJobEmailNotificationSettingsMutation,
  useGetOrganizationEmailNotificationSettingsQuery,
  useUpdateOrganizationEmailNotificationSettingsMutation,
  useGetGlobalEmailNotificationSettingsQuery,
  useUpdateGlobalEmailNotificationSettingsMutation,
} = emailNotificationSettingsApi;
