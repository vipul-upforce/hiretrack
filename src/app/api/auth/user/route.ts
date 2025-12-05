import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/app/actions/auth';

export async function GET(request: NextRequest) {
  try {
    const userData = await getAuthenticatedUser(request);
    if (!userData) {
      return NextResponse.json(
        { message: 'Unauthorised Access' },
        { status: 401 },
      );
    }
    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
