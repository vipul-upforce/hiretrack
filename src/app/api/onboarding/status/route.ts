import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const user = await getAuthenticatedUser(req, 'admin');
    if (!user) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    const settings = await Settings?.findOne({
      organizationId: user.organizationId,
    })
      .select('onboardingStatus')
      .lean()
      .exec();

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    const onboardingStatus = settings.onboardingStatus || {
      isCompleted: false,
      completedSteps: [],
      skippedSteps: [],
      doNotShowAgain: false,
      currentStep: 0,
      lastUpdated: new Date(),
    };

    return NextResponse.json({ onboardingStatus });
  } catch (error) {
    logger.error({ error, url: req.url }, 'Error fetching onboarding status');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req, 'admin');
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();
    const body = await req.json();

    const allowedFields = [
      'completedSteps',
      'skippedSteps',
      'doNotShowAgain',
      'currentStep',
      'isCompleted',
    ];

    const $set: Record<string, any> = {
      'onboardingStatus.lastUpdated': new Date(),
    };

    for (const key of allowedFields) {
      if (key in body) {
        $set[`onboardingStatus.${key}`] = body[key];
      }
    }

    const updated = await Settings?.findOneAndUpdate(
      { organizationId: user.organizationId },
      { $set },
      { new: true },
    ).select('onboardingStatus');

    return NextResponse.json({
      success: true,
      onboardingStatus: updated?.onboardingStatus,
    });
  } catch (error) {
    logger.error({ error, url: req.url }, 'Error updating onboarding status');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
