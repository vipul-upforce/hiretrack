import { baseApi } from '@/lib/api/baseApi';
import { OneOfMulOrganization } from '@/components/auth/OrganizationDialog';
import { OrgInfo } from '@/lib/models/user';
import { NextResponse } from 'next/server';
import { logout } from '@/lib/redux/authSlice';

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

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, AuthRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    signup: builder.mutation<AuthResponse, AuthRequest>({
      query: (credentials) => ({
        url: '/auth/signup',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Users'], // Ensure correct format
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
      void // No body needed - uses httpOnly cookie
    >({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
        // No body - refresh token is in httpOnly cookie
      }),
    }),
    logoutUser: builder.mutation<{ message?: string }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'GET',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
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
} = authApi;
