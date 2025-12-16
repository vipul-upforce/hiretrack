import { NextResponse, NextRequest } from 'next/server';
import { setSecureOrgId } from '@/lib/secureTokens';

/**
 * Cookie lifetime constants (in seconds)
 */
export const COOKIE_LIFETIMES = {
  ACCESS_TOKEN: 15 * 60, // 15 minutes
  REFRESH_TOKEN: 7 * 24 * 60 * 60, // 7 days
  DEVICE_ID: 7 * 24 * 60 * 60, // 7 days
  ORG_ID: 7 * 24 * 60 * 60, // 7 days
} as const;

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
  deviceId: string;
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
  deviceId,
  orgId,
}: SetAuthCookiesParams): NextResponse {
  const isProduction = process.env.ENVIRONMENT === 'production';

  // Short-lived access token (15 minutes)
  response.cookies.set('auth_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: COOKIE_LIFETIMES.ACCESS_TOKEN,
    path: '/',
  });

  // Auth state flag for client-side checks
  response.cookies.set('auth_state', 'true', {
    secure: isProduction,
    sameSite: 'strict',
    maxAge: COOKIE_LIFETIMES.ACCESS_TOKEN,
    path: '/',
  });

  // Refresh token (7 days)
  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: COOKIE_LIFETIMES.REFRESH_TOKEN,
    path: '/',
  });

  // Device identifier (7 days)
  response.cookies.set('device_id', deviceId, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: COOKIE_LIFETIMES.DEVICE_ID,
    path: '/',
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

  // Read existing cookies
  const refreshToken = request.cookies.get('refresh_token')?.value || '';
  const deviceId = request.cookies.get('device_id')?.value || '';
  const orgId = request.cookies.get('org_id')?.value || '';

  // If we have all required cookies, use full setAuthCookies
  if (refreshToken && deviceId && orgId) {
    return setAuthCookies({
      response,
      accessToken: newAccessToken,
      refreshToken,
      deviceId,
      orgId,
    });
  }

  // Fallback: only update access token and auth_state if other cookies missing
  response.cookies.set('auth_token', newAccessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: COOKIE_LIFETIMES.ACCESS_TOKEN,
    path: '/',
  });

  response.cookies.set('auth_state', 'true', {
    secure: isProduction,
    sameSite: 'strict',
    maxAge: COOKIE_LIFETIMES.ACCESS_TOKEN,
    path: '/',
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
  response.cookies.set('device_id', '', cookieOptions);
  response.cookies.set('org_id', '', authStateCookieOptions);

  return response;
}
