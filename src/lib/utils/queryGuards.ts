import type { FetchArgs } from '@reduxjs/toolkit/query';
import Cookies from 'js-cookie';

interface CookieContext {
  token: string;
  orgId?: string;
}

interface CookieGuardOptions<TResponse> {
  cookieName?: string;
  orgIdCookieName?: string;
  emptyResponse?: TResponse;
}

/**
 * Guards an RTK Query `queryFn` so it only executes when a cookie exists.
 * Returns empty response if token is missing, preventing unnecessary API calls.
 *
 * @example
 * ```ts
 * queryFn: (_arg, _api, _extraOptions, baseQuery) =>
 *   runIfCookiePresent(baseQuery, () => ({ url: '/endpoint', method: 'GET' }))
 * ```
 */
export function runIfCookiePresent<
  TResult = unknown,
  TArgs extends string | FetchArgs = FetchArgs
>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  baseQuery: (args: TArgs) => any,
  buildRequest: (context?: CookieContext) => TArgs,
  options: CookieGuardOptions<TResult> = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const {
    cookieName = 'auth_state',
    orgIdCookieName = 'org_id',
    emptyResponse = null as TResult,
  } = options;

  const token = Cookies.get(cookieName);
  const orgId = Cookies.get(orgIdCookieName);

  if (!token) {
    return Promise.resolve({ data: emptyResponse });
  }

  const request = buildRequest({ token, orgId: orgId ?? undefined });

  if (typeof request === 'string') {
    return baseQuery(request as TArgs);
  }

  const fetchArgs: FetchArgs = request as FetchArgs;
  return baseQuery({
    ...fetchArgs,
    credentials: fetchArgs.credentials ?? 'include',
  } as TArgs);
}
