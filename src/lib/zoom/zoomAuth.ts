import { decryptText, encryptText } from '@/lib/encryption';
import { Settings } from '@/lib/mongodb';
import { logger } from '@/lib/logger/logger.server';

export interface ZoomAccessTokenResult {
  accessToken: string;
  expiryDate: number;
}

export async function getZoomAccessToken(params: {
  organizationId: string;
  zoomConfig: {
    accountId?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    expiryDate?: number | null;
  };
  forceRefresh?: boolean;
}): Promise<ZoomAccessTokenResult> {
  const { organizationId, zoomConfig, forceRefresh = false } = params;

  if (!zoomConfig?.accountId || !zoomConfig?.clientId || !zoomConfig?.clientSecret) {
    throw new Error('Zoom credentials are not configured');
  }

  const now = Date.now();
  const tokenExpiry = zoomConfig.expiryDate || 0;
  const hasValidToken =
    !forceRefresh && zoomConfig.accessToken && tokenExpiry > now + 60_000;

  if (hasValidToken) {
    return {
      accessToken: decryptText(zoomConfig.accessToken || '', organizationId),
      expiryDate: tokenExpiry,
    };
  }

  const clientSecret = decryptText(zoomConfig.clientSecret, organizationId);
  const basicAuth = Buffer.from(
    `${zoomConfig.clientId}:${clientSecret}`,
  ).toString('base64');

  const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(
    zoomConfig.accountId,
  )}`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(
      { status: response.status, errorText },
      'Zoom token request failed',
    );
    throw new Error('Failed to authenticate with Zoom');
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };

  const accessToken = data.access_token;
  const expiryDate = now + (data.expires_in || 3600) * 1000;

  await Settings?.findOneAndUpdate(
    { organizationId },
    {
      $set: {
        'zoom.accessToken': encryptText(accessToken, organizationId),
        'zoom.expiryDate': expiryDate,
        'zoom.isConnected': true,
      },
    },
    { new: true },
  );

  return { accessToken, expiryDate };
}
