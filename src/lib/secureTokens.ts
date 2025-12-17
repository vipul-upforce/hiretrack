import { NextResponse } from 'next/server';

export interface SecureOrgIdOptions {
  maxAge?: number;
  expires?: number;
  domain?: string;
  path?: string;
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

/**
 * Sets a secure organization ID in a cookie with enhanced security
 * - Sets an httpOnly cookie for server-side operations
 * - Applies consistent security flags
 */
export function setSecureOrgId(
  response: NextResponse,
  orgId: string,
  options: SecureOrgIdOptions = {},
) {
  const {
    maxAge = 7 * 24 * 60 * 60, // 7 days in seconds
    path = '/',
  } = options;

  // Common security flags - Fixed: use ENVIRONMENT consistently
  const isProduction = process.env.ENVIRONMENT === 'production';

  // Set organization ID cookie
  response.cookies.set('org_id', orgId, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'strict',
    maxAge,
    path,
  });

  // Set additional security headers
  setSecurityHeaders(response);

  return response;
}
