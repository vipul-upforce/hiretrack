import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { Settings } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const userCookie = req.cookies.get('user');
    const userData = JSON.parse(userCookie?.value || '{}');
    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!Settings) {
      return NextResponse.json({ error: 'Settings Model Not Found' }, { status: 404 });
    }
    const settings = await Settings.findOne({ organizationId: userData.organizationId });

    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    return NextResponse.json(settings.smtpConfig);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const userCookie = req.cookies.get('user');
    const userData = JSON.parse(userCookie?.value || '{}');

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!Settings) {
      return NextResponse.json({ error: 'Settings Model Not Found' }, { status: 404 });
    }

    const smtpConfig = await req.json();

    const updatedUser = await Settings.findOneAndUpdate(
      {
        organizationId: userData.organizationId
      },
      { smtpConfig },
      {
        new: true,
        runValidators: true,
        upsert: true
      }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Settings updated successfully' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
