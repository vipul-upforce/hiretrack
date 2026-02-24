import { NextRequest, NextResponse } from 'next/server';
import { clearAuthTokens } from '@/lib/authCookies';
import { verifyAndDecryptToken } from '@/app/actions/auth';
import { clearRefreshToken, hashRefreshToken } from '@/lib/refreshToken';
import connectToDatabase from '@/lib/mongodb';
import { logger } from '@/lib/logger/logger.server';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const token = request.cookies.get('auth_token')?.value;
    const orgId = request.cookies.get('org_id')?.value;

    if (token && orgId) {
      const { success, user } = await verifyAndDecryptToken(token, orgId);

      if (success && user) {
        // Try to get token hash from refresh token cookie
        const refreshToken = request.cookies.get('refresh_token')?.value;
        let tokenHash: string | undefined;

        if (refreshToken) {
          // Hash the refresh token to find and clear the specific token
          tokenHash = hashRefreshToken(refreshToken);
        }

        // Clear refresh token from database (specific token or all if tokenHash not found)
        const isCandidate = user.role === 'candidate';
        await clearRefreshToken(user.id || user.email, tokenHash, isCandidate);
      }
    }

    const response = NextResponse.json({
      message: 'Logged out successfully',
    });

    // SECURITY FIX: Clear both authentication tokens securely
    clearAuthTokens(response);

    return response;
  } catch (error) {
    logger.error({ error }, 'Logout error');
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
