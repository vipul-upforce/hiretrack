import { decryptText, encryptText } from '@/lib/encryption';
import { Settings } from '@/lib/mongodb';
import { logger } from '@/lib/logger/logger.server';
import { refreshAccessToken } from '@/lib/microsoft-calendar/config';

export interface TeamsAccessTokenResult {
  accessToken: string;
  refreshToken?: string;
  expiryDate: number;
}

/**
 * Get Microsoft Teams access token using OAuth2 client credentials flow (Application permissions)
 * Used for creating Teams meetings without user context
 */
export async function getTeamsAccessToken(params: {
  organizationId: string;
  teamsConfig: {
    tenantId?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    expiryDate?: number | null;
  };
  forceRefresh?: boolean;
}): Promise<TeamsAccessTokenResult> {
  const { organizationId, teamsConfig, forceRefresh = false } = params;

  if (
    !teamsConfig?.tenantId ||
    !teamsConfig?.clientId ||
    !teamsConfig?.clientSecret
  ) {
    throw new Error('Microsoft Teams credentials are not configured');
  }

  const now = Date.now();
  const tokenExpiry = teamsConfig.expiryDate || 0;
  const hasValidToken =
    !forceRefresh && teamsConfig.accessToken && tokenExpiry > now + 60_000;

  if (hasValidToken) {
    return {
      accessToken: decryptText(teamsConfig.accessToken || '', organizationId),
      refreshToken: teamsConfig.refreshToken
        ? decryptText(teamsConfig.refreshToken, organizationId)
        : undefined,
      expiryDate: tokenExpiry,
    };
  }

  // Microsoft Graph API OAuth2 token endpoint (Application permissions)
  const tokenUrl = `https://login.microsoftonline.com/${teamsConfig.tenantId}/oauth2/v2.0/token`;

  const clientSecret = decryptText(teamsConfig.clientSecret, organizationId);

  const tokenParams = new URLSearchParams({
    client_id: teamsConfig.clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(
      { status: response.status, errorText },
      'Microsoft Teams token request failed',
    );
    throw new Error('Failed to authenticate with Microsoft Teams');
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const accessToken = data.access_token;
  const refreshToken = data.refresh_token;
  const expiryDate = now + (data.expires_in || 3600) * 1000;

  const updateData: Record<string, unknown> = {
    'microsoftTeams.accessToken': encryptText(accessToken, organizationId),
    'microsoftTeams.expiryDate': expiryDate,
    'microsoftTeams.isConnected': true,
  };

  if (refreshToken) {
    updateData['microsoftTeams.refreshToken'] = encryptText(
      refreshToken,
      organizationId,
    );
  }

  await Settings?.findOneAndUpdate(
    { organizationId },
    {
      $set: updateData,
    },
    { new: true },
  );

  return {
    accessToken,
    refreshToken,
    expiryDate,
  };
}

/**
 * Get Microsoft Calendar access token using OAuth2 delegated permissions
 * Used for creating Outlook Calendar events with user context
 */
export async function getMicrosoftCalendarAccessToken(params: {
  organizationId: string;
  teamsConfig: {
    tenantId?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    expiryDate?: number | null;
  };
  forceRefresh?: boolean;
}): Promise<TeamsAccessTokenResult> {
  const { organizationId, teamsConfig, forceRefresh = false } = params;

  if (
    !teamsConfig?.tenantId ||
    !teamsConfig?.clientId ||
    !teamsConfig?.clientSecret
  ) {
    throw new Error('Microsoft Calendar credentials are not configured');
  }

  // If we have a refresh token, use delegated OAuth2 flow
  // Important: We must always refresh here and never use the cached accessToken,
  // because the same cache is overwritten by getTeamsAccessToken (client_credentials).
  // Using a cached token could send an application token to /me endpoints -> BadRequest.
  if (teamsConfig.refreshToken) {
    // Refresh the token using refresh token (always, to ensure we get a delegated token)
    try {
      const clientSecret = decryptText(
        teamsConfig.clientSecret,
        organizationId,
      );
      const refreshToken = decryptText(
        teamsConfig.refreshToken,
        organizationId,
      );

      const tokens = await refreshAccessToken(
        teamsConfig.tenantId,
        teamsConfig.clientId,
        clientSecret,
        refreshToken,
      );

      // Update settings with new tokens
      await Settings?.findOneAndUpdate(
        { organizationId },
        {
          $set: {
            'microsoftTeams.accessToken': encryptText(
              tokens.access_token,
              organizationId,
            ),
            'microsoftTeams.refreshToken': encryptText(
              tokens.refresh_token || refreshToken,
              organizationId,
            ),
            'microsoftTeams.expiryDate': tokens.expiry_date || null,
          },
        },
        { new: true },
      );

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || refreshToken,
        expiryDate: tokens.expiry_date || Date.now() + 3600 * 1000,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to refresh Microsoft Calendar token');
      throw new Error('Failed to refresh access token. Please reconnect.');
    }
  }

  // Fallback to application-only token if no refresh token
  return getTeamsAccessToken({ organizationId, teamsConfig, forceRefresh });
}
