import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Organization, Settings } from '@/lib/mongodb';
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
    if (!Settings || !Organization) {
      return NextResponse.json(
        { error: 'Settings Model Not Found' },
        { status: 404 },
      );
    }

    const totalOrgs = await Organization.countDocuments({}).lean().exec();
    if (totalOrgs > 1) {
      return NextResponse.json(
        {
          orgCount: totalOrgs,
          error: 'There already exists multiple Organizations',
        },
        { status: 403 },
      );
    }

    const settings = await Settings.findOne({
      organizationId,
    })
      .select('multipleOrg')
      .lean()
      .exec();

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ multipleOrg: settings.multipleOrg });
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
    const [userData, body] = await Promise.all([
      getAuthenticatedUser(req, 'admin'),
      req.json(),
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = userData.organizationId || '';

    if (!Settings || !Organization) {
      return NextResponse.json(
        { error: 'Settings Model Not Found' },
        { status: 404 },
      );
    }

    const multipleOrg = body?.multipleOrg;
    if (typeof multipleOrg !== 'boolean') {
      return NextResponse.json(
        { error: 'multipleOrg must be a boolean value' },
        { status: 400 },
      );
    }

    const totalOrgs = await Organization.countDocuments({}).lean().exec();
    if (totalOrgs > 1) {
      return NextResponse.json(
        { error: 'There already exists multiple Organizations' },
        { status: 403 },
      );
    }

    const updatedUser = await Settings.findOneAndUpdate(
      {
        organizationId,
      },
      { multipleOrg },
      {
        new: true,
        runValidators: true,
        upsert: true,
        select: 'multipleOrg',
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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
