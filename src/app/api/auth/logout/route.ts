import { NextResponse } from 'next/server';
import { clearAuthTokens } from '@/lib/secureTokens';
import { logger } from '@/lib/logger/logger.server';

export async function GET() {
  try {
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
