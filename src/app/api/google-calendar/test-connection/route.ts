import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { createOAuth2Client } from '@/lib/google-calendar/config';
import { decryptText } from '@/lib/encryption';
import { google } from 'googleapis';
import { logger } from '@/lib/logger/logger.server';

// Safe getter for Settings model
async function getSettingsModel() {
  try {
    await connectToDatabase();
    if (Settings) {
      return Settings;
    }
    // If Settings is still null, try to re-import
    const { Settings: ReimportedSettings } = await import('@/lib/mongodb');
    if (ReimportedSettings) {
      return ReimportedSettings;
    }

    throw new Error('Settings model is not available after re-import');
  } catch (error) {
    throw new Error(
      `Database model initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

export async function POST(req: NextRequest) {
  // Wrap everything in a super-safe try-catch
  try {
    const [userData, SettingModel] = await Promise.all([
      getAuthenticatedUser(req),
      getSettingsModel(),
    ]);
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { organizationId } = userData;

    const settings = await SettingModel.findOne({ organizationId })
      .lean()
      .exec();
    if (!settings) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organization settings not found',
        },
        { status: 400 },
      );
    }

    if (!settings.googleCalendar) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Calendar not configured',
        },
        { status: 400 },
      );
    }

    if (!settings.googleCalendar.isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Calendar is not connected',
        },
        { status: 400 },
      );
    }

    try {
      if (
        !settings.googleCalendar.clientSecret ||
        !settings.googleCalendar.accessToken ||
        !settings.googleCalendar.refreshToken
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing Google Calendar credentials',
            details:
              'One or more required credentials (clientSecret, accessToken, refreshToken) are missing',
          },
          { status: 400 },
        );
      }

      const clientSecret = decryptText(
        settings.googleCalendar.clientSecret,
        organizationId,
      );
      const accessToken = decryptText(
        settings.googleCalendar.accessToken,
        organizationId,
      );
      const refreshToken = decryptText(
        settings.googleCalendar.refreshToken,
        organizationId,
      );
      // Check if we have a valid refresh token
      if (!refreshToken || refreshToken.trim() === '') {
        // Update the connection status in database since it's not actually working
        try {
          const SettingsUpdateModel = await getSettingsModel();
          await SettingsUpdateModel.findOneAndUpdate(
            { organizationId },
            {
              $set: {
                'googleCalendar.isConnected': false,
              },
            },
          );
        } catch (updateError) {
          logger.error(
            { error: updateError, url: req.url },
            'Failed to get Settings model for update:',
            updateError,
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: 'Missing refresh token',
            details:
              'No refresh token is available. Connection marked as disconnected. Please reconnect your Google Calendar to restore full functionality.',
            connectionStatusUpdated: true,
            lastTestedAt: new Date().toISOString(),
            debugInfo:
              process.env.ENVIRONMENT === 'development'
                ? {
                    hasAccessToken: !!accessToken,
                    hasRefreshToken: !!refreshToken,
                    refreshTokenEmpty: refreshToken === '',
                  }
                : undefined,
          },
          { status: 400 },
        );
      }

      let oauth2Client;
      try {
        oauth2Client = createOAuth2Client({
          clientId: settings.googleCalendar.clientId,
          clientSecret,
          redirectUri: '',
        });
      } catch (oauthError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to create OAuth2 client',
            details:
              oauthError instanceof Error
                ? oauthError.message
                : 'Unknown OAuth error',
          },
          { status: 500 },
        );
      }

      try {
        oauth2Client.setCredentials({
          access_token: accessToken,
          refresh_token: refreshToken,
          expiry_date: settings.googleCalendar.expiryDate,
        });
      } catch (credError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to set OAuth2 credentials',
            details:
              credError instanceof Error
                ? credError.message
                : 'Unknown credential error',
          },
          { status: 500 },
        );
      }

      let calendar;
      try {
        calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      } catch (apiError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to create Calendar API client',
            details:
              apiError instanceof Error
                ? apiError.message
                : 'Unknown API client error',
          },
          { status: 500 },
        );
      }

      const calendarListResponse = await calendar.calendarList.list({
        maxResults: 1,
      });

      const primaryCalendarResponse = await calendar.calendars.get({
        calendarId: 'primary',
      });

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Gather connection details
      const connectionInfo = {
        calendarCount: calendarListResponse.data.items?.length || 0,
        primaryCalendarName: primaryCalendarResponse.data.summary || 'Primary',
        primaryCalendarTimeZone: primaryCalendarResponse.data.timeZone || 'UTC',
        canAccessEvents: true,
        connectedEmail: settings.googleCalendar.connectedEmail,
        tokenExpiry: settings.googleCalendar.expiryDate
          ? new Date(settings.googleCalendar.expiryDate).toISOString()
          : null,
        lastTestedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        message: 'Google Calendar connection is working properly',
        data: connectionInfo,
      });
    } catch (apiError: any) {
      logger.error(
        { apiError, url: req.url },
        'Google Calendar API test failed:',
      );

      // Handle specific error types
      let errorMessage = 'Connection test failed';
      let errorDetails = '';
      let debugInfo: any = {};

      // Capture detailed error information for debugging
      if (apiError.response) {
        debugInfo = {
          status: apiError.response.status,
          statusText: apiError.response.statusText,
          data: apiError.response.data,
          headers: apiError.response.headers,
        };
      }

      // Determine if this is an authentication/authorization failure that requires reconnection
      let shouldMarkDisconnected = false;

      if (apiError.message?.includes('invalid_grant')) {
        errorMessage = 'Authentication expired';
        errorDetails =
          'Your Google Calendar token has expired. Connection marked as disconnected. Please reconnect to restore access.';
        shouldMarkDisconnected = true;
      } else if (apiError.message?.includes('insufficient_scope')) {
        errorMessage = 'Insufficient permissions';
        errorDetails =
          'Missing required Calendar API scopes. Connection marked as disconnected. Please reconnect with proper permissions.';
        shouldMarkDisconnected = true;
      } else if (apiError.response?.status === 401) {
        errorMessage = 'Unauthorized access';
        errorDetails = `Invalid or expired credentials (HTTP 401). Connection marked as disconnected. ${
          apiError.response.data?.error?.message ||
          'Please reconnect your Google Calendar.'
        }`;
        shouldMarkDisconnected = true;
      } else if (apiError.response?.status === 403) {
        errorMessage = 'Access denied';
        errorDetails = `Google Calendar API access denied (HTTP 403). ${
          apiError.response.data?.error?.message ||
          'Check that Calendar API is enabled in Google Cloud Console and your credentials have proper permissions.'
        }`;
        // Don't mark as disconnected for 403 - could be API not enabled
      } else if (apiError.message?.includes('quotaExceeded')) {
        errorMessage = 'API quota exceeded';
        errorDetails =
          'Google Calendar API quota exceeded. Please try again later or check your quota limits.';
        // Don't mark as disconnected for quota issues
      } else if (apiError.response?.status === 400) {
        errorMessage = 'Bad request';
        errorDetails = `Invalid request to Google Calendar API (HTTP 400). ${
          apiError.response.data?.error?.message ||
          apiError.message ||
          'Check your request parameters.'
        }`;
        // Don't mark as disconnected for bad requests
      } else if (
        apiError.code === 'ENOTFOUND' ||
        apiError.code === 'ECONNREFUSED'
      ) {
        errorMessage = 'Network connection failed';
        errorDetails = `Unable to reach Google Calendar API. ${
          apiError.code === 'ENOTFOUND'
            ? 'DNS resolution failed.'
            : 'Connection refused.'
        } Check your internet connection.`;
        // Don't mark as disconnected for network issues
      } else {
        errorDetails = `${apiError.message || 'Unknown error occurred'}${
          apiError.response?.status ? ` (HTTP ${apiError.response.status})` : ''
        }`;

        // Add more context for debugging
        if (apiError.response?.data) {
          errorDetails += `\n\nServer Response: ${JSON.stringify(apiError.response.data, null, 2)}`;
        }
      }

      // Update connection status if this is an auth/credentials issue
      if (shouldMarkDisconnected) {
        try {
          const SettingsUpdateModel = await getSettingsModel();
          await SettingsUpdateModel.findOneAndUpdate(
            { organizationId },
            {
              $set: {
                'googleCalendar.isConnected': false,
              },
            },
          );
        } catch (updateError) {
          console.error('Failed to update connection status:', updateError);
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: errorDetails,
          connectionStatusUpdated: shouldMarkDisconnected,
          lastTestedAt: new Date().toISOString(),
          debugInfo:
            process.env.ENVIRONMENT === 'development'
              ? {
                  originalError: apiError.message,
                  stack: apiError.stack?.split('\n').slice(0, 5), // First 5 lines of stack trace
                  code: apiError.code,
                  shouldMarkDisconnected,
                  ...debugInfo,
                }
              : undefined,
        },
        { status: 400 },
      );
    }
  } catch (error) {
    // Provide detailed error information for debugging
    const errorMessage = 'Failed to test connection';
    let errorDetails =
      'An unexpected error occurred during the connection test';

    if (error instanceof Error) {
      errorDetails = `${error.message}${error.stack ? `\n\nStack trace:\n${error.stack.split('\n').slice(0, 10).join('\n')}` : ''}`;
    } else {
      errorDetails = `Unexpected error type: ${String(error)}`;
    }

    // Ensure we always return a proper JSON response
    try {
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: errorDetails,
          lastTestedAt: new Date().toISOString(),
          debugInfo:
            process.env.ENVIRONMENT === 'development'
              ? {
                  errorType: error?.constructor?.name || typeof error,
                  originalError: String(error),
                  timestamp: new Date().toISOString(),
                }
              : undefined,
        },
        { status: 500 },
      );
    } catch (jsonError) {
      logger.error(
        { error: jsonError, url: req.url },
        'Failed to create JSON response:',
        jsonError,
      );

      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }
}
