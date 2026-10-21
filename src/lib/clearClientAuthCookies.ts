import Cookies from 'js-cookie';
import logger from '@/lib/logger';

const CLIENT_AUTH_COOKIE_NAMES = ['auth_state', 'org_id'] as const;

/**
 * Clears client-readable auth cookies (auth_state, org_id).
 * Removes host-only and legacy domain=localhost variants to avoid stale session flags.
 */
export function clearClientAuthCookies(): void {
  CLIENT_AUTH_COOKIE_NAMES.forEach((name) => {
    Cookies.remove(name);
    Cookies.remove(name, { path: '/' });
    Cookies.remove(name, { path: '/', domain: 'localhost' });
  });
}

/**
 * Clears httpOnly auth cookies server-side, then client-readable session flags.
 * Best-effort: never throws; safe to call after refresh hard failures.
 */
export async function clearAuthSessionOnClientAndServer(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'GET',
      credentials: 'include',
    });
  } catch (error) {
    logger.warn('Server logout during auth cleanup failed:', error);
  }

  clearClientAuthCookies();
}
