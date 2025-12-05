import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';

export async function GET(req: NextRequest) {
  try {
    const [userData] = await Promise.all([
      getAuthenticatedUser(req, 'admin'),
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = userData.organizationId || '';

    if (!Settings) {
      return NextResponse.json(
        { error: 'Settings Model Not Found' },
        { status: 404 },
      );
    }

    const settings = await Settings.findOne({
      organizationId,
    }).select('evaluationConfig').lean().exec();

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    // Return evaluation config with defaults
    const evaluationConfig = settings.evaluationConfig || {
      temperature: 0.1,
      customPrompt: null,
      autoEvaluateAllCandidates: false,
      maxPdfPages: 4,
    };

    return NextResponse.json({ evaluationConfig });
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
    const [userData, evaluationConfig] = await Promise.all([
      getAuthenticatedUser(req, 'admin'),
      req.json(),
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = userData.organizationId || '';

    if (!Settings) {
      return NextResponse.json(
        { error: 'Settings Model Not Found' },
        { status: 404 },
      );
    }

    console.log('🟢🟢 Evaluation config update: ', evaluationConfig);

    // Validate temperature range
    if (
      evaluationConfig.temperature !== undefined
      && (evaluationConfig.temperature < 0 || evaluationConfig.temperature > 1)
    ) {
      return NextResponse.json(
        { error: 'Temperature must be between 0 and 1' },
        { status: 400 },
      );
    }

    // Validate maxPdfPages
    if (
      evaluationConfig.maxPdfPages !== undefined
      && evaluationConfig.maxPdfPages < 0
    ) {
      return NextResponse.json(
        { error: 'Max PDF pages must be 0 or greater (0 = no limit)' },
        { status: 400 },
      );
    }

    const updatedSettings = await Settings.findOneAndUpdate(
      {
        organizationId,
      },
      { evaluationConfig },
      {
        new: true,
        runValidators: true,
        upsert: true,
        select: 'evaluationConfig',
      },
    );

    if (!updatedSettings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: 'Evaluation settings updated successfully',
      evaluationConfig: updatedSettings.evaluationConfig,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
