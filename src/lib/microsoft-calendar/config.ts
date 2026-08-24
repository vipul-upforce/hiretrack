/**
 * Microsoft Graph API Calendar OAuth2 Configuration
 * Similar to Google Calendar OAuth2 flow
 */

export const MICROSOFT_CALENDAR_SCOPES = [
  'Calendars.ReadWrite',
  'User.Read',
  'OnlineMeetings.ReadWrite', // Required for creating Teams meetings
  'offline_access', // Required for refresh token
];

export interface MicrosoftCalendarConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface MicrosoftCalendarTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expiry_date?: number;
  scope?: string;
  token_type?: string;
}

/**
 * Get Microsoft OAuth2 authorization URL
 */
export function getMicrosoftAuthUrl(
  tenantId: string,
  clientId: string,
  redirectUri: string,
  state: string,
  useAdminConsent = false,
): string {
  const scopes = MICROSOFT_CALENDAR_SCOPES.join(' ');
  
  if (useAdminConsent) {
    // Use admin consent endpoint for tenant-wide consent
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    });
    // Admin consent uses different scope format
    const scopeParam = scopes.split(' ').map(s => `https://graph.microsoft.com/${s}`).join(' ');
    return `https://login.microsoftonline.com/${tenantId}/adminconsent?${params.toString()}&scope=${encodeURIComponent(scopeParam)}`;
  }
  
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: scopes,
    state,
    prompt: 'select_account', // Use select_account instead of consent to avoid admin approval prompt if admin consent already granted
  });

  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Get redirect URI for Microsoft OAuth callback
 */
export function getMicrosoftRedirectUri(req: Request): string {
  const url = new URL(req.url);
  if (process.env.ENVIRONMENT === 'production' && process.env.BASE_URL) {
    const baseUrl = process.env.BASE_URL || `${url.protocol}//${url.host}`;
    return `${baseUrl}/api/auth/microsoft/callback`;
  }
  const baseUrl = `${url.protocol}//${url.host}`;
  return `${baseUrl}/api/auth/microsoft/callback`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<MicrosoftCalendarTokens> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    scope: MICROSOFT_CALENDAR_SCOPES.join(' '),
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${errorText}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expiry_date: data.expires_in
      ? Date.now() + data.expires_in * 1000
      : undefined,
    scope: data.scope,
    token_type: data.token_type,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<MicrosoftCalendarTokens> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: MICROSOFT_CALENDAR_SCOPES.join(' '),
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${errorText}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken, // Keep old refresh token if new one not provided
    expires_in: data.expires_in,
    expiry_date: data.expires_in
      ? Date.now() + data.expires_in * 1000
      : undefined,
    scope: data.scope,
    token_type: data.token_type,
  };
}
