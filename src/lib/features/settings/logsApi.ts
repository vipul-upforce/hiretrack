import { baseApi } from '@/lib/api/baseApi';
import { LogEntry, SystemLogsResponse } from './types/system.types';

export const logsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
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
    getPm2LogFiles: builder.query<SystemLogsResponse, void>({
      query: () => '/pm2-logs',
      providesTags: ['PM2Logs'],
      transformResponse: (res: SystemLogsResponse) => ({
        path: res.path,
        files: res.files || [],
        sizeBytes: res.sizeBytes || 0,
        size: res.size || '0 MB',
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
      query: ({ offset, limit, query = '' }) =>
        `/logs?${new URLSearchParams({ offset: offset.toString(), limit: limit.toString(), query }).toString()}`,
      keepUnusedDataFor: 300,
    }),
  }),
});

export const {
  useGetNginxLogFilesQuery,
  useGetNginxFileContentQuery,
  useLazyGetNginxFileContentQuery,
  useGetPm2LogFilesQuery,
  useGetPm2LogFileContentQuery,
  useLazyGetPm2LogFileContentQuery,
  useGetServerLogsQuery,
  useLazyGetServerLogsQuery,
} = logsApi;
