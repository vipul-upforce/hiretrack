import { baseApi } from '@/lib/api/baseApi';
import { downloadAssetsArchive } from '@/lib/assets-archive/download-client';
import {
  DownloadAssetsArgs,
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
    downloadAssets: builder.mutation<
      DownloadAssetsResponse,
      DownloadAssetsArgs | void
    >({
      queryFn: async (arg, api) => {
        try {
          const data = await downloadAssetsArchive({
            basePath: '/api/download/assets',
            onProgress: arg?.onProgress,
            dispatch: api.dispatch,
          });
          return { data };
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Failed to download assets';
          return {
            error: {
              status: 'CUSTOM_ERROR' as const,
              error: message,
              data: { message },
            },
          };
        }
      },
      invalidatesTags: ['Assets'],
    }),
    getMailTemplates: builder.query({
      query: () => ({ url: '/settings/templates', method: 'GET' }),
    }),
    updateMailTemplates: builder.mutation({
      query: (templates) => ({
        url: '/settings/templates',
        method: 'PUT',
        body: templates,
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
  useGetEmailHistoryQuery,
} = portalApi;
