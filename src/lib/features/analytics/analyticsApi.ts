import { baseApi } from "@/lib/api/baseApi";
import { DateRange } from "react-day-picker";

export interface AnalyticsFilters {
  dateRange?: DateRange;
  jobIds?: string[];
  candidateStatuses?: string[];
  interviewerIds?: string[];
  locations?: string[];
  granularity?: "daily" | "weekly" | "monthly";
}

export interface SerializedAnalyticsFilters {
  dateRange?: {
    from?: string;
    to?: string;
  };
  jobIds?: string[];
  candidateStatuses?: string[];
  interviewerIds?: string[];
  locations?: string[];
  granularity?: "daily" | "weekly" | "monthly";
}

export interface AnalyticsResponse<T> {
  success: boolean;
  data: T;
  metadata?: {
    totalRecords?: number;
    dateRange?: {
      start: Date;
      end: Date;
    };
    generatedAt?: Date | string;
    organizationId?: string;
  };
  error?: string;
}

export interface AnalyticsQueryArgs {
  endpoint: string;
  organizationId: string;
  filters?: SerializedAnalyticsFilters;
}

const buildQueryParams = ({ organizationId, filters }: AnalyticsQueryArgs) => {
  const params: Record<string, string> = {};

  if (organizationId?.trim()) {
    params.organizationId = organizationId.trim();
  }

  if (filters?.dateRange?.from) {
    params.startDate = filters.dateRange.from;
  }

  if (filters?.dateRange?.to) {
    params.endDate = filters.dateRange.to;
  }

  if (filters?.jobIds?.length) {
    params.jobIds = filters.jobIds.join(",");
  }

  if (filters?.candidateStatuses?.length) {
    params.statuses = filters.candidateStatuses.join(",");
  }

  if (filters?.interviewerIds?.length) {
    params.interviewerIds = filters.interviewerIds.join(",");
  }

  if (filters?.locations?.length) {
    params.locations = filters.locations.join(",");
  }

  if (filters?.granularity) {
    params.granularity = filters.granularity;
  }

  return params;
};

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    fetchAnalytics: builder.query<AnalyticsResponse<any>, AnalyticsQueryArgs>({
      query: (args) => ({
        url: `/analytics/${args.endpoint.replace(/^\/+/, "")}`,
        method: "GET",
        params: buildQueryParams(args),
      }),
      providesTags: (_result, _error, arg) => [
        {
          type: "Analytics",
          id: `${arg.endpoint}`,
        },
      ],
    }),
  }),
});

export const { useFetchAnalyticsQuery } = analyticsApi;