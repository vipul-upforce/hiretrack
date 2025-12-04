import { NextRequest, NextResponse } from 'next/server';
import { clearAuthTokens } from '@/lib/secureTokens';

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({
      message: 'Logged out successfully',
    });

    // SECURITY FIX: Clear both authentication tokens securely
    clearAuthTokens(response);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 },
    );
  }
}
