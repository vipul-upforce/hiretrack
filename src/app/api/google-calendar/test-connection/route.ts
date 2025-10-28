import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings } from "@/lib/mongodb";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { createOAuth2Client } from "@/lib/google-calendar/config";
import { decryptText } from "@/lib/encryption";
import { google } from "googleapis";

// Safe getter for Settings model
async function getSettingsModel() {
  try {
    await connectToDatabase();
    if (Settings) {
      return Settings;
    }

    console.log("⚠️ Settings model is null, attempting re-import...");

    // If Settings is still null, try to re-import
    const { Settings: ReimportedSettings } = await import("@/lib/mongodb");
    if (ReimportedSettings) {
      console.log("✅ Successfully re-imported Settings model");
      return ReimportedSettings;
    }

    throw new Error("Settings model is not available after re-import");
  } catch (error) {
    console.error("❌ Failed to get Settings model:", error);
    throw new Error(
      `Database model initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function POST(req: NextRequest) {
  console.log("🚀 POST /api/google-calendar/test-connection called");

  // Wrap everything in a super-safe try-catch
  try {
    console.log("🔍 Testing Google Calendar connection - Starting");

    // Step 1: Connect to database
    console.log("📊 Connecting to database...");
    await connectToDatabase();
    console.log("✅ Database connected");

    // Step 2: Verify user
    console.log("🔐 Verifying user token...");
    let organizationId = "";
    const token = req.cookies.get("auth_token");
    const orgId = req.cookies.get("org_id")?.value;
    if (!token?.value) {
      console.log("❌ No token provided");
      return NextResponse.json(
        {
          success: false,
          error: "No token provided",
        },
        { status: 401 }
      );
    }

    try {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token.value),
        orgId
      );
      if (!decryptedResponse.success) {
        console.log("❌ Invalid token:", decryptedResponse);
        return NextResponse.json(
          {
            success: false,
            error: "Invalid token",
          },
          { status: 401 }
        );
      }

      organizationId = decryptedResponse.user?.organizationId || "";
      console.log("✅ User verified, organizationId:", organizationId);
    } catch (tokenError) {
      console.error("❌ Token verification failed:", tokenError);
      return NextResponse.json(
        {
          success: false,
          error: "Token verification failed",
          details:
            tokenError instanceof Error
              ? tokenError.message
              : "Unknown token error",
        },
        { status: 401 }
      );
    }

    // Step 3: Get Google Calendar settings
    console.log("⚙️ Fetching Google Calendar settings...");

    let settings;
    try {
      const SettingsModel = await getSettingsModel();
      settings = await SettingsModel.findOne({ organizationId });
    } catch (modelError) {
      console.error(
        "❌ Failed to get Settings model or query database:",
        modelError
      );
      return NextResponse.json(
        {
          success: false,
          error: "Database access failed",
          details: `Unable to access Settings model: ${modelError instanceof Error ? modelError.message : "Unknown database error"}`,
          lastTestedAt: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
    if (!settings) {
      console.log("❌ No settings found for organization:", organizationId);
      return NextResponse.json(
        {
          success: false,
          error: "Organization settings not found",
        },
        { status: 400 }
      );
    }

    if (!settings.googleCalendar) {
      console.log("❌ No Google Calendar configuration found");
      return NextResponse.json(
        {
          success: false,
          error: "Google Calendar not configured",
        },
        { status: 400 }
      );
    }

    if (!settings.googleCalendar.isConnected) {
      console.log("❌ Google Calendar not connected");
      return NextResponse.json(
        {
          success: false,
          error: "Google Calendar is not connected",
        },
        { status: 400 }
      );
    }

    console.log(
      "✅ Google Calendar settings found, connected:",
      settings.googleCalendar.isConnected
    );

    try {
      // Step 4: Decrypt credentials
      console.log("🔓 Decrypting credentials...");

      if (
        !settings.googleCalendar.clientSecret ||
        !settings.googleCalendar.accessToken ||
        !settings.googleCalendar.refreshToken
      ) {
        console.log("❌ Missing required credentials");
        return NextResponse.json(
          {
            success: false,
            error: "Missing Google Calendar credentials",
            details:
              "One or more required credentials (clientSecret, accessToken, refreshToken) are missing",
          },
          { status: 400 }
        );
      }

      const clientSecret = decryptText(
        settings.googleCalendar.clientSecret,
        orgId
      );
      const accessToken = decryptText(
        settings.googleCalendar.accessToken,
        orgId
      );
      const refreshToken = decryptText(
        settings.googleCalendar.refreshToken,
        orgId
      );

      console.log("✅ Credentials decrypted successfully");

      // Check if we have a valid refresh token
      if (!refreshToken || refreshToken.trim() === "") {
        console.log("❌ No refresh token available - marking as disconnected");

        // Update the connection status in database since it's not actually working
        try {
          const SettingsUpdateModel = await getSettingsModel();
          await SettingsUpdateModel.findOneAndUpdate(
            { organizationId },
            {
              $set: {
                "googleCalendar.isConnected": false,
              },
            }
          );
        } catch (updateError) {
          console.error(
            "Failed to get Settings model for update:",
            updateError
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: "Missing refresh token",
            details:
              "No refresh token is available. Connection marked as disconnected. Please reconnect your Google Calendar to restore full functionality.",
            connectionStatusUpdated: true,
            lastTestedAt: new Date().toISOString(),
            debugInfo:
              process.env.ENVIRONMENT === "development"
                ? {
                    hasAccessToken: !!accessToken,
                    hasRefreshToken: !!refreshToken,
                    refreshTokenEmpty: refreshToken === "",
                  }
                : undefined,
          },
          { status: 400 }
        );
      }

      // Step 5: Create OAuth2 client
      console.log("🔗 Creating OAuth2 client...");
      let oauth2Client;
      try {
        oauth2Client = createOAuth2Client({
          clientId: settings.googleCalendar.clientId,
          clientSecret: clientSecret,
          redirectUri: "",
        });
        console.log("✅ OAuth2 client created");
      } catch (oauthError) {
        console.error("❌ OAuth2 client creation failed:", oauthError);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to create OAuth2 client",
            details:
              oauthError instanceof Error
                ? oauthError.message
                : "Unknown OAuth error",
          },
          { status: 500 }
        );
      }

      // Step 6: Set credentials
      console.log("🔑 Setting OAuth2 credentials...");
      try {
        oauth2Client.setCredentials({
          access_token: accessToken,
          refresh_token: refreshToken,
          expiry_date: settings.googleCalendar.expiryDate,
        });
        console.log("✅ OAuth2 credentials set");
      } catch (credError) {
        console.error("❌ Setting OAuth2 credentials failed:", credError);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to set OAuth2 credentials",
            details:
              credError instanceof Error
                ? credError.message
                : "Unknown credential error",
          },
          { status: 500 }
        );
      }

      // Step 7: Create calendar instance
      console.log("📅 Creating Google Calendar API client...");
      let calendar;
      try {
        calendar = google.calendar({ version: "v3", auth: oauth2Client });
        console.log("✅ Calendar API client created");
      } catch (apiError) {
        console.error("❌ Calendar API client creation failed:", apiError);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to create Calendar API client",
            details:
              apiError instanceof Error
                ? apiError.message
                : "Unknown API client error",
          },
          { status: 500 }
        );
      }

      // Test 1: Get calendar list (basic test)
      console.log("📅 Testing calendar list access...");
      const calendarListResponse = await calendar.calendarList.list({
        maxResults: 1,
      });

      // Test 2: Get primary calendar info
      console.log("📋 Testing primary calendar access...");
      const primaryCalendarResponse = await calendar.calendars.get({
        calendarId: "primary",
      });

      // Test 3: Try to list recent events (read permission test)
      console.log("📊 Testing events access...");
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const eventsResponse = await calendar.events.list({
        calendarId: "primary",
        timeMin: oneDayAgo.toISOString(),
        timeMax: now.toISOString(),
        maxResults: 1,
        singleEvents: true,
        orderBy: "startTime",
      });

      console.log("✅ Google Calendar connection test successful");

      // Gather connection details
      const connectionInfo = {
        calendarCount: calendarListResponse.data.items?.length || 0,
        primaryCalendarName: primaryCalendarResponse.data.summary || "Primary",
        primaryCalendarTimeZone: primaryCalendarResponse.data.timeZone || "UTC",
        canAccessEvents: true,
        connectedEmail: settings.googleCalendar.connectedEmail,
        tokenExpiry: settings.googleCalendar.expiryDate
          ? new Date(settings.googleCalendar.expiryDate).toISOString()
          : null,
        lastTestedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        message: "Google Calendar connection is working properly",
        data: connectionInfo,
      });
    } catch (apiError: any) {
      console.error("❌ Google Calendar API test failed:", apiError);

      // Handle specific error types
      let errorMessage = "Connection test failed";
      let errorDetails = "";
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

      if (apiError.message?.includes("invalid_grant")) {
        errorMessage = "Authentication expired";
        errorDetails =
          "Your Google Calendar token has expired. Connection marked as disconnected. Please reconnect to restore access.";
        shouldMarkDisconnected = true;
      } else if (apiError.message?.includes("insufficient_scope")) {
        errorMessage = "Insufficient permissions";
        errorDetails =
          "Missing required Calendar API scopes. Connection marked as disconnected. Please reconnect with proper permissions.";
        shouldMarkDisconnected = true;
      } else if (apiError.response?.status === 401) {
        errorMessage = "Unauthorized access";
        errorDetails = `Invalid or expired credentials (HTTP 401). Connection marked as disconnected. ${
          apiError.response.data?.error?.message ||
          "Please reconnect your Google Calendar."
        }`;
        shouldMarkDisconnected = true;
      } else if (apiError.response?.status === 403) {
        errorMessage = "Access denied";
        errorDetails = `Google Calendar API access denied (HTTP 403). ${
          apiError.response.data?.error?.message ||
          "Check that Calendar API is enabled in Google Cloud Console and your credentials have proper permissions."
        }`;
        // Don't mark as disconnected for 403 - could be API not enabled
      } else if (apiError.message?.includes("quotaExceeded")) {
        errorMessage = "API quota exceeded";
        errorDetails =
          "Google Calendar API quota exceeded. Please try again later or check your quota limits.";
        // Don't mark as disconnected for quota issues
      } else if (apiError.response?.status === 400) {
        errorMessage = "Bad request";
        errorDetails = `Invalid request to Google Calendar API (HTTP 400). ${
          apiError.response.data?.error?.message ||
          apiError.message ||
          "Check your request parameters."
        }`;
        // Don't mark as disconnected for bad requests
      } else if (
        apiError.code === "ENOTFOUND" ||
        apiError.code === "ECONNREFUSED"
      ) {
        errorMessage = "Network connection failed";
        errorDetails = `Unable to reach Google Calendar API. ${
          apiError.code === "ENOTFOUND"
            ? "DNS resolution failed."
            : "Connection refused."
        } Check your internet connection.`;
        // Don't mark as disconnected for network issues
      } else {
        errorDetails = `${apiError.message || "Unknown error occurred"}${
          apiError.response?.status ? ` (HTTP ${apiError.response.status})` : ""
        }`;

        // Add more context for debugging
        if (apiError.response?.data) {
          errorDetails += `\n\nServer Response: ${JSON.stringify(apiError.response.data, null, 2)}`;
        }
      }

      // Update connection status if this is an auth/credentials issue
      if (shouldMarkDisconnected) {
        console.log(
          "❌ Marking Google Calendar as disconnected due to auth failure"
        );
        try {
          const SettingsUpdateModel = await getSettingsModel();
          await SettingsUpdateModel.findOneAndUpdate(
            { organizationId },
            {
              $set: {
                "googleCalendar.isConnected": false,
              },
            }
          );
        } catch (updateError) {
          console.error("Failed to update connection status:", updateError);
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
            process.env.ENVIRONMENT === "development"
              ? {
                  originalError: apiError.message,
                  stack: apiError.stack?.split("\n").slice(0, 5), // First 5 lines of stack trace
                  code: apiError.code,
                  shouldMarkDisconnected,
                  ...debugInfo,
                }
              : undefined,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("❌ Connection test error (main catch):", error);
    console.error("Error type:", typeof error);
    console.error("Error constructor:", error?.constructor?.name);

    // Provide detailed error information for debugging
    let errorMessage = "Failed to test connection";
    let errorDetails =
      "An unexpected error occurred during the connection test";

    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      errorDetails = `${error.message}${error.stack ? `\n\nStack trace:\n${error.stack.split("\n").slice(0, 10).join("\n")}` : ""}`;
    } else {
      console.error("Non-Error object:", String(error));
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
            process.env.ENVIRONMENT === "development"
              ? {
                  errorType: error?.constructor?.name || typeof error,
                  originalError: String(error),
                  timestamp: new Date().toISOString(),
                }
              : undefined,
        },
        { status: 500 }
      );
    } catch (jsonError) {
      console.error("❌ Failed to create JSON response:", jsonError);
      // Last resort - return a basic response
      return new NextResponse("Internal Server Error", { status: 500 });
    }
  }
}
