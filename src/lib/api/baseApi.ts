import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { AppDispatch } from '@/lib/redux/store';
import {
  acquireRefreshLock,
  broadcastRefreshResult,
  isAnotherTabRefreshing,
  releaseRefreshLock,
  waitForCrossTabRefresh,
} from '@/lib/auth/crossTabRefreshLock';
import logger from '../logger';
import * as Sentry from '@sentry/nextjs';

const PUBLIC_API_PATTERNS: Array<string | { url: string; methods?: string[] }> =
  [
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/forgot-password',
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
    { url: '/api/settings/portal', methods: ['GET'] },
    { url: '/api/settings/captcha', methods: ['GET'] },
    '/api/auth/refresh',
  ];

/**
 * Check if an API endpoint is public (doesn't require authentication)
 * @param url - The full URL of the request
 * @param method - The HTTP method (GET, POST, PUT, DELETE, etc.)
 */
function isPublicEndpoint(url: string, method?: string): boolean {
  if (typeof url !== 'string') return false;

  const normalizedMethod = method?.toUpperCase();


  // Remove query params and normalize trailing slashes for comparison
  const normalizeUrl = (urlStr: string) => {
    const withoutQuery = urlStr.split('?')[0];
    return withoutQuery.endsWith('/')
      ? withoutQuery.slice(0, -1)
      : withoutQuery;
  };

  const normalizedRequestUrl = normalizeUrl(url);

  return PUBLIC_API_PATTERNS.some((pattern) => {
    // Handle object-based patterns with method restrictions
    if (typeof pattern === 'object') {
      const normalizedPatternUrl = normalizeUrl(pattern.url);

      // Exact match only - prevents sub-paths from matching
      if (normalizedRequestUrl !== normalizedPatternUrl) {
        return false;
      }

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
    // Use exact match to prevent sub-path matching
    const normalizedPattern = normalizeUrl(pattern);
    return normalizedRequestUrl === normalizedPattern;
  });
}

/**
 * Singleton to track ongoing refresh token requests
 * Prevents multiple concurrent refresh calls (race condition prevention)
 */
let refreshPromise: Promise<void> | null = null;
let refreshAbortController: AbortController | null = null;
let isRefreshing = false;

type ClientRefreshReason =
  | 'REQUEST_STARTED'
  | 'HTTP_ERROR'
  | 'FORCED_LOGIN_REDIRECT'
  | 'TIMEOUT_ABORT'
  | 'FETCH_USER_SYNC_FAILED';

function captureClientRefreshEvent(
  reason: ClientRefreshReason,
  details: Record<string, unknown> = {},
  level: Sentry.SeverityLevel = 'warning',
) {
  Sentry.withScope((scope) => {
    scope.setTag('module', 'auth');
    scope.setTag('flow', 'refresh_client');
    scope.setTag('reason', reason);
    scope.setLevel(level);
    scope.setContext('auth_refresh_client', details);
    Sentry.captureMessage(`auth.refresh_client.${reason.toLowerCase()}`);
  });
}

/**
 * Refresh access token using httpOnly cookie
 * The refresh token is stored in httpOnly cookie and sent automatically
 * with credentials: "include"
 * @param dispatch - Optional Redux dispatch function to trigger fetchUserFromToken after refresh
 */
async function syncUserAfterRefresh(dispatch?: AppDispatch): Promise<void> {
  if (!dispatch || typeof window === 'undefined') {
    return;
  }

  setTimeout(() => {
    import('@/lib/redux/authSlice')
      .then(({ fetchUserFromToken }) => {
        dispatch(fetchUserFromToken());
      })
      .catch((error) => {
        captureClientRefreshEvent('FETCH_USER_SYNC_FAILED', {
          message: error instanceof Error ? error.message : 'unknown',
        });
        logger.error(
          'Failed to dispatch fetchUserFromToken after token refresh:',
          error,
        );
      });
  }, 100);
}

export async function refreshAccessToken(
  dispatch?: AppDispatch,
): Promise<void> {
  // If a refresh is already in progress, wait for it instead of starting a new one
  // Check both conditions to prevent race conditions
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  if (typeof window !== 'undefined' && isAnotherTabRefreshing()) {
    const crossTabResult = await waitForCrossTabRefresh();
    if (crossTabResult === 'success') {
      logger.info('Refresh token: reused cross-tab refresh');
      await syncUserAfterRefresh(dispatch);
      return;
    }
  }

  // Set flag immediately to prevent race conditions (before creating promise)
  isRefreshing = true;

  // Create new AbortController with timeout
  refreshAbortController = new AbortController();
  const timeoutId = setTimeout(() => {
    refreshAbortController?.abort();
  }, 20000); // 20 second timeout

  // Create the refresh promise
  refreshPromise = (async () => {
    let holdsCrossTabLock = false;

    try {
      if (typeof window !== 'undefined') {
        if (!acquireRefreshLock()) {
          const crossTabResult = await waitForCrossTabRefresh();
          if (crossTabResult === 'success') {
            logger.info('Refresh token: another tab refreshed while waiting');
            await syncUserAfterRefresh(dispatch);
            return;
          }
          acquireRefreshLock();
        }
        holdsCrossTabLock = true;
      }

      const clearClientAuthState = async () => {
        try {
          const { clearAuthSessionOnClientAndServer } = await import(
            '@/lib/clearClientAuthCookies'
          );
          await clearAuthSessionOnClientAndServer();
        } catch (cookieError) {
          logger.error('Failed to clear auth session:', cookieError);
        }

        if (!dispatch) return;
        try {
          const { logout } = await import('@/lib/redux/authSlice');
          dispatch(logout());
        } catch (dispatchError) {
          logger.error('Failed to clear client auth state:', dispatchError);
        }
      };

      logger.info('Refresh token: request started');
      captureClientRefreshEvent(
        'REQUEST_STARTED',
        {
          pathname: typeof window !== 'undefined' ? window.location.pathname : '',
          isRefreshing,
        },
        'info',
      );
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
        captureClientRefreshEvent('HTTP_ERROR', {
          status: response.status,
          pathname: typeof window !== 'undefined' ? window.location.pathname : '',
        });

        broadcastRefreshResult('failure');

        // If refresh fails, redirect to login unless already there (prevents login ↔ dashboard loops)
        await clearClientAuthState();
        if (typeof window !== 'undefined') {
          const path = window.location.pathname + window.location.search;
          const isOnLoginPage = window.location.pathname.startsWith('/auth/login');

          captureClientRefreshEvent('FORCED_LOGIN_REDIRECT', {
            fromPath: path,
            skippedRedirect: isOnLoginPage,
          });

          if (!isOnLoginPage) {
            const loginUrl =
              path && path !== '/auth/login'
                ? `/auth/login?redirect=${encodeURIComponent(path)}`
                : '/auth/login';
            window.location.href = loginUrl;
          }
        }
        throw new Error('Failed to refresh token');
      }

      logger.info('Refresh token: success');
      broadcastRefreshResult('success');

      // Token refresh successful - new tokens are set in httpOnly cookies by the server
      await syncUserAfterRefresh(dispatch);
    } catch (error) {
      clearTimeout(timeoutId);

      if (!(error instanceof Error && error.name === 'AbortError')) {
        broadcastRefreshResult('failure');
      }

      // Handle abort/timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        captureClientRefreshEvent('TIMEOUT_ABORT', {
          timeoutMs: 20000,
          pathname: typeof window !== 'undefined' ? window.location.pathname : '',
        });
        logger.warn('Token refresh request was aborted or timed out');
        // Don't redirect on timeout - let the original request fail naturally
        throw new Error('Token refresh timeout');
      }

      // Re-throw other errors
      throw error;
    } finally {
      if (holdsCrossTabLock) {
        releaseRefreshLock();
      }

      // Clean up singleton state
      refreshPromise = null;
      refreshAbortController = null;
      isRefreshing = false;
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
    logger.warn(`baseQuery 401 on ${fullUrl}, attempting refresh`);
    // Prevent multiple concurrent refresh attempts
    if (isRefreshing && refreshPromise) {
      try {
        logger.info('baseQuery: waiting for in-flight refresh');
        await refreshPromise;
        result = await baseQuery(args, api, extraOptions);
      } catch {
        logger.warn('baseQuery: in-flight refresh failed, returning original 401');
        return result;
      }
    } else {
      try {
        await refreshAccessToken(api.dispatch);
        result = await baseQuery(args, api, extraOptions);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'Token refresh timeout'
        ) {
          logger.warn('baseQuery: refresh timeout, returning original 401');
          return result;
        }
        logger.warn('baseQuery: refresh failed, returning original 401', error);
        return result;
      }
    }
  }

  // Handle aborted/cancelled requests gracefully
  if (result.error) {
    // Check if request was aborted
    if (
      'status' in result.error &&
      (result.error.status === 'FETCH_ERROR' ||
        result.error.status === 'PARSING_ERROR')
    ) {
      const errorMessage = result.error.error || 'Request failed';
      // Check if it's an abort error
      if (
        typeof errorMessage === 'string' &&
        (errorMessage.includes('aborted') ||
          errorMessage.includes('cancelled') ||
          errorMessage.includes('Failed to fetch'))
      ) {
        logger.warn('Request was aborted or cancelled:', fullUrl);
        // Return a more user-friendly error
        return {
          error: {
            status: 'CUSTOM',
            data: { message: 'Request was cancelled. Please try again.' },
          },
        };
      }
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
    /** Job-scoped candidate lists (grouped + per-lane pages) for targeted invalidation */
    'JobCandidates',
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
    'Profile',
    'CronTimezone',
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
