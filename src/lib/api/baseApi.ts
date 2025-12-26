import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { Dispatch, AnyAction } from '@reduxjs/toolkit';
import logger from '../logger';

const PUBLIC_API_PATTERNS: Array<string | { url: string; methods?: string[] }> =
  [
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/2fa/send-otp',
    '/api/auth/2fa/verify-otp',
    { url: 'api/jobs/open', methods: ['GET'] },
    '/api/jobs/open-jobs',
    { url: '/api/organization', methods: ['GET'] },
    '/api/orgs',
    '/api/candidates/signup',
    '/api/candidates/guest-apply',
    '/api/candidates/apply-application',
    '/api/candidates/evaluate',
    { url: '/api/event-mail', methods: ['GET'] },
    '/api/candidates/event-mail',
    '/api/files',
    '/api/file-proxy',
    '/api/file',
    '/api/shared-files',
    { url: '/api/organization/tags', methods: ['GET'] },
    // GET is public, but PUT/POST/DELETE require auth
    { url: '/api/settings/portal', methods: ['GET'] },
    { url: '/api/settings/captcha', methods: ['GET'] },
    '/api/license-validate',
  ];

/**
 * Check if an API endpoint is public (doesn't require authentication)
 * @param url - The full URL of the request
 * @param method - The HTTP method (GET, POST, PUT, DELETE, etc.)
 */
function isPublicEndpoint(url: string, method?: string): boolean {
  if (typeof url !== 'string') return false;

  const normalizedMethod = method?.toUpperCase();

  return PUBLIC_API_PATTERNS.some((pattern) => {
    // Handle object-based patterns with method restrictions
    if (typeof pattern === 'object') {
      const matchesUrl = url.includes(pattern.url);
      if (!matchesUrl) return false;

      // If methods are specified, check if current method is in the list
      if (pattern.methods && normalizedMethod) {
        return pattern.methods
          .map((m) => m.toUpperCase())
          .includes(normalizedMethod);
      }

      // If no methods specified, all methods are public for this URL
      return true;
    }

    // Handle string-based patterns (all methods are public)
    return url.includes(pattern);
  });
}

/**
 * Singleton to track ongoing refresh token requests
 * Prevents multiple concurrent refresh calls (race condition prevention)
 */
let refreshPromise: Promise<void> | null = null;
let refreshAbortController: AbortController | null = null;

/**
 * Refresh access token using httpOnly cookie
 * The refresh token is stored in httpOnly cookie and sent automatically
 * with credentials: "include"
 * @param dispatch - Optional Redux dispatch function to trigger fetchUserFromToken after refresh
 */
export async function refreshAccessToken(
  dispatch?: Dispatch<AnyAction>,
): Promise<void> {
  // If a refresh is already in progress, wait for it instead of starting a new one
  if (refreshPromise) {
    return refreshPromise;
  }

  // Create new AbortController with timeout
  refreshAbortController = new AbortController();
  const timeoutId = setTimeout(() => {
    refreshAbortController?.abort();
  }, 20000); // 20 second timeout

  // Create the refresh promise
  refreshPromise = (async () => {
    try {
      const response = await fetch(`/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // This sends httpOnly cookies automatically
        signal: refreshAbortController!.signal, // Add abort signal
        // No body needed - refresh token is in httpOnly cookie
      });

      clearTimeout(timeoutId);

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
        if (typeof window !== 'undefined' || response.status === 401) {
          window.location.href = '/auth/login';
        }
        throw new Error('Failed to refresh token');
      }

      // Token refresh successful - new tokens are set in httpOnly cookies by the server
      // Dispatch fetchUserFromToken to update user state
      if (dispatch && typeof window !== 'undefined') {
        // Use dynamic import to avoid circular dependency
        import('@/lib/redux/authSlice')
          .then(({ fetchUserFromToken }) => {
            dispatch(fetchUserFromToken());
          })
          .catch((error) => {
            // Log error but don't throw - token refresh was successful
            logger.error(
              'Failed to dispatch fetchUserFromToken after token refresh:',
              error,
            );
          });
      }
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort/timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn('Token refresh request was aborted or timed out');
        // Don't redirect on timeout - let the original request fail naturally
        throw new Error('Token refresh timeout');
      }

      // Re-throw other errors
      throw error;
    } finally {
      // Clean up singleton state
      refreshPromise = null;
      refreshAbortController = null;
    }
  })();

  return refreshPromise;
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

  // Extract URL and method from args
  const fullUrl = typeof args === 'string' ? `/api${args}` : `/api${args.url}`;
  const method =
    typeof args === 'string' ? 'GET' : args.method?.toUpperCase() || 'GET';

  const isPublic = isPublicEndpoint(fullUrl, method);
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
      // Pass dispatch to trigger fetchUserFromToken after successful refresh
      await refreshAccessToken(api.dispatch);
      result = await baseQuery(args, api, extraOptions);
    } catch (error) {
      // Handle timeout/abort errors gracefully
      if (error instanceof Error && error.message === 'Token refresh timeout') {
        // Return the original 401 - don't redirect on timeout
        return result;
      }
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
 * @param url - The full URL of the request
 * @param method - Optional HTTP method (GET, POST, PUT, DELETE, etc.)
 */
export function shouldSkipAuth(url: string, method?: string): boolean {
  return isPublicEndpoint(url, method);
}
