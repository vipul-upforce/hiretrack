import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { getZoomAccessToken } from '@/lib/zoom/zoomAuth';
import { logger } from '@/lib/logger/logger.server';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const userData = await getAuthenticatedUser(req, [
      'admin',
      'hr',
      'interviewer',
    ]);
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = userData.organizationId || '';

    if (!Settings) {
      return NextResponse.json(
        { error: 'Settings model not available' },
        { status: 500 },
      );
    }

    const settings = await Settings.findOne({ organizationId })
      .select('zoom')
      .lean()
      .exec();

    if (
      !settings?.zoom?.accountId ||
      !settings.zoom.clientId ||
      !settings.zoom.clientSecret
    ) {
      return NextResponse.json(
        { error: 'Zoom is not configured' },
        { status: 400 },
      );
    }

    const { accessToken } = await getZoomAccessToken({
      organizationId,
      zoomConfig: settings.zoom,
      forceRefresh: true,
    });

    const response = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { status: response.status, errorText },
        'Zoom test connection failed',
      );

      await Settings.findOneAndUpdate(
        { organizationId },
        { $set: { 'zoom.isConnected': false } },
        { new: true },
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Zoom connection failed',
          details: errorText,
        },
        { status: 400 },
      );
    }

    const data = (await response.json()) as { email?: string };

    if (data?.email) {
      await Settings.findOneAndUpdate(
        { organizationId },
        { $set: { 'zoom.connectedEmail': data.email } },
        { new: true },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Zoom connection successful',
      data: {
        connectedEmail: data?.email || '',
        lastTestedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({ error, url: req.url }, 'Zoom test connection error');
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to test connection',
      },
      { status: 500 },
    );
  }
}
