import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';

export async function GET(request: NextRequest) {
  try {
    const userData = await getAuthenticatedUser(request, ['admin', 'hr']);
    if (!userData) {
      return NextResponse.json(
        { message: 'Unauthorised Access' },
        { status: 401 },
      );
    }
    return NextResponse.json(userData);
  } catch (error) {
    logger.error({ error, url: request.url }, 'Error fetching user data');
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
