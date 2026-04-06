import { NextResponse, NextRequest } from 'next/server';
import { setSecureOrgId } from '@/lib/secureTokens';

/**
 * Cookie lifetime constants (in seconds)
 */
export const COOKIE_LIFETIMES = {
  ACCESS_TOKEN: 15 * 60, // 15 minutes
  REFRESH_TOKEN: 7 * 24 * 60 * 60, // 7 days
  ORG_ID: 7 * 24 * 60 * 60, // 7 days
} as const;

export function getCookieDomain(): string | undefined {
  const baseUrl = process.env.BASE_URL;
  const isProd = process.env.ENVIRONMENT === 'production';

  if (!isProd || !baseUrl) return undefined;

  // remove protocol if present
  const host = baseUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, ''); // remove path

  // localhost or IP → do not set domain
  if (host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return undefined;
  }

  const parts = host.split('.');

  // Need at least example.com
  if (parts.length < 2) return undefined;

  // Keep full host so cookies stay scoped to the current subdomain
  // e.g. demo.hiretrack.in -> demo.hiretrack.in (not .hiretrack.in)
  return host;
}

/**
 * Sets security headers on a response
 */
function setSecurityHeaders(response: NextResponse): void {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'no-referrer-when-downgrade');
}

interface SetAuthCookiesParams {
  response: NextResponse;
  accessToken: string;
  refreshToken: string;
  orgId: string;
}

/**
 * Centralized helper to set all auth-related cookies consistently.
 *
 * This ensures login, refresh, 2FA, and any other auth flows
 * use exactly the same cookie names, lifetimes, and security flags.
 */
export function setAuthCookies({
  response,
  accessToken,
  refreshToken,
  orgId,
}: SetAuthCookiesParams): NextResponse {
  const isProduction = process.env.ENVIRONMENT === 'production';
  const baseCookieOptions = {
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
  };
  // Short-lived access token (30 minutes)
  response.cookies.set('auth_token', accessToken, {
    httpOnly: true,
    ...baseCookieOptions,
    maxAge: COOKIE_LIFETIMES.ACCESS_TOKEN,
  });

  // Auth state flag for client-side checks
  response.cookies.set('auth_state', 'true', {
    ...baseCookieOptions,
    maxAge: COOKIE_LIFETIMES.ACCESS_TOKEN,
    httpOnly: false,
  });

  // Refresh token (7 days)
  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    ...baseCookieOptions,
    maxAge: COOKIE_LIFETIMES.REFRESH_TOKEN,
  });

  // Organization id (7 days) - defer to existing helper for headers/options
  setSecureOrgId(response, orgId, {
    expires: 7,
    maxAge: COOKIE_LIFETIMES.ORG_ID,
    path: '/',
  });

  // Set security headers
  setSecurityHeaders(response);

  return response;
}

/**
 * Updates only the access token while preserving existing refresh_token, device_id, and org_id.
 * Used when token needs to be refreshed without regenerating other auth cookies.
 */
export function updateAccessToken(
  response: NextResponse,
  request: NextRequest,
  newAccessToken: string,
): NextResponse {
  const isProduction = process.env.ENVIRONMENT === 'production';
  const baseCookieOptions = {
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
  };

  // Read existing cookies
  const refreshToken = request.cookies.get('refresh_token')?.value || '';
  const orgId = request.cookies.get('org_id')?.value || '';
  // If we have all required cookies, use full setAuthCookies
  if (refreshToken && orgId) {
    return setAuthCookies({
      response,
      accessToken: newAccessToken,
      refreshToken,
      orgId,
    });
  }

  // Fallback: only update access token and auth_state if other cookies missing
  response.cookies.set('auth_token', newAccessToken, {
    httpOnly: true,
    ...baseCookieOptions,
    maxAge: COOKIE_LIFETIMES.ACCESS_TOKEN,
  });

  response.cookies.set('auth_state', 'true', {
    ...baseCookieOptions,
    httpOnly: false,
    maxAge: COOKIE_LIFETIMES.ACCESS_TOKEN,
  });

  return response;
}

/**
 * Clears all authentication cookies securely.
 * Sets cookies to empty with maxAge: 0 to ensure they're cleared.
 */
export function clearAuthTokens(response: NextResponse): NextResponse {
  const isProduction = process.env.ENVIRONMENT === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    maxAge: 0,
    expires: new Date(0),
    path: '/',
  };

  const authStateCookieOptions = {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'strict' as const,
    maxAge: 0,
    expires: new Date(0),
    path: '/',
  };

  // Clear all auth-related cookies by setting to empty with maxAge: 0
  // This is sufficient - no need for explicit delete() calls
  response.cookies.set('auth_token', '', cookieOptions);
  response.cookies.set('auth_state', '', authStateCookieOptions);
  response.cookies.set('refresh_token', '', cookieOptions);
  response.cookies.set('org_id', '', authStateCookieOptions);

  return response;
}
