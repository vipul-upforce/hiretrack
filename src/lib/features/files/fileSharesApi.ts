import { baseApi } from '@/lib/api/baseApi';

interface FileUploadData {
  base64: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

interface ShareOptions {
  isPublic?: boolean;
  expiresInHours?: number;
  maxDownloads?: number;
  metadata?: Record<string, unknown>;
}

interface FileShareRequest {
  files: FileUploadData[];
  shareOptions?: ShareOptions;
}

interface FileShareResult {
  success: boolean;
  shareId: string;
  shareUrl: string;
  fileName: string;
  fileSize: number;
  error?: string;
}

interface FileShareResponse {
  success: boolean;
  files: FileShareResult[];
}

export const fileSharesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadFiles: builder.mutation<FileShareResponse, FileShareRequest>({
      query: (data) => ({
        url: '/file-shares',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const { useUploadFilesMutation } = fileSharesApi;
