import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';
import { testFollowUpReminderDelivery } from '@/lib/microsoft-teams/botMessaging';

interface TestReminderDeliveryBody {
  recipientEmail?: string;
  candidateName?: string;
  note?: string;
  followUpDate?: string;
  shouldSendMessage?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const userData = await getAuthenticatedUser(req, ['admin', 'hr']);

    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = userData.organizationId || '';
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization context is missing' },
        { status: 400 },
      );
    }

    let body: TestReminderDeliveryBody = {};
    try {
      body = (await req.json()) as TestReminderDeliveryBody;
    } catch {
      body = {};
    }

    const recipientEmail = (body.recipientEmail || userData.email || '').trim();
    if (!recipientEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'recipientEmail is required (or user email must be present)',
        },
        { status: 400 },
      );
    }

    const candidateName = (body.candidateName || 'Reminder Delivery Test').trim();
    const followUpDate =
      body.followUpDate && !Number.isNaN(new Date(body.followUpDate).getTime())
        ? new Date(body.followUpDate)
        : new Date();

    if (!Settings) {
      return NextResponse.json(
        { success: false, error: 'Settings model not available' },
        { status: 500 },
      );
    }

    const settings = await Settings.findOne({ organizationId })
      .select('microsoftTeams')
      .lean();
    if (!settings?.microsoftTeams) {
      return NextResponse.json(
        { success: false, error: 'Microsoft Teams settings are not configured' },
        { status: 400 },
      );
    }

    const result = await testFollowUpReminderDelivery({
      organizationId,
      microsoftTeams: settings.microsoftTeams,
      recipientEmail,
      candidateName,
      followUpDate,
      note: body.note,
      shouldSendMessage: !!body.shouldSendMessage,
    });

    return NextResponse.json(
      {
        success: result.success,
        message: result.success
          ? 'Reminder delivery diagnostic succeeded'
          : 'Reminder delivery diagnostic failed',
        result,
      },
      { status: result.success ? 200 : 400 },
    );
  } catch (error) {
    logger.error({ error }, 'Microsoft Teams reminder delivery diagnostic failed');
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to run delivery test',
      },
      { status: 500 },
    );
  }
}
