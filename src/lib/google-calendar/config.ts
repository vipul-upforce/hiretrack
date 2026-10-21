import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
];

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleCalendarTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  scope?: string;
  token_type?: string;
}

export function createOAuth2Client(config: GoogleCalendarConfig): OAuth2Client {
  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri,
  );
}

export function getAuthUrl(oauth2Client: OAuth2Client): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_CALENDAR_SCOPES,
    prompt: 'consent', // This forces re-consent and ensures refresh token
  });
}

export function getRedirectUri(req: Request): string {
  const url = new URL(req.url);
  if (process.env.ENVIRONMENT === 'production' && process.env.BASE_URL) {
    const baseUrl = process.env.BASE_URL || `${url.protocol}//${url.host}`;
    return `${baseUrl}/api/auth/google/callback`;
  }
  const baseUrl = `${url.protocol}//${url.host}`;
  return `${baseUrl}/api/auth/google/callback`;
}
