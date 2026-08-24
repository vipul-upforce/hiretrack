import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { getTeamsAccessToken } from '@/lib/microsoft-teams/teamsAuth';
import { logger } from '@/lib/logger/logger.server';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const userData = await getAuthenticatedUser(req, ['admin', 'hr']);

    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = userData.organizationId || '';

    if (!Settings) {
      return NextResponse.json(
        { error: 'Settings Model Not Found' },
        { status: 404 },
      );
    }

    const settings = await Settings.findOne({ organizationId })
      .select('microsoftTeams')
      .lean();

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    if (
      !settings?.microsoftTeams?.tenantId ||
      !settings.microsoftTeams.clientId ||
      !settings.microsoftTeams.clientSecret
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Microsoft Teams credentials are not configured',
          error: 'Please configure your Microsoft Teams credentials first',
        },
        { status: 400 },
      );
    }

    // Test connection by getting an access token
    try {
      const { accessToken } = await getTeamsAccessToken({
        organizationId,
        teamsConfig: settings.microsoftTeams,
        forceRefresh: true,
      });
      // Even if the /me endpoint fails (expected for app-only tokens),
      // if we got a token, the connection is working
      const isTokenValid = accessToken && accessToken.length > 0;

      if (isTokenValid) {
        // Update connection status
        await Settings.findOneAndUpdate(
          { organizationId },
          {
            $set: {
              'microsoftTeams.isConnected': true,
            },
          },
        );

        return NextResponse.json({
          success: true,
          message: 'Microsoft Teams connection test successful',
          details: 'Successfully authenticated with Microsoft Graph API',
          data: {
            connectedEmail: settings.microsoftTeams.connectedEmail || '',
            lastTestedAt: new Date().toISOString(),
          },
          connectionStatusUpdated: true,
        });
      }
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to obtain access token',
          error: 'Invalid credentials or insufficient permissions',
        },
        { status: 401 },
      );
    } catch (authError) {
      logger.error(
        { error: authError },
        'Microsoft Teams authentication error',
      );

      return NextResponse.json(
        {
          success: false,
          message: 'Authentication failed',
          error:
            authError instanceof Error
              ? authError.message
              : 'Failed to authenticate with Microsoft Graph API',
          details:
            'Please verify your Tenant ID, Client ID, and Client Secret are correct',
        },
        { status: 401 },
      );
    }
  } catch (error) {
    logger.error({ error }, 'Microsoft Teams test connection error');

    return NextResponse.json(
      {
        success: false,
        message: 'Connection test failed',
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
