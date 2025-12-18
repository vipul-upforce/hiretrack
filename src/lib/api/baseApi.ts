import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

/**
 * Configuration for public API endpoints that don't require authentication
 * These endpoints will skip token refresh logic on 401 errors
 */
const PUBLIC_API_PATTERNS = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/2fa/send-otp',
  '/api/auth/2fa/verify-otp',
  '/api/jobs/open',
  '/api/jobs/open-jobs',
  '/api/organization',
  '/api/orgs',
  '/api/candidates/signup',
  '/api/candidates/guest-apply',
  '/api/candidates/apply-application',
  '/api/candidates/evaluate',
  '/api/event-mail',
  '/api/candidates/event-mail',
  '/api/files',
  '/api/file-proxy',
  '/api/file',
  '/api/shared-files',
  '/api/organization/cs/',
  '/api/organization/tags',
  '/api/settings/portal',
  '/api/settings/captcha',
  '/api/license-validate',
];

/**
 * Check if an API endpoint is public (doesn't require authentication)
 */
function isPublicEndpoint(url: string): boolean {
  if (typeof url !== 'string') return false;
  return PUBLIC_API_PATTERNS.some((pattern) => url.includes(pattern));
}

/**
 * Refresh access token using httpOnly cookie
 * The refresh token is stored in httpOnly cookie and sent automatically
 * with credentials: "include"
 */
async function refreshAccessToken(): Promise<void> {
  const response = await fetch(`/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // This sends httpOnly cookies automatically
    // No body needed - refresh token is in httpOnly cookie
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    // Handle license validation failure
    if (response.status === 403 && errorData.code === 'LICENSE_INVALID') {
      const errorMessage =
        errorData.licenseError || 'License validation failed';
      if (typeof window !== 'undefined') {
        window.location.href = `/auth/login?error=license_invalid&message=${encodeURIComponent(
          errorMessage,
        )}`;
      }
      throw new Error('License validation failed');
    }

    // If refresh fails, redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
    throw new Error('Failed to refresh token');
  }

  // Token refresh successful - new tokens are set in httpOnly cookies by the server
  // No need to store anything client-side
}

/**
 * Custom base query with automatic token refresh
 * Handles 401 errors by refreshing tokens and retrying requests
 */
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const baseQuery = fetchBaseQuery({
    baseUrl: '/api',
    credentials: 'include', // Send httpOnly cookies with every request
  });
  const fullUrl = typeof args === 'string' ? `/api${args}` : `/api${args.url}`;
  const isPublic = isPublicEndpoint(fullUrl);
  // Execute the original request
  let result = await baseQuery(args, api, extraOptions);

  // Handle 401 errors (unauthorized) - but skip for public endpoints and refresh endpoint
  if (
    result.error &&
    'status' in result.error &&
    result.error.status === 401 &&
    !isPublic &&
    !fullUrl.includes('/auth/refresh')
  ) {
    try {
      // Attempt to refresh the token using httpOnly cookie
      await refreshAccessToken();
      result = await baseQuery(args, api, extraOptions);
    } catch {
      // Refresh failed - redirect to login (already handled in refreshAccessToken)
      return result; // Return the original 401 error
    }
  }

  // Extract and format error messages if available
  if (result.error && 'data' in result.error) {
    const errorData = result.error.data as { message?: string } | string;
    if (typeof errorData === 'object' && errorData?.message) {
      // Error message is already extracted, return as is
      return result;
    }
  }

  return result;
};

/**
 * Base API instance with automatic token refresh
 * All other APIs should extend from this baseApi
 */
export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Users',
    'Jobs',
    'Candidates',
    'Organizations',
    'Settings',
    'Batches',
    'Tags',
    'Backups',
    'NginxLogs',
    'ServerLogs',
    'EmailHistory',
    'Assets',
    'AutoUpdate',
    'SystemUpdate',
    'VersionList',
    'DiskSpace',
    'PM2Logs',
    'Candidate',
    'CandidateApplication',
    'Lane',
    'DefaultLanes',
    'Job',
    'Notifications',
    'Notification',
    'NotificationCount',
    'Analytics',
    'JobLaneConfig',
    'ChecklistTemplate',
    'CandidateChecklist',
    'Onboarding',
    'EmailNotificationGlobal',
    'EmailNotificationOrganization',
    'organizationSettings',
    'EmailNotificationJob',
    'EmailNotificationUser',
  ],
  endpoints: () => ({}),
});

/**
 * Helper function to check if an endpoint should be treated as public
 */
export function shouldSkipAuth(url: string): boolean {
  return isPublicEndpoint(url);
}
