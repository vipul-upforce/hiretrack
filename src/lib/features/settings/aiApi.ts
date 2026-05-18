import { baseApi } from '@/lib/api/baseApi';
import {
  GetBulkCvAiResponse,
  GetEvaluationConfigsResponse,
  UpdateBulkCvAiRequest,
  UpdateEvaluationConfigsResponse,
  UpdateEvaluationConfigsRequest,
  ValidateAiProviderRequest,
  ValidateAiProviderResponse,
  ValidateBulkCvAiRequest,
  ValidateBulkCvAiResponse,
} from './types/ai.types';

export const aiApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGeminiConfigs: builder.query({
      query: () => ({ url: '/settings/gemini', method: 'GET' }),
    }),
    updateGemini: builder.mutation({
      query: (config) => ({
        url: '/settings/gemini',
        method: 'PUT',
        body: config,
      }),
      invalidatesTags: ['Settings'],
    }),
    getAIProvidersConfigs: builder.query({
      query: () => ({ url: '/settings/ai-providers', method: 'GET' }),
    }),
    updateAIProviders: builder.mutation({
      query: (config) => ({
        url: '/settings/ai-providers',
        method: 'PUT',
        body: config,
      }),
      invalidatesTags: ['Settings'],
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
    getEvaluationConfigs: builder.query<GetEvaluationConfigsResponse, void>({
      query: () => ({ url: '/settings/evaluation', method: 'GET' }),
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
    getBulkCvAiConfigs: builder.query<GetBulkCvAiResponse, void>({
      query: () => ({ url: '/settings/bulk-cv-ai', method: 'GET' }),
      providesTags: ['Settings'],
    }),
    updateBulkCvAiConfigs: builder.mutation<
      { message: string },
      UpdateBulkCvAiRequest
    >({
      query: (body) => ({
        url: '/settings/bulk-cv-ai',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Settings'],
    }),
    validateBulkCvAi: builder.mutation<
      ValidateBulkCvAiResponse,
      ValidateBulkCvAiRequest
    >({
      query: (body) => ({
        url: '/settings/bulk-cv-ai/validate',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetGeminiConfigsQuery,
  useUpdateGeminiMutation,
  useGetAIProvidersConfigsQuery,
  useUpdateAIProvidersMutation,
  useValidateAiProviderMutation,
  useGetEvaluationConfigsQuery,
  useUpdateEvaluationConfigsMutation,
  useGetBulkCvAiConfigsQuery,
  useUpdateBulkCvAiConfigsMutation,
  useValidateBulkCvAiMutation,
} = aiApi;
