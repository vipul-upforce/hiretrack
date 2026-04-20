import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { encryptText, decryptText } from '@/lib/encryption';

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
      botUsername,
      botPassword,
    } = await req.json();

    const updateData: Record<string, string> = {
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
    if (typeof botUsername === 'string') {
      updateData['microsoftTeams.botUsername'] = botUsername;
    }
    if (typeof botPassword === 'string') {
      updateData['microsoftTeams.botPassword'] = botPassword
        ? encryptText(botPassword, organizationId)
        : '';
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

    return NextResponse.json({
      message: 'Microsoft Teams credentials updated successfully',
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
