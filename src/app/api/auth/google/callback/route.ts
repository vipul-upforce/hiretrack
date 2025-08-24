import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings } from "@/lib/mongodb";
import { createOAuth2Client, getRedirectUri } from "@/lib/google-calendar/config";
import { encryptText, decryptText } from "@/lib/encryption";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Check if Settings model is available
    if (!Settings) {
      return new NextResponse(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'google-calendar-error', error: "Database connection failed" }, '*');
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { "Content-Type": "text/html" },
      });
    }
    
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle user denial
    if (error) {
      return new NextResponse(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'google-calendar-error', error: ${JSON.stringify(error)} }, '*');
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: "Missing authorization code or state" },
        { status: 400 }
      );
    }

    // Decode and verify state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (e) {
      return new NextResponse(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'google-calendar-error', error: "Invalid state parameter" }, '*');
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { "Content-Type": "text/html" },
      });
    }

    const { organizationId, timestamp } = stateData;

    // Verify state is not too old (10 minutes max)
    if (!timestamp || Date.now() - timestamp > 10 * 60 * 1000) {
      return new NextResponse(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'google-calendar-error', error: "Authorization expired. Please try again." }, '*');
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Get settings
    const settings = await Settings.findOne({ organizationId });
    if (!settings?.googleCalendar?.clientId || !settings?.googleCalendar?.clientSecret) {
      return new NextResponse(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'google-calendar-error', error: "Google Calendar is not configured" }, '*');
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Decrypt client secret
    const clientSecret = decryptText(settings.googleCalendar.clientSecret);
    
    // Create OAuth2 client
    const redirectUri = getRedirectUri(req);
    const oauth2Client = createOAuth2Client({
      clientId: settings.googleCalendar.clientId,
      clientSecret: clientSecret,
      redirectUri: redirectUri,
    });

    // Exchange code for tokens
    console.log('Exchanging code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    console.log('Received tokens:', { 
      access_token: tokens.access_token ? 'present' : 'missing',
      refresh_token: tokens.refresh_token ? 'present' : 'missing',
      scope: tokens.scope,
      expiry_date: tokens.expiry_date
    });

    // Check if we have a refresh token
    if (!tokens.refresh_token) {
      console.error('No refresh token received! This usually means the user was already connected.');
      return new NextResponse(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ 
                type: 'google-calendar-error', 
                error: "No refresh token received. Please disconnect and reconnect your Google Calendar to refresh the connection." 
              }, '*');
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { "Content-Type": "text/html" },
      });
    }

    oauth2Client.setCredentials(tokens);

    // Validate that we have the required scopes
    const requiredScopes = [
      'https://www.googleapis.com/auth/calendar', 
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email'
    ];
    const grantedScopes = tokens.scope?.split(' ') || [];
    console.log('Required scopes:', requiredScopes);
    console.log('Granted scopes:', grantedScopes);
    
    const hasCalendarScope = requiredScopes.slice(0, 2).some(scope => grantedScopes.includes(scope));
    const hasEmailScope = grantedScopes.includes('https://www.googleapis.com/auth/userinfo.email');
    
    if (!hasCalendarScope) {
      console.error('Missing calendar scopes!');
      return new NextResponse(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'google-calendar-error', error: "Missing calendar permissions. Please ensure you grant Calendar access during authorization." }, '*');
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { "Content-Type": "text/html" },
      });
    }
    
    if (!hasEmailScope) {
      console.error('Missing email scope!');
      return new NextResponse(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'google-calendar-error', error: "Missing email permissions. Please ensure you grant email access during authorization." }, '*');
              window.close();
            </script>
          </body>
        </html>
      `, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Get user email
    console.log('Getting user info...');
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });
    const userInfo = await oauth2.userinfo.get();
    const userEmail = userInfo.data.email || "";
    console.log('User email:', userEmail);

    // Encrypt and save tokens
    const encryptedAccessToken = encryptText(tokens.access_token || "");
    const encryptedRefreshToken = tokens.refresh_token ? encryptText(tokens.refresh_token) : "";

    await Settings.findOneAndUpdate(
      { organizationId },
      {
        $set: {
          "googleCalendar.isConnected": true,
          "googleCalendar.accessToken": encryptedAccessToken,
          "googleCalendar.refreshToken": encryptedRefreshToken,
          "googleCalendar.expiryDate": tokens.expiry_date,
          "googleCalendar.connectedEmail": userEmail,
        },
      }
    );

    // Return success HTML that communicates with parent window
    return new NextResponse(`
      <html>
        <head>
          <title>Google Calendar Connected</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #f5f5f5;
            }
            .success-container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .success-icon {
              font-size: 3rem;
              margin-bottom: 1rem;
            }
            h1 {
              color: #333;
              margin-bottom: 0.5rem;
            }
            p {
              color: #666;
              margin-bottom: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="success-container">
            <div class="success-icon">✅</div>
            <h1>Successfully Connected!</h1>
            <p>Google Calendar has been connected to your account.</p>
            <p>This window will close automatically...</p>
          </div>
          <script>
            window.opener.postMessage({ type: 'google-calendar-connected' }, '*');
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("Google Calendar callback error:", error);
    const errorMessage = error instanceof Error ? error.message : "Connection failed";
    return new NextResponse(`
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
    `, {
      headers: { "Content-Type": "text/html" },
    });
  }
}