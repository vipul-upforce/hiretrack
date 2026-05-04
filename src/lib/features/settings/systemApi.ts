import { baseApi } from '@/lib/api/baseApi';
import {
  AutoUpdateResponse,
  CronTimezoneResponse,
  CronTimezoneUpdateResponse,
  DeleteBackupResponse,
  DiskFolderDetailResponse,
  DiskSpaceResponse,
  GetBackupsResponse,
  TakeSnapshotResponse,
  TriggerUpdateResponse,
  VersionListResponse,
} from './types/system.types';

export const systemApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBackups: builder.query<GetBackupsResponse, void>({
      query: () => '/backups',
      providesTags: ['Backups'],
    }),
    takeSnapshot: builder.mutation<TakeSnapshotResponse, void>({
      query: () => ({
        url: '/db/take-snapshot',
        method: 'GET',
      }),
      invalidatesTags: ['Backups'],
    }),
    deleteBackup: builder.mutation<DeleteBackupResponse, string>({
      query: (fileName) => ({
        url: '/db/take-snapshot',
        method: 'POST',
        body: { fileName },
      }),
      invalidatesTags: ['Backups'],
    }),
    getAutoUpdate: builder.query<AutoUpdateResponse, void>({
      query: () => '/settings/auto-update',
      providesTags: ['AutoUpdate'],
    }),
    toggleAutoUpdate: builder.mutation<AutoUpdateResponse, void>({
      query: () => ({ url: '/settings/auto-update', method: 'POST' }),
      invalidatesTags: ['AutoUpdate'],
    }),
    getVersionList: builder.query<VersionListResponse, void>({
      query: () => '/version/list',
      providesTags: ['VersionList'],
    }),
    triggerUpdate: builder.mutation<TriggerUpdateResponse, void>({
      query: () => ({ url: '/system/update', method: 'POST' }),
      invalidatesTags: ['SystemUpdate', 'VersionList'],
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
      providesTags: (_result, _error, arg) => [
        { type: 'DiskSpace', id: `${arg.root}-${arg.path}` },
      ],
    }),
    getCronTimezone: builder.query<CronTimezoneResponse, void>({
      query: () => '/cron/time-zone',
      providesTags: ['CronTimezone'],
    }),
    updateCronTimezone: builder.mutation<
      CronTimezoneUpdateResponse,
      { timezone: string }
    >({
      query: (body) => ({
        url: '/cron/time-zone',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CronTimezone'],
    }),
  }),
});

export const {
  useGetBackupsQuery,
  useTakeSnapshotMutation,
  useDeleteBackupMutation,
  useGetAutoUpdateQuery,
  useToggleAutoUpdateMutation,
  useGetVersionListQuery,
  useLazyGetVersionListQuery,
  useTriggerUpdateMutation,
  useGetDiskSpaceQuery,
  useGetDiskFolderDetailsQuery,
  useGetCronTimezoneQuery,
  useUpdateCronTimezoneMutation,
} = systemApi;
