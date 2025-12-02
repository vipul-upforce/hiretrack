import { OneOfMulOrganization } from "@/components/auth/OrganizationDialog";
import { OrgInfo } from "@/lib/models/user";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { NextResponse } from "next/server";

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

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    credentials: "include", // Important for cookies
  }),
  tagTypes: ["Users"],
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, AuthRequest>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),
    signup: builder.mutation<AuthResponse, AuthRequest>({
      query: (credentials) => ({
        url: "/auth/signup",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Users"], // Ensure correct format
    }),
    resetPasswordbyAdmin: builder.mutation<
      NextResponse,
      { password: string; candidateId: string }
    >({
      query: (creds) => ({
        url: "/auth/reset-password",
        method: "PUT",
        body: creds,
      }),
    }),
    resetPasswordbyUser: builder.mutation<
      NextResponse,
      { password: string; token: string }
    >({
      query: (creds) => ({
        url: "/auth/reset-password",
        method: "POST",
        body: creds,
      }),
    }),
    refreshToken: builder.mutation<
      { message: string; refreshToken: string; licenseValid: boolean },
      { refreshToken: string }
    >({
      query: (creds) => ({
        url: "/auth/refresh",
        method: "POST",
        body: creds,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useResetPasswordbyAdminMutation,
  useResetPasswordbyUserMutation,
  useRefreshTokenMutation,
} = authApi;
