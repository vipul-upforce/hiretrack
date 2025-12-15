import { NextResponse } from "next/server";
import { setSecureOrgId } from "@/lib/secureTokens";

interface SetAuthCookiesParams {
  response: NextResponse;
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  orgId: string;
}

/**
 * Centralized helper to set all auth-related cookies consistently.
 *
 * This ensures login, refresh, 2FA, and any other auth flows
 * use exactly the same cookie names, lifetimes, and security flags.
 */
export function setAuthCookies({
  response,
  accessToken,
  refreshToken,
  deviceId,
  orgId,
}: SetAuthCookiesParams): NextResponse {
  const isProduction = process.env.ENVIRONMENT === "production";

  // Short-lived access token (15 minutes)
  response.cookies.set("auth_token", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 15 * 60,
    path: "/",
  });

  // Auth state flag for client-side checks
  response.cookies.set("auth_state", "true", {
    secure: isProduction,
    sameSite: "strict",
    maxAge: 15 * 60,
    path: "/",
  });

  // Refresh token (7 days)
  response.cookies.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  // Device identifier (7 days)
  response.cookies.set("device_id", deviceId, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  // Organization id (7 days) - defer to existing helper for headers/options
  setSecureOrgId(response, orgId, {
    expires: 7,
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return response;
}


