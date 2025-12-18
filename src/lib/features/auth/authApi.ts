import { baseApi } from '@/lib/api/baseApi';
import { OneOfMulOrganization } from '@/components/auth/OrganizationDialog';
import { OrgInfo } from '@/lib/models/user';
import { NextResponse } from 'next/server';
import { fetchUserFromToken, ILocalUser, logout } from '@/lib/redux/authSlice';
import logger from '@/lib/logger';

interface AuthRequest {
  email: string;
  password: string;
  name?: string;
  confirmPassword?: string;
  orgId?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationInfo?: OrgInfo;
}

interface AuthResponse {
  message: string;
  user: User;
  _id?: string;
  twofa?: boolean;
  organizationId?: string;
  organizations?: OneOfMulOrganization[];
}

interface VerifyOtpRequest {
  email: string;
  otp: string;
}

interface SendOtpRequest {
  email: string;
  organizationId?: string | null;
}

interface LicenseResponse {
  valid: boolean;
  error?: string;
  apiError?: boolean;
  hasLicenseFile?: boolean;
}

interface GetMeResponse {
  user: ILocalUser;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<GetMeResponse, void>({
      query: () => '/auth/me',
      providesTags: ['Users'],
    }),
    login: builder.mutation<AuthResponse, AuthRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Users'],
    }),
    signup: builder.mutation<AuthResponse, AuthRequest>({
      query: (credentials) => ({
        url: '/auth/signup',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Users'],
    }),
    verifyOtp: builder.mutation<AuthResponse, VerifyOtpRequest>({
      query: (data) => ({
        url: '/auth/2fa/verify-otp',
        method: 'POST',
        body: data,
      }),
    }),
    sendOtp: builder.mutation<{ message: string }, SendOtpRequest>({
      query: (data) => ({
        url: '/auth/2fa/send-otp',
        method: 'POST',
        body: data,
      }),
    }),
    validateLicense: builder.query<LicenseResponse, void>({
      query: () => ({
        url: '/license-validate',
        method: 'GET',
      }),
    }),
    resetPasswordbyAdmin: builder.mutation<
      NextResponse,
      { password: string; candidateId: string }
    >({
      query: (creds) => ({
        url: '/auth/reset-password',
        method: 'PUT',
        body: creds,
      }),
    }),
    resetPasswordbyUser: builder.mutation<
      NextResponse,
      { password: string; token: string }
    >({
      query: (creds) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: creds,
      }),
    }),
    refreshToken: builder.mutation<
      { message: string; refreshToken: string; licenseValid: boolean },
      void
    >({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(fetchUserFromToken());
        } catch (error) {
          logger.error('Error fetching user from token : ', error);
        }
      },
    }),
    logoutUser: builder.mutation<{ message?: string }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'GET',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (err) {
          logger.error('Logout API failed', err);
        } finally {
          dispatch(logout());
        }
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useResetPasswordbyAdminMutation,
  useResetPasswordbyUserMutation,
  useRefreshTokenMutation,
  useLogoutUserMutation,
  useVerifyOtpMutation,
  useSendOtpMutation,
  useLazyValidateLicenseQuery,
  useGetMeQuery,
} = authApi;
