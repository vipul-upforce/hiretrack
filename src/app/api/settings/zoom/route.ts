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
      .select('zoom')
      .lean();

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    const zoom = settings?.zoom || {
      isConnected: false,
      accountId: '',
      clientId: '',
      clientSecret: '',
      accessToken: '',
      expiryDate: null,
      connectedEmail: '',
    };

    if (zoom.clientSecret) {
      zoom.clientSecret = decryptText(zoom.clientSecret, organizationId);
    }
    if (zoom.accessToken) {
      zoom.accessToken = decryptText(zoom.accessToken, organizationId);
    }

    return NextResponse.json({ zoom });
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

    const { accountId, clientId, clientSecret } = await req.json();

    const updateData: Record<string, string> = {
      'zoom.accountId': accountId,
      'zoom.clientId': clientId,
    };

    if (clientSecret) {
      updateData['zoom.clientSecret'] = encryptText(
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
        select: 'zoom',
      },
    );

    if (!updatedSettings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: 'Zoom credentials updated successfully',
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
          'zoom.isConnected': false,
          'zoom.accessToken': '',
          'zoom.expiryDate': null,
          'zoom.connectedEmail': '',
        },
      },
      {
        new: true,
        runValidators: true,
        select: 'zoom',
      },
    );

    if (!updatedSettings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: 'Zoom disconnected successfully',
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
