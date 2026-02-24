import { logger } from '@/lib/logger/logger.server';
import connectToDatabase, { Organization } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

// Handle GET request
export async function GET(req: Request) {
  await connectToDatabase();
  try {
    if (!Organization) {
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 400 },
      );
    }
    const orgInfo = await Organization.findOne(
      {},
      {
        adminId: 0,
        lanes: 0,
      },
    )
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
    logger.error({ error, url: req.url }, 'Error in GET organization');
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Unknown error occurred' },
      { status: 400 },
    );
  }
}
