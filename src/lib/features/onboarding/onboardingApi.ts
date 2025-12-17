import { baseApi } from '@/lib/api/baseApi';

export interface OnboardingStatus {
  isCompleted: boolean;
  completedSteps: string[];
  skippedSteps: string[];
  doNotShowAgain: boolean;
  currentStep: number;
  lastUpdated: Date;
}

export interface OnboardingProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface StepStatus {
  [stepId: string]: boolean;
}

export interface ValidateResponse {
  isValid: boolean;
  progress: OnboardingProgress;
  stepStatus: StepStatus;
}

export interface StatusResponse {
  onboardingStatus: OnboardingStatus;
}

type ApiSuccess<T> = T;

export interface ValidateStepResponse {
  isValid: boolean;
}

export interface AuthMeResponse {
  user: unknown;
}

export const onboardingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOnboardingStatus: builder.query<ApiSuccess<StatusResponse>, void>({
      query: () => '/onboarding/status',
      providesTags: ['Onboarding'],
    }),

    updateOnboardingStatus: builder.mutation<
      ApiSuccess<StatusResponse>,
      Partial<OnboardingStatus>
    >({
      query: (updates) => ({
        url: '/onboarding/status',
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: ['Onboarding'],
    }),

    validateOnboarding: builder.query<ApiSuccess<ValidateResponse>, void>({
      query: () => '/onboarding/validate',
      providesTags: ['Onboarding'],
    }),

    validateOnboardingStep: builder.mutation<
      ApiSuccess<ValidateStepResponse>,
      { stepId: string }
    >({
      query: ({ stepId }) => ({
        url: '/onboarding/validate',
        method: 'POST',
        body: { step: stepId },
      }),
      invalidatesTags: ['Onboarding'],
    }),

    getCurrentUser: builder.query<ApiSuccess<AuthMeResponse>, void>({
      query: () => '/auth/me',
    }),
  }),
});

export const {
  useGetOnboardingStatusQuery,
  useLazyGetOnboardingStatusQuery,
  useUpdateOnboardingStatusMutation,
  useValidateOnboardingQuery,
  useLazyValidateOnboardingQuery,
  useValidateOnboardingStepMutation,
  useGetCurrentUserQuery,
  useLazyGetCurrentUserQuery,
} = onboardingApi;
