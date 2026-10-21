import { baseApi } from '@/lib/api/baseApi';
import { OneOfMulOrganization } from '@/components/auth/OrganizationDialog';
import { OrgInfo } from '@/lib/models/user';
import { NextResponse } from 'next/server';
import { fetchUserFromToken, ILocalUser, logout } from '@/lib/redux/authSlice';
import logger from '@/lib/logger';
import { portalApi } from '../settings';

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
  tokenVersion?: number;
  fileStorage?: string;
}

interface AuthResponse {
  message: string;
  loggedIn?: boolean;
  user: User;
  _id?: string;
  twofa?: boolean;
  isCandidate?: boolean;
  organizationId?: string;
  organizations?: OneOfMulOrganization[];
}

interface VerifyOtpRequest {
  email: string;
  otp: string;
  isCandidate?: boolean;
}

interface SendOtpRequest {
  email: string;
  organizationId?: string | null;
  isCandidate?: boolean;
}

interface GetMeResponse {
  user: ILocalUser;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<GetMeResponse, void>({
      query: () => '/auth/me',
      providesTags: ['Profile'],
    }),
    login: builder.mutation<AuthResponse, AuthRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const result = await queryFulfilled;
          // Only invalidate tags if login was successful
          if (result.data.loggedIn === true) {
            // Manually invalidate the Users tag only on successful login
            dispatch(authApi.util.invalidateTags(['Profile']));
            dispatch(portalApi.util.invalidateTags(['Settings']));
          }
        } catch (error) {
          // Don't invalidate on error
          logger.error('Login failed:', error);
        }
      },
    }),
    signup: builder.mutation<AuthResponse, AuthRequest>({
      query: (credentials) => ({
        url: '/auth/signup',
        method: 'POST',
        body: credentials,
      }),
    }),
    verifyOtp: builder.mutation<AuthResponse, VerifyOtpRequest>({
      query: (data) => ({
        url: '/auth/2fa/verify-otp',
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const result = await queryFulfilled;
          if (result.data.loggedIn === true) {
            dispatch(portalApi.util.invalidateTags(['Settings']));
          }
        } catch (error) {
          logger.error('Error verifying OTP : ', error);
        }
      },
    }),
    sendOtp: builder.mutation<{ message: string }, SendOtpRequest>({
      query: (data) => ({
        url: '/auth/2fa/send-otp',
        method: 'POST',
        body: data,
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
    // refreshToken: builder.mutation<
    //   { message: string; refreshToken: string },
    //   void
    // >({
    //   query: () => ({
    //     url: '/auth/refresh',
    //     method: 'POST',
    //   }),
    //   async onQueryStarted(_, { dispatch, queryFulfilled }) {
    //     try {
    //       await queryFulfilled;
    //       dispatch(fetchUserFromToken());
    //     } catch (error) {
    //       logger.error('Error fetching user from token : ', error);
    //     }
    //   },
    // }),
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
  useLogoutUserMutation,
  useVerifyOtpMutation,
  useSendOtpMutation,
  useGetMeQuery,
} = authApi;
