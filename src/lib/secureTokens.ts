import { NextResponse } from "next/server";

export interface SecureTokenOptions {
  maxAge?: number;
  expires?: number;
  domain?: string;
  path?: string;
}

/**
 * Sets secure authentication tokens with improved security
 * - Sets a readable token for client-side functionality (temporary for migration)
 * - Sets an httpOnly token for server-side operations (enhanced security)
 * - Adds proper security flags
 */
export function setSecureAuthTokens(
  response: NextResponse,
  token: string,
  options: SecureTokenOptions = {}
) {
  console.log("UIUIUIUIUIU: ", response);
  const {
    maxAge = 30 * 24 * 60 * 60, // 30 days in seconds
    expires = 30, // 30 days (legacy format)
    domain,
    path = "/",
  } = options;

  // Calculate expiration date
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + expires);

  // Common security flags
  const isProduction = process.env.NODE_ENV === "production";
  const secureFlag = isProduction; // Only use secure in production (requires HTTPS)

  // Set readable token for client-side (maintaining existing functionality)
  // This will be phased out in future migration
  // response.cookies.set("token", token, {
  //   httpOnly: false, // Readable by client for existing functionality
  //   secure: secureFlag,
  //   sameSite: "strict",
  //   maxAge: maxAge,
  //   path: path,
  //   domain: domain,
  // });

  // Set httpOnly token for server-side operations (enhanced security)
  response.cookies.set("auth_token", token, {
    httpOnly: true, // Not accessible by JavaScript
    secure: secureFlag,
    sameSite: "strict",
    maxAge: maxAge,
    path: path,
    domain: domain,
  });

  // Set additional security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  // response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  console.log("RESPONSE IN SESECUTEAUTHTOKEN: ", response);
  return response;
}

/**
 * Clears all authentication tokens securely
 */
export function clearAuthTokens(response: NextResponse) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: 0,
    expires: new Date(0),
    path: "/",
  };

  // Clear both tokens
  // response.cookies.set("token", "", cookieOptions);
  response.cookies.set("auth_token", "", cookieOptions);
  console.log("GONNA REMOVE THE TOKEN...");
  response.cookies.delete("auth_token");
  return response;
}

/**
 * Enhanced token validation that checks both token sources
 * Prioritizes httpOnly token for security, falls back to readable token
 */
export function getAuthToken(request: Request): string | undefined {
  const cookies = request.headers.get("cookie");
  if (!cookies) return undefined;

  // Parse cookies manually to handle both token types
  const cookieMap = new Map<string, string>();
  cookies.split(";").forEach((cookie) => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) {
      cookieMap.set(name, value);
    }
  });

  // Prioritize httpOnly token for security
  return cookieMap.get("auth_token") || cookieMap.get("token");
}
