import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import {
  exchangeCodeForTokens,
  getMicrosoftRedirectUri,
  MICROSOFT_CALENDAR_SCOPES,
} from '@/lib/microsoft-calendar/config';
import { encryptText, decryptText } from '@/lib/encryption';
import { logger } from '@/lib/logger/logger.server';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    if (!Settings) {
      return new NextResponse(
        `
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'microsoft-calendar-error', error: "Database connection failed" }, '*');
              window.close();
            </script>
          </body>
        </html>
      `,
        {
          headers: { 'Content-Type': 'text/html' },
        },
      );
    }

    const { searchParams } = req.nextUrl;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const adminConsent = searchParams.get('admin_consent'); // For admin consent endpoint

    // Handle user denial
    if (error) {
      return new NextResponse(
        `
        <html>
          <body>
            <script>
              window.opener.postMessage({ 
                type: 'microsoft-calendar-error', 
                error: ${JSON.stringify(errorDescription || error)} 
              }, '*');
              window.close();
            </script>
          </body>
        </html>
      `,
        {
          headers: { 'Content-Type': 'text/html' },
        },
      );
    }

    // Handle admin consent callback (no code, just admin_consent parameter)
    if (adminConsent === 'true' && !code) {
      // Admin consent was granted, now redirect to regular OAuth flow for user consent
      let stateData;
      try {
        stateData = JSON.parse(Buffer.from(state || '', 'base64').toString());
      } catch {
        return new NextResponse(
          `
          <html>
            <body>
              <script>
                window.opener.postMessage({ type: 'microsoft-calendar-error', error: "Invalid state parameter" }, '*');
                window.close();
              </script>
            </body>
          </html>
        `,
          {
            headers: { 'Content-Type': 'text/html' },
          },
        );
      }

      const { organizationId } = stateData;
      if (!organizationId) {
        return new NextResponse(
          `
          <html>
            <body>
              <script>
                window.opener.postMessage({ type: 'microsoft-calendar-error', error: "Invalid organization ID" }, '*');
                window.close();
              </script>
            </body>
          </html>
        `,
          {
            headers: { 'Content-Type': 'text/html' },
          },
        );
      }

      const settings = await Settings.findOne({ organizationId })
        .select('microsoftTeams')
        .lean();

      if (settings?.microsoftTeams) {
        const redirectUri = getMicrosoftRedirectUri(req);
        // Redirect to regular OAuth flow after admin consent for user delegation
        // Use select_account to avoid admin approval prompt if admin consent already granted
        const authParams: Record<string, string> = {
          client_id: settings.microsoftTeams.clientId,
          response_type: 'code',
          redirect_uri: redirectUri,
          response_mode: 'query',
          scope: 'Calendars.ReadWrite User.Read offline_access',
          prompt: 'select_account', // Don't force consent if admin consent already granted
        };

        // Only include state if it's not null (convert null to undefined)
        if (state) {
          authParams.state = state;
        }

        const regularAuthUrl = `https://login.microsoftonline.com/${settings.microsoftTeams.tenantId}/oauth2/v2.0/authorize?${new URLSearchParams(authParams).toString()}`;

        return NextResponse.redirect(regularAuthUrl);
      }

      // If settings not found, return error
      return new NextResponse(
        `
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'microsoft-calendar-error', error: "Microsoft Teams not configured" }, '*');
              window.close();
            </script>
          </body>
        </html>
      `,
        {
          headers: { 'Content-Type': 'text/html' },
        },
      );
    }

    if (!code || !state) {
      return new NextResponse(
        `
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'microsoft-calendar-error', error: "Missing authorization code or state" }, '*');
              window.close();
            </script>
          </body>
        </html>
      `,
        {
          headers: { 'Content-Type': 'text/html' },
        },
      );
    }

    // Decode and verify state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return new NextResponse(
        `
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'microsoft-calendar-error', error: "Invalid state parameter" }, '*');
              window.close();
            </script>
          </body>
        </html>
      `,
        {
          headers: { 'Content-Type': 'text/html' },
        },
      );
    }

    const { organizationId } = stateData;
    if (!organizationId) {
      return new NextResponse(
        `
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'microsoft-calendar-error', error: "Invalid organization ID" }, '*');
              window.close();
            </script>
          </body>
        </html>
      `,
        {
          headers: { 'Content-Type': 'text/html' },
        },
      );
    }

    // Get settings
    const settings = await Settings.findOne({ organizationId })
      .select('microsoftTeams')
      .lean();

    if (!settings?.microsoftTeams) {
      return new NextResponse(
        `
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'microsoft-calendar-error', error: "Microsoft Teams not configured" }, '*');
              window.close();
            </script>
          </body>
        </html>
      `,
        {
          headers: { 'Content-Type': 'text/html' },
        },
      );
    }

    const redirectUri = getMicrosoftRedirectUri(req);
    const clientSecret = decryptText(
      settings.microsoftTeams.clientSecret,
      organizationId,
    );

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(
      settings.microsoftTeams.tenantId,
      settings.microsoftTeams.clientId,
      clientSecret,
      code,
      redirectUri,
    );

    // Check if we have a refresh token
    if (!tokens.refresh_token) {
      return new NextResponse(
        `
        <html>
          <body>
            <script>
              window.opener.postMessage({ 
                type: 'microsoft-calendar-error', 
                error: "No refresh token received. Please disconnect and reconnect your Microsoft Calendar to refresh the connection." 
              }, '*');
              window.close();
            </script>
          </body>
        </html>
      `,
        {
          headers: { 'Content-Type': 'text/html' },
        },
      );
    }

    // Validate that we have the required scopes
    const grantedScopes = tokens.scope?.split(' ') || [];
    const hasCalendarScope = grantedScopes.some((scope) =>
      MICROSOFT_CALENDAR_SCOPES.slice(0, 1).some((required) =>
        scope.includes(required),
      ),
    );

    if (!hasCalendarScope) {
      return new NextResponse(
        `
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'microsoft-calendar-error', error: "Missing calendar permissions. Please ensure you grant Calendar access during authorization." }, '*');
              window.close();
            </script>
          </body>
        </html>
      `,
        {
          headers: { 'Content-Type': 'text/html' },
        },
      );
    }

    // Get user email from Microsoft Graph
    let userEmail = '';
    try {
      const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        userEmail = userData.mail || userData.userPrincipalName || '';
      }
    } catch (fetchError) {
      logger.error(
        { fetchError },
        'Failed to fetch user email from Microsoft Graph',
      );
    }

    // Update settings with tokens
    await Settings.findOneAndUpdate(
      { organizationId },
      {
        $set: {
          'microsoftTeams.accessToken': encryptText(
            tokens.access_token,
            organizationId,
          ),
          'microsoftTeams.refreshToken': encryptText(
            tokens.refresh_token,
            organizationId,
          ),
          'microsoftTeams.expiryDate': tokens.expiry_date || null,
          'microsoftTeams.isConnected': true,
          'microsoftTeams.connectedEmail':
            userEmail || settings.microsoftTeams.connectedEmail || '',
        },
      },
    );

    // Return success page that closes popup and notifies parent
    return new NextResponse(
      `
      <html>
        <head>
          <title>Microsoft Calendar Connected</title>
        </head>
        <body style="font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5;">
          <div style="text-align: center; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #0078d4;">✅ Microsoft Calendar Connected!</h2>
            <p>You can close this window.</p>
          </div>
          <script>
            window.opener.postMessage({ 
              type: 'microsoft-calendar-connected',
              email: ${JSON.stringify(userEmail)}
            }, '*');
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `,
      {
        headers: { 'Content-Type': 'text/html' },
      },
    );
  } catch (error) {
    logger.error({ error, url: req.url }, 'Microsoft Calendar callback error');
    const errorMessage =
      error instanceof Error ? error.message : 'Connection failed';
    return new NextResponse(
      `
      <html>
        <body>
          <script>
            window.opener.postMessage({ 
              type: 'microsoft-calendar-error', 
              error: ${JSON.stringify(errorMessage)}
            }, '*');
            window.close();
          </script>
        </body>
      </html>
    `,
      {
        headers: { 'Content-Type': 'text/html' },
      },
    );
  }
}
