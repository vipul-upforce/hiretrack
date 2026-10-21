import { baseApi } from '@/lib/api/baseApi';
import {
  DownloadAssetsResponse,
  EmailHistoryRecord,
  PortalConfigData,
  PortalConfigUpdateResponse,
} from './types/portal.types';

export const portalApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPortalConfigs: builder.query<PortalConfigData, void>({
      query: () => ({ url: '/settings/portal', method: 'get' }),
      providesTags: ['Settings'],
    }),
    updatePortalConfigs: builder.mutation<
      PortalConfigUpdateResponse,
      Partial<PortalConfigData> & {
        portalHeaderHtml?: string;
        portalFooterHtml?: string;
      }
    >({
      query: (configs) => ({
        url: '/settings/portal',
        method: 'PUT',
        body: configs,
      }),
      async onQueryStarted(_portalConfigs, { dispatch, queryFulfilled }) {
        // Update the cache with the response data without invalidating
        try {
          const { data } = await queryFulfilled;
          // The API returns { message, portalConfigs }
          if (data?.portalConfigs) {
            dispatch(
              portalApi.util.updateQueryData(
                'getPortalConfigs',
                undefined,
                (draft: PortalConfigData) => {
                  // Update the cache with the response data
                  Object.assign(draft, data.portalConfigs);
                },
              ),
            );
          }
        } catch {
          // If the mutation fails, the cache remains unchanged
          // No need to revert since we're not doing optimistic updates
        }
      },
    }),
    fetchAssetsMetadata: builder.query({
      query: () => ({ url: '/download/assets', method: 'POST', body: {} }),
      providesTags: ['Assets'],
    }),
    downloadAssets: builder.mutation<DownloadAssetsResponse, void>({
      queryFn: async (_arg, _api, _extraOptions, baseQuery) => {
        const result = await baseQuery({
          url: '/download/assets',
          method: 'GET',
          responseHandler: (response) =>
            response.ok ? response.blob() : response.json(),
        });

        // 1. Handle Network Errors
        if (result.error) {
          return { error: result.error };
        }

        const { data, meta } = result;
        const response = (meta as { response?: Response })?.response;

        // 2. Handle API Errors
        if (!response?.ok) {
          return {
            error: {
              status: response?.status ?? 500,
              data,
            },
          } 
        }

        // 3. Handle Success
        const contentDisposition = response.headers.get('Content-Disposition');
        const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
        const filename = fileNameMatch
          ? fileNameMatch[1]
          : `assets-${Date.now()}.tar.gz`;

        return {
          data: {
            blob: data as Blob,
            filename,
          },
        };
      },
      invalidatesTags: ['Assets'],
    }),
    getMailTemplates: builder.query({
      query: () => ({ url: '/settings/templates', method: 'GET' }),
    }),
    getErrorPageTemplate: builder.query<{ html: string }, void>({
      query: () => ({ url: '/settings/error-pages/502', method: 'GET' }),
      providesTags: ['Settings'],
    }),
    updateMailTemplates: builder.mutation({
      query: (templates) => ({
        url: '/settings/templates',
        method: 'PUT',
        body: templates,
      }),
      invalidatesTags: ['Settings'],
    }),
    updateErrorPageTemplate: builder.mutation<
      { success: boolean; nginxSync?: unknown },
      { html: string }
    >({
      query: (payload) => ({
        url: '/settings/error-pages/502',
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['Settings'],
    }),
    getEmailHistory: builder.query<
      { emails: EmailHistoryRecord[]; pagination: { total: number } },
      { page: number; limit: number; search?: string; status?: string }
    >({
      query: ({ page, limit, search = '', status = '' }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (search) params.append('search', search);
        if (status && status !== 'all') params.append('status', status);
        return `/email-history?${params.toString()}`;
      },
      providesTags: ['EmailHistory'],
    }),
  }),
});

export const {
  useGetPortalConfigsQuery,
  useUpdatePortalConfigsMutation,
  useFetchAssetsMetadataQuery,
  useDownloadAssetsMutation,
  useGetMailTemplatesQuery,
  useUpdateMailTemplatesMutation,
  useGetErrorPageTemplateQuery,
  useUpdateErrorPageTemplateMutation,
  useGetEmailHistoryQuery,
} = portalApi;
