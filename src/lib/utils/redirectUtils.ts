import { ReadonlyURLSearchParams } from 'next/navigation';
import { NextRequest } from 'next/server';
import logger from '@/lib/logger';

/**
 * User role type for redirect logic
 */
export type UserRole = 'candidate' | 'admin' | 'hr' | 'interviewer' | string;

/**
 * User information required for redirect URL determination
 */
export interface UserInfo {
  role?: UserRole;
  organizationInfo?: {
    name?: string;
  };
}

/**
 * Options for getRedirectUrl function
 */
export interface GetRedirectUrlOptions {
  /** User information for role-based redirects */
  user?: UserInfo | null;
  /** Whether user has multiple organizations (affects candidate redirect) */
  isMultiple?: boolean;
  /** Custom redirect URL from query params (client-side) */
  redirectParam?: string | null;
  /** Custom returnUrl from query params (client-side) */
  returnUrlParam?: string | null;
}

/**
 * Validates and sanitizes a redirect URL to prevent open redirect vulnerabilities
 * @param url - The URL to validate
 * @returns The validated URL or null if invalid
 */
function validateRedirectUrl(url: string): string | null {
  try {
    const decodedUrl = decodeURIComponent(url);

    // Security: Only allow relative paths starting with /
    // Prevent protocol-relative URLs (//), external URLs, and auth routes
    if (
      decodedUrl.startsWith('/') &&
      !decodedUrl.startsWith('//') &&
      !decodedUrl.startsWith('/auth/') &&
      !decodedUrl.startsWith('http://') &&
      !decodedUrl.startsWith('https://')
    ) {
      return decodedUrl;
    }
  } catch (error) {
    logger.warn('Invalid redirect URL:', url, error);
  }

  return null;
}

/**
 * Gets the default redirect URL based on user role
 * @param user - User information
 * @param isMultiple - Whether user has multiple organizations
 * @returns Default redirect URL for the user's role
 */
function getDefaultRedirectUrl(
  user?: UserInfo | null,
  isMultiple?: boolean,
): string {
  if (user?.role === 'candidate') {
    return isMultiple && user.organizationInfo?.name
      ? `/apply-jobs?o=${user.organizationInfo.name}`
      : '/apply-jobs';
  }

  if (
    user?.role === 'admin' ||
    user?.role === 'interviewer' ||
    user?.role === 'hr'
  ) {
    return '/dashboard';
  }

  return '/';
}

/**
 * Gets the redirect URL for authenticated users.
 * Supports both client-side (Next.js searchParams) and server-side (NextRequest) usage.
 *
 * Priority:
 * 1. Valid redirect/returnUrl query parameter
 * 2. Role-based default redirects
 * 3. Fallback to '/'
 *
 * @param options - Configuration options
 * @returns The redirect URL to use
 *
 * @example
 * // Client-side usage
 * const searchParams = useSearchParams();
 * const redirectUrl = getRedirectUrl({
 *   user,
 *   isMultiple,
 *   redirectParam: searchParams?.get('redirect'),
 *   returnUrlParam: searchParams?.get('returnUrl'),
 * });
 *
 * @example
 * // Server-side usage
 * const redirectUrl = getRedirectUrl({
 *   user,
 *   redirectParam: request.nextUrl.searchParams.get('redirect'),
 * });
 */
export function getRedirectUrl(options: GetRedirectUrlOptions = {}): string {
  const { user, isMultiple = false, redirectParam, returnUrlParam } = options;

  // Check for redirect or returnUrl query parameter
  const redirectTo = redirectParam || returnUrlParam;

  if (redirectTo) {
    const validatedUrl = validateRedirectUrl(redirectTo);
    if (validatedUrl) {
      return validatedUrl;
    }
  }

  // Fall back to role-based default
  return getDefaultRedirectUrl(user, isMultiple);
}

/**
 * Client-side helper: Gets redirect URL from Next.js searchParams
 * @param searchParams - Next.js ReadonlyURLSearchParams
 * @param user - User information
 * @param isMultiple - Whether user has multiple organizations
 * @returns The redirect URL to use
 */
export function getRedirectUrlFromSearchParams(
  searchParams: ReadonlyURLSearchParams | null,
  user?: UserInfo | null,
  isMultiple?: boolean,
): string {
  return getRedirectUrl({
    user,
    isMultiple,
    redirectParam: searchParams?.get('redirect') || null,
    returnUrlParam: searchParams?.get('returnUrl') || null,
  });
}

/**
 * Server-side helper: Gets redirect URL from NextRequest
 * @param request - Next.js NextRequest
 * @param user - User information
 * @param isMultiple - Whether user has multiple organizations
 * @returns The redirect URL to use
 */
export function getRedirectUrlFromRequest(
  request: NextRequest,
  user?: UserInfo | null,
  isMultiple?: boolean,
): string {
  const { searchParams } = request.nextUrl;
  return getRedirectUrl({
    user,
    isMultiple,
    redirectParam: searchParams.get('redirect'),
    returnUrlParam: searchParams.get('returnUrl'),
  });
}
