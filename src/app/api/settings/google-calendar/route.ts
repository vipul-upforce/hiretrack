import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { encryptText, decryptText } from '@/lib/encryption';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const userData = await getAuthenticatedUser(req, ['admin', 'hr', 'interviewer']);
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
    }).select('googleCalendar').lean();

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    // Return Google Calendar configuration with decrypted credentials
    const googleCalendar = settings?.googleCalendar || {
      isConnected: false,
      clientId: '',
      clientSecret: '',
      accessToken: '',
      refreshToken: '',
      expiryDate: null,
      connectedEmail: '',
    };

    // Decrypt sensitive data
    if (googleCalendar.clientSecret) {
      googleCalendar.clientSecret = decryptText(
        googleCalendar.clientSecret,
        organizationId,
      );
    }
    if (googleCalendar.accessToken) {
      googleCalendar.accessToken = decryptText(
        googleCalendar.accessToken,
        organizationId,
      );
    }
    if (googleCalendar.refreshToken) {
      googleCalendar.refreshToken = decryptText(
        googleCalendar.refreshToken,
        organizationId,
      );
    }

    return NextResponse.json({ googleCalendar });
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

    const { clientId, clientSecret } = await req.json();

    // Prepare update data
    const updateData: any = {
      'googleCalendar.clientId': clientId,
    };

    // Only encrypt and update client secret if it's provided
    if (clientSecret) {
      updateData['googleCalendar.clientSecret'] = encryptText(
        clientSecret,
        organizationId,
      );
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
        select: 'googleCalendar',
      },
    );
    if (!updatedSettings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: 'Google Calendar credentials updated successfully',
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

    // Clear Google Calendar connection
    const updatedSettings = await Settings.findOneAndUpdate(
      {
        organizationId,
      },
      {
        $set: {
          'googleCalendar.isConnected': false,
          'googleCalendar.accessToken': '',
          'googleCalendar.refreshToken': '',
          'googleCalendar.expiryDate': null,
          'googleCalendar.connectedEmail': '',
        },
      },
      {
        new: true,
        runValidators: true,
        select: 'googleCalendar',
      },
    );

    if (!updatedSettings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: 'Google Calendar disconnected successfully',
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
