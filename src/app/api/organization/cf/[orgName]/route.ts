import { logger } from '@/lib/logger/logger.server';
import connectToDatabase, { Organization } from '@/lib/mongodb';
import { apiRateLimiter } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';

// Handle GET request
const handleGetOrganization = async (
  request: NextRequest,
  { params }: { params: { orgName: string } },
) => {
  await connectToDatabase();
  try {
    const { orgName } = await params;

    if (!Organization) {
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 400 },
      );
    }
    const orgInfo = await Organization.findOne({ name: orgName })
      .select('customFields')
      .lean()
      .exec();

    if (!orgInfo) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    const customFields = orgInfo.customFields
      ? JSON.parse(JSON.stringify(orgInfo.customFields))
      : null;

    return NextResponse.json(customFields || {}, { status: 200 });
  } catch (error: unknown) {
    logger.error({ error, url: request.url }, 'Error in GET organization');
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Unknown error occurred' },
      { status: 400 },
    );
  }
};

export async function GET(
  request: NextRequest,
  context: { params: { orgName: string } },
) {
  return apiRateLimiter(request, (req: NextRequest) =>
    handleGetOrganization(req, context),
  );
}
