import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, OrganizationInfo } from '@/app/actions/auth';
import { apiRateLimiter } from '@/lib/rateLimiter';
import { logger } from '@/lib/logger/logger.server';

const handleMeRoute = async (req: NextRequest) => {
  try {
    // Default candidate user for unauthenticated requests
    const defaultCandidateUser = {
      id: 'guest',
      name: 'Guest',
      email: '',
      role: '',
      organizationId: '',
      organizationInfo: null as OrganizationInfo | null,
      appliedApplications: [] as string[],
      fileStorage: null as string | null,
    };

    const result = await getAuthenticatedUser(req);

    if (result) {
      return NextResponse.json({ user: result }, { status: 200 });
    }
    // Treat invalid/missing auth as guest candidate
    return NextResponse.json({ user: defaultCandidateUser }, { status: 200 });
  } catch (error) {
    logger.error({ error, url: req.url }, 'Error in /me API.');
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
};

export async function GET(req: NextRequest) {
  return apiRateLimiter(req as NextRequest, handleMeRoute);
}
