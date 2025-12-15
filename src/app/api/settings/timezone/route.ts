import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const userData = await getAuthenticatedUser(req, 'admin');
    if (!userData) {
      return NextResponse.json(
        { message: 'Unauthorised Access' },
        { status: 401 },
      );
    }
    if (!Settings) {
      return NextResponse.json(
        { error: 'Settings Model Not Found' },
        { status: 404 },
      );
    }
    const settings = await Settings.findOne({
      organizationId: userData?.organizationId,
    })
      .select('timeZone')
      .lean()
      .exec();

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ timezone: settings.timeZone });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const userData = await getAuthenticatedUser(req, 'admin');
    if (!userData) {
      return NextResponse.json(
        { message: 'Unauthorised Access' },
        { status: 401 },
      );
    }

    if (!Settings) {
      return NextResponse.json(
        { error: 'Settings Model Not Found' },
        { status: 404 },
      );
    }

    const timeZoneSetting = await req.json();

    const updatedUser = await Settings.findOneAndUpdate(
      {
        organizationId: userData?.organizationId || '',
      },
      { timeZone: timeZoneSetting },
      {
        new: true,
        runValidators: true,
        upsert: true,
      },
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: 'Settings updated successfully' });
  } catch (error) {
    logger.error({ error, url: req.url }, 'Error updating timezone setting');
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
