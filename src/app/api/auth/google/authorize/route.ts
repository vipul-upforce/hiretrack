import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { verifyAndDecryptToken } from '@/app/actions/auth';
import {
  createOAuth2Client,
  getAuthUrl,
  getRedirectUri,
} from '@/lib/google-calendar/config';
import { decryptText } from '@/lib/encryption';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    if (!Settings) {
      return new NextResponse(
        `
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'google-calendar-error', error: "Database not connected" }, '*');
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
        String(token?.value),
        orgId,
      );
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        organizationId = userData.organizationId || '';
        if (userData.role !== 'admin' && userData.role !== 'hr') {
          return new NextResponse(
            `
            <html>
              <body>
                <script>
                  window.opener.postMessage({ type: 'google-calendar-error', error: "Unauthorized" }, '*');
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
      } else {
        return new NextResponse(
          `
          <html>
            <body>
              <script>
                window.opener.postMessage({ type: 'google-calendar-error', error: "Invalid token" }, '*');
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
    } else {
      return new NextResponse(
        `
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'google-calendar-error', error: "No token provided" }, '*');
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

    // Get Google Calendar settings
    const settings = await Settings.findOne({ organizationId });
    if (
      !settings?.googleCalendar?.clientId
      || !settings?.googleCalendar?.clientSecret
    ) {
      return new NextResponse(
        `
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'google-calendar-error', error: "Google Calendar is not configured. Please set up credentials first." }, '*');
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
    const clientSecret = decryptText(
      settings.googleCalendar.clientSecret,
      orgId,
    );

    // Create OAuth2 client
    const redirectUri = getRedirectUri(req);
    // console.log('Google OAuth Config:', {
    //   clientId: settings.googleCalendar.clientId,
    //   redirectUri: redirectUri,
    //   organizationId: organizationId
    // });

    const oauth2Client = createOAuth2Client({
      clientId: settings.googleCalendar.clientId,
      clientSecret,
      redirectUri,
    });

    // Generate auth URL with state parameter for security
    const state = Buffer.from(
      JSON.stringify({
        organizationId,
        timestamp: Date.now(),
      }),
    ).toString('base64');

    const authUrl = `${getAuthUrl(oauth2Client)}&state=${state}`;
    // console.log("Generated auth URL:", authUrl);

    // Redirect to Google OAuth consent screen
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Google Calendar authorization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Authorization failed';
    return new NextResponse(
      `
      <html>
        <body>
          <script>
            window.opener.postMessage({ 
              type: 'google-calendar-error', 
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
