import { logger } from '@/lib/logger/logger.server';
import { Organization } from '@/lib/mongodb';
import { apiRateLimiter } from '@/lib/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';

async function checkOrgInDatabase(organizationId: string) {
  const organization = await Organization?.findOne({ _id: organizationId }).select('name').lean();
  return !!organization?.name;
}

const handleGetChekOrg = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const organizationId = searchParams?.get('organizationId');

  try {
    const exists = await checkOrgInDatabase(organizationId as string);

    return NextResponse.json({ exists }, { status: 200 });
  } catch (err) {
    logger.error({err, url: req.url},'Error checking organization:');
    return NextResponse.json({ exists: false }, { status: 500 });
  }
};

export async function GET(req: NextRequest) {
  return apiRateLimiter(req as NextRequest, handleGetChekOrg);
}
