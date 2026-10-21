import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { verifyAndDecryptToken } from '@/app/actions/auth';
import {
  getMicrosoftAuthUrl,
  getMicrosoftRedirectUri,
} from '@/lib/microsoft-calendar/config';
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
              window.opener.postMessage({ type: 'microsoft-calendar-error', error: "Database not connected" }, '*');
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

    // Verify user is admin
    let organizationId = '';
    const token = req.cookies.get('auth_token');
    const orgId = req.cookies.get('org_id')?.value;
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        token.value,
        orgId as string,
      );
      if (
        decryptedResponse?.success &&
        decryptedResponse?.user &&
        decryptedResponse?.user?.organizationId
      ) {
        organizationId = decryptedResponse?.user?.organizationId;
      }
    }

    if (!organizationId && orgId) {
      organizationId = orgId;
    }

    if (!organizationId) {
      return new NextResponse(
        `
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'microsoft-calendar-error', error: "Unauthorized. Please log in." }, '*');
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

    if (!settings) {
      return new NextResponse(
        `
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'microsoft-calendar-error', error: "Settings not found" }, '*');
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

    if (
      !settings?.microsoftTeams?.tenantId ||
      !settings?.microsoftTeams?.clientId ||
      !settings?.microsoftTeams?.clientSecret
    ) {
      return new NextResponse(
        `
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'microsoft-calendar-error', error: "Microsoft Teams is not configured. Please set up credentials first." }, '*');
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

    // Decrypt client secret

    // Create OAuth2 authorization URL
    const redirectUri = getMicrosoftRedirectUri(req);

    // Generate auth URL with state parameter for security
    const state = Buffer.from(
      JSON.stringify({
        organizationId,
        timestamp: Date.now(),
      }),
    ).toString('base64');

    // Check if admin consent is requested via query parameter
    const useAdminConsent =
      req.nextUrl.searchParams.get('admin_consent') === 'true';

    const authUrl = getMicrosoftAuthUrl(
      settings.microsoftTeams.tenantId,
      settings.microsoftTeams.clientId,
      redirectUri,
      state,
      useAdminConsent,
    );

    // Redirect to Microsoft OAuth consent screen
    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error(
      { error, url: req.url },
      'Microsoft Calendar authorization error',
    );
    const errorMessage =
      error instanceof Error ? error.message : 'Authorization failed';
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
