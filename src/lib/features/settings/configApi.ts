import { baseApi } from '@/lib/api/baseApi';

interface EmailTemplateResponse {
  templateId: string;
  templateName: string;
  subject: string;
  html: string;
  variables?: string[];
}

export const configApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSMTPConfigs: builder.query({
      query: () => ({ url: '/settings/smtp', method: 'GET' }),
    }),
    updateSMTPConfigs: builder.mutation({
      query: (mailConfig) => ({
        url: '/settings/smtp',
        method: 'PUT',
        body: mailConfig,
      }),
      invalidatesTags: ['Settings'],
    }),
    getFSConfigs: builder.query({
      query: () => ({ url: '/settings/fs', method: 'GET' }),
    }),
    updateFSConfigs: builder.mutation({
      query: (fsConfig) => ({
        url: '/settings/fs',
        method: 'PUT',
        body: fsConfig,
      }),
      invalidatesTags: ['Settings'],
    }),
    get2FAConfigs: builder.query({
      query: () => ({ url: '/settings/twofa', method: 'GET' }),
    }),
    update2FA: builder.mutation({
      query: (twoFAConfig) => ({
        url: '/settings/twofa',
        method: 'PUT',
        body: twoFAConfig,
      }),
      invalidatesTags: ['Settings'],
    }),
    getCaptchaConfigs: builder.query({
      query: () => ({ url: '/settings/captcha', method: 'GET' }),
    }),
    updateCaptcha: builder.mutation({
      query: (captchaConfig) => ({
        url: '/settings/captcha',
        method: 'PUT',
        body: captchaConfig,
      }),
      invalidatesTags: ['Settings'],
    }),
    getTimeZone: builder.query({
      query: () => ({ url: '/settings/timezone', method: 'GET' }),
    }),
    updateTimeZone: builder.mutation({
      query: (timezone) => ({
        url: '/settings/timezone',
        method: 'PUT',
        body: timezone,
      }),
      invalidatesTags: ['Settings'],
    }),
    getMultipleOrgConfigs: builder.query({
      query: () => ({ url: '/settings/multipleorg', method: 'GET' }),
    }),
    updateMultipleOrg: builder.mutation({
      query: (config) => ({
        url: '/settings/multipleorg',
        method: 'PUT',
        body: config,
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
    getEmailTemplates: builder.query<
      { templates: Record<string, EmailTemplateResponse> },
      void
    >({
      query: () => ({ url: '/settings/templates', method: 'GET' }),
      providesTags: ['Settings'],
    }),
  }),
});

export const {
  useGetSMTPConfigsQuery,
  useUpdateSMTPConfigsMutation,
  useGetFSConfigsQuery,
  useUpdateFSConfigsMutation,
  useGet2FAConfigsQuery,
  useUpdate2FAMutation,
  useGetCaptchaConfigsQuery,
  useUpdateCaptchaMutation,
  useGetTimeZoneQuery,
  useUpdateTimeZoneMutation,
  useGetMultipleOrgConfigsQuery,
  useUpdateMultipleOrgMutation,
  useCreateResetTokenMutation,
  useGetEmailTemplatesQuery,
} = configApi;
