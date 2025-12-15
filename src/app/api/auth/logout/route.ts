import { NextRequest, NextResponse } from "next/server";
import { clearAuthTokens } from "@/lib/secureTokens";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { clearRefreshToken, verifyRefreshToken, verifyAndDecryptRefreshToken } from "@/lib/refreshToken";
import connectToDatabase from "@/lib/mongodb";
import { logger } from '@/lib/logger/logger.server';
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const token = request.cookies.get("auth_token")?.value;
    const orgId = request.cookies.get("org_id")?.value;

    if (token && orgId) {
      const { success, user } = await verifyAndDecryptToken(token, orgId);
      
      if (success && user) {
        // Try to get deviceId from refresh token cookie
        const refreshToken = request.cookies.get("refresh_token")?.value;
        let deviceId: string | undefined;
        
        if (refreshToken && orgId) {
          // Decrypt refresh token to get deviceId
          const tokenVerification = verifyAndDecryptRefreshToken(refreshToken, orgId);
          if (tokenVerification.success && tokenVerification.payload) {
            deviceId = tokenVerification.payload.deviceId;
          } else {
            // Fallback: try database lookup
            const verification = await verifyRefreshToken(
              refreshToken,
              user.id || user.email,
              orgId,
              user.role === "candidate"
            );
            deviceId = verification.deviceId;
          }
        }
        
        // Clear refresh token from database (specific device or all if deviceId not found)
        const isCandidate = user.role === "candidate";
        await clearRefreshToken(user.id || user.email, deviceId, isCandidate);
      }
    }

    const response = NextResponse.json({
      message: 'Logged out successfully',
    });

    // SECURITY FIX: Clear both authentication tokens securely
    clearAuthTokens(response);
    
    // Clear refresh token cookie
    response.cookies.delete("refresh_token");
    response.cookies.delete("device_id");

    return response;
  } catch (error) {
    logger.error({ error }, 'Logout error');
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
