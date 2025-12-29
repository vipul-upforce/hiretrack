import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { apiRateLimiter } from '@/lib/rateLimiter';
import logger from '@/lib/logger';

const handleMeRoute = async (req: NextRequest) => {
  try {
    const result = await getAuthenticatedUser(req);
    if (!result) {
      return NextResponse.json(
        { message: 'Unauthorised Access' },
        { status: 401 },
      );
    }
    return NextResponse.json({ user: result }, { status: 200 });
    // if (result) {
    //   return NextResponse.json({ user: result }, { status: 200 });
    // } else {
    //   // Treat invalid/missing auth as guest candidate
    //   return NextResponse.json({ user: defaultCandidateUser }, { status: 200 });
    // }
  } catch (error) {
    logger.error('Error in /api/auth/me:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
};

export async function GET(req: NextRequest) {
  return apiRateLimiter(req as NextRequest, handleMeRoute);
}
