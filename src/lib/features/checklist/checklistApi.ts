import { baseApi } from '@/lib/api/baseApi';
import {
  IJobLaneConfig,
  ILaneConfig,
  IChecklist,
  IChecklistField,
} from '@/lib/models/JobLaneConfig';
import { IChecklistTemplate } from '@/lib/models/ChecklistTemplate';

interface ValidateChecklistResponse {
  success: boolean;
  canMove: boolean;
  requiresChecklist: boolean;
  checklist?: IChecklist;
  isMandatory?: boolean;
  checklistCompleted?: boolean;
  message?: string;
}

interface SubmitChecklistRequest {
  checklistId: string;
  checklistName: string;
  checklistType: 'incoming' | 'outgoing';
  laneId: string;
  laneName: string;

  responses: Record<
    string,
    {
      value: any;
      fieldLabel?: string;
      fieldType?: string;
      files?: any[];
      visibleInHistory: string[];
    }
  >;
  remark?: {
    description: string;
    isPrivate?: boolean;
    rating?: number;
  };
}

export const checklistApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Job Lane Configuration endpoints
    getJobLaneConfig: builder.query<IJobLaneConfig, string>({
      query: (jobId) => `/jobs/${jobId}/checklist-config`,
      transformResponse: (response: {
        success: boolean;
        data: IJobLaneConfig;
      }) => response.data,
      providesTags: (_result, _error, jobId) => [
        { type: 'JobLaneConfig', id: jobId },
      ],
    }),

    updateJobLaneConfig: builder.mutation<
      IJobLaneConfig,
      { jobId: string; laneConfigs: ILaneConfig[] }
    >({
      query: ({ jobId, laneConfigs }) => ({
        url: `/jobs/${jobId}/checklist-config`,
        method: 'POST',
        body: { laneConfigs },
      }),
      transformResponse: (response: {
        success: boolean;
        data: IJobLaneConfig;
      }) => response.data,
      invalidatesTags: (_result, _error, { jobId }) => [
        { type: 'JobLaneConfig', id: jobId },
      ],
    }),

    updateLaneConfig: builder.mutation<
      IJobLaneConfig,
      { jobId: string; laneId: string; laneConfig: ILaneConfig }
    >({
      query: ({ jobId, laneId, laneConfig }) => ({
        url: `/jobs/${jobId}/checklist-config`,
        method: 'PATCH',
        body: { laneId, laneConfig },
      }),
      transformResponse: (response: {
        success: boolean;
        data: IJobLaneConfig;
      }) => response.data,
      invalidatesTags: (_result, _error, { jobId }) => [
        { type: 'JobLaneConfig', id: jobId },
      ],
    }),

    deleteLaneChecklist: builder.mutation<
      void,
      { jobId: string; laneId: string; type: 'incoming' | 'outgoing' }
    >({
      query: ({ jobId, laneId, type }) => ({
        url: `/jobs/${jobId}/checklist-config?laneId=${laneId}&type=${type}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { jobId }) => [
        { type: 'JobLaneConfig', id: jobId },
      ],
    }),

    // Checklist Template endpoints
    getChecklistTemplates: builder.query<
      IChecklistTemplate[],
      { type?: 'incoming' | 'outgoing'; active?: boolean }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.type) searchParams.append('type', params.type);
        if (params.active !== undefined)
          searchParams.append('active', params.active.toString());
        return `/checklist-templates?${searchParams.toString()}`;
      },
      transformResponse: (response: {
        success: boolean;
        data: IChecklistTemplate[];
      }) => response.data,
      providesTags: ['ChecklistTemplate'],
    }),

    getChecklistTemplate: builder.query<IChecklistTemplate, string>({
      query: (id) => `/checklist-templates/${id}`,
      transformResponse: (response: {
        success: boolean;
        data: IChecklistTemplate;
      }) => response.data,
      providesTags: (_result, _error, id) => [
        { type: 'ChecklistTemplate', id },
      ],
    }),

    createChecklistTemplate: builder.mutation<
      IChecklistTemplate,
      {
        name: string;
        description?: string;
        type: 'incoming' | 'outgoing';
        fields: IChecklistField[];
      }
    >({
      query: (body) => ({
        url: '/checklist-templates',
        method: 'POST',
        body,
      }),
      transformResponse: (response: {
        success: boolean;
        data: IChecklistTemplate;
      }) => response.data,
      invalidatesTags: ['ChecklistTemplate'],
    }),

    updateChecklistTemplate: builder.mutation<
      IChecklistTemplate,
      {
        id: string;
        name?: string;
        description?: string;
        fields?: IChecklistField[];
        isActive?: boolean;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/checklist-templates/${id}`,
        method: 'PUT',
        body,
      }),
      transformResponse: (response: {
        success: boolean;
        data: IChecklistTemplate;
      }) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ChecklistTemplate', id },
        'ChecklistTemplate',
      ],
    }),

    deleteChecklistTemplate: builder.mutation<void, string>({
      query: (id) => ({
        url: `/checklist-templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ChecklistTemplate'],
    }),

    // Candidate Checklist endpoints
    validateCandidateChecklist: builder.mutation<
      ValidateChecklistResponse,
      {
        candidateId: string;
        currentLane: string;
        targetLane: string;
        movementType: 'incoming' | 'outgoing';
      }
    >({
      query: ({ candidateId, ...body }) => ({
        url: `/candidates/${candidateId}/validate-checklist`,
        method: 'POST',
        body,
      }),
    }),

    submitCandidateChecklist: builder.mutation<
      void,
      {
        candidateId: string;
        data: SubmitChecklistRequest;
      }
    >({
      query: ({ candidateId, data }) => ({
        url: `/candidates/${candidateId}/submit-checklist`,
        method: 'POST',
        body: { ...data, currentTime: new Date().toISOString() },
      }),
      invalidatesTags: (_result, _error, { candidateId }) => [
        { type: 'CandidateChecklist', id: candidateId },
      ],
    }),
  }),
});

export const {
  useGetJobLaneConfigQuery,
  useUpdateJobLaneConfigMutation,
  useUpdateLaneConfigMutation,
  useDeleteLaneChecklistMutation,
  useGetChecklistTemplatesQuery,
  useGetChecklistTemplateQuery,
  useCreateChecklistTemplateMutation,
  useUpdateChecklistTemplateMutation,
  useDeleteChecklistTemplateMutation,
  useValidateCandidateChecklistMutation,
  useSubmitCandidateChecklistMutation,
} = checklistApi;
