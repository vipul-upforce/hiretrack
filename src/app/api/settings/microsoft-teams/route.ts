import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { encryptText, decryptText } from '@/lib/encryption';
import {
  normalizeTeamsReminderTemplates,
  toTeamsReminderTemplateStorageMap,
} from '@/lib/microsoft-teams/reminderTemplates';
import { syncRemindersPingCrontab } from '@/lib/cron/remindersPingCrontab';

const DEFAULT_FOLLOWUP_REMINDER_OFFSET_MINUTES = 5;
const MAX_FOLLOWUP_REMINDER_OFFSET_MINUTES = 1440;

function parseFollowUpReminderOffsetMinutes(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_FOLLOWUP_REMINDER_OFFSET_MINUTES;
  }

  const numericValue =
    typeof value === 'number'
      ? value
      : Number.parseInt(String(value).trim(), 10);

  if (
    Number.isNaN(numericValue) ||
    !Number.isFinite(numericValue) ||
    !Number.isInteger(numericValue) ||
    numericValue < 0 ||
    numericValue > MAX_FOLLOWUP_REMINDER_OFFSET_MINUTES
  ) {
    throw new Error(
      `followUpReminderOffsetMinutes must be an integer between 0 and ${MAX_FOLLOWUP_REMINDER_OFFSET_MINUTES}`,
    );
  }

  return numericValue;
}

export async function GET(req: NextRequest) {
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
        { error: 'Settings Model Not Found' },
        { status: 404 },
      );
    }

    const settings = await Settings.findOne({
      organizationId,
    })
      .select('microsoftTeams')
      .lean();

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    const microsoftTeams = settings?.microsoftTeams || {
      isConnected: false,
      tenantId: '',
      clientId: '',
      clientSecret: '',
      accessToken: '',
      refreshToken: '',
      expiryDate: null,
      connectedEmail: '',
      isFollowUpReminderEnabled: false,
      followUpReminderOffsetMinutes: DEFAULT_FOLLOWUP_REMINDER_OFFSET_MINUTES,
      botUsername: '',
      botPassword: '',
    };

    if (microsoftTeams.clientSecret) {
      microsoftTeams.clientSecret = decryptText(
        microsoftTeams.clientSecret,
        organizationId,
      );
    }
    if (microsoftTeams.accessToken) {
      microsoftTeams.accessToken = decryptText(
        microsoftTeams.accessToken,
        organizationId,
      );
    }
    if (microsoftTeams.refreshToken) {
      microsoftTeams.refreshToken = decryptText(
        microsoftTeams.refreshToken,
        organizationId,
      );
    }
    if (microsoftTeams.botPassword) {
      microsoftTeams.botPassword = decryptText(
        microsoftTeams.botPassword,
        organizationId,
      );
    }
    if (
      typeof microsoftTeams.followUpReminderOffsetMinutes !== 'number' ||
      Number.isNaN(microsoftTeams.followUpReminderOffsetMinutes)
    ) {
      microsoftTeams.followUpReminderOffsetMinutes =
        DEFAULT_FOLLOWUP_REMINDER_OFFSET_MINUTES;
    }
    microsoftTeams.messageTemplates = normalizeTeamsReminderTemplates(
      microsoftTeams.messageTemplates,
    );

    return NextResponse.json({ microsoftTeams });
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = userData.organizationId || '';

    if (!Settings) {
      return NextResponse.json(
        { error: 'Settings Model Not Found' },
        { status: 404 },
      );
    }

    const {
      tenantId,
      clientId,
      clientSecret,
      connectedEmail,
      isFollowUpReminderEnabled,
      followUpReminderOffsetMinutes,
      botUsername,
      botPassword,
      messageTemplates,
    } = await req.json();

    const updateData: Record<string, unknown> = {
      'microsoftTeams.tenantId': tenantId,
      'microsoftTeams.clientId': clientId,
    };

    if (clientSecret) {
      updateData['microsoftTeams.clientSecret'] = encryptText(
        clientSecret,
        organizationId,
      );
    }

    if (connectedEmail) {
      updateData['microsoftTeams.connectedEmail'] = connectedEmail;
    }
    if (typeof isFollowUpReminderEnabled === 'boolean') {
      updateData['microsoftTeams.isFollowUpReminderEnabled'] =
        isFollowUpReminderEnabled;
    }
    try {
      updateData['microsoftTeams.followUpReminderOffsetMinutes'] =
        parseFollowUpReminderOffsetMinutes(followUpReminderOffsetMinutes);
    } catch (validationError) {
      return NextResponse.json(
        {
          error:
            validationError instanceof Error
              ? validationError.message
              : 'Invalid follow-up reminder offset',
        },
        { status: 400 },
      );
    }
    if (typeof botUsername === 'string') {
      updateData['microsoftTeams.botUsername'] = botUsername;
    }
    if (typeof botPassword === 'string') {
      updateData['microsoftTeams.botPassword'] = botPassword
        ? encryptText(botPassword, organizationId)
        : '';
    }
    if (messageTemplates !== undefined) {
      updateData['microsoftTeams.messageTemplates'] =
        toTeamsReminderTemplateStorageMap(messageTemplates);
    }

    const updatedSettings = await Settings.findOneAndUpdate(
      {
        organizationId,
      },
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        upsert: true,
        select: 'microsoftTeams',
      },
    );

    if (!updatedSettings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    const responseBody: {
      message: string;
      crontabRemindersPing?: {
        synced: boolean;
        enabled: boolean;
        warning?: string;
      };
    } = {
      message: 'Microsoft Teams credentials updated successfully',
    };

    if (typeof isFollowUpReminderEnabled === 'boolean') {
      const cronResult = await syncRemindersPingCrontab(
        isFollowUpReminderEnabled,
      );
      if (cronResult.ok && cronResult.found) {
        responseBody.crontabRemindersPing = {
          synced: true,
          enabled: isFollowUpReminderEnabled,
        };
      } else {
        const defaultWarning =
          process.platform === 'win32'
            ? 'Crontab is not used on Windows.'
            : cronResult.found
              ? 'Could not write crontab for reminders ping.'
              : 'No reminders ping line in crontab (run installer after BASE_URL is set).';
        responseBody.crontabRemindersPing = {
          synced: false,
          enabled: isFollowUpReminderEnabled,
          warning: cronResult.error ?? defaultWarning,
        };
      }
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    const userData = await getAuthenticatedUser(req, 'admin');
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { organizationId } = userData;

    if (!Settings) {
      return NextResponse.json(
        { error: 'Settings Model Not Found' },
        { status: 404 },
      );
    }

    const updatedSettings = await Settings.findOneAndUpdate(
      {
        organizationId,
      },
      {
        $set: {
          'microsoftTeams.isConnected': false,
          'microsoftTeams.accessToken': '',
          'microsoftTeams.refreshToken': '',
          'microsoftTeams.expiryDate': null,
          'microsoftTeams.connectedEmail': '',
        },
      },
      {
        new: true,
        runValidators: true,
        select: 'microsoftTeams',
      },
    );

    if (!updatedSettings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: 'Microsoft Teams disconnected successfully',
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
