import { baseApi } from '@/lib/api/baseApi';

export interface FileUploadData {
  base64: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface ShareOptions {
  isPublic?: boolean;
  expiresInHours?: number;
  maxDownloads?: number;
  metadata?: {
    purpose?: string;
    relatedTo?: string;
    candidateId?: string;
    [key: string]: unknown;
  };
}

export interface FileShareRequest {
  files: FileUploadData[];
  shareOptions?: ShareOptions;
}

export interface FileShareResult {
  success: boolean;
  shareId: string;
  shareUrl: string;
  fileName: string;
  fileSize: number;
}

export interface FileShareResponse {
  success: boolean;
  files: FileShareResult[];
}

export const fileSharesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadFiles: builder.mutation<FileShareResponse, FileShareRequest>({
      query: (body) => ({
        url: '/file-shares',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useUploadFilesMutation } = fileSharesApi;
