import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Organization, Settings } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(req.url);
    let organizationId = url.searchParams?.get('orgId') || '';

    const userData = await getAuthenticatedUser(req, 'admin');
    if (userData) {
      organizationId = userData.organizationId || '';
    } else if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!Settings || !Organization) {
      return NextResponse.json(
        { error: 'Settings Model Not Found' },
        { status: 404 },
      );
    }

    // const totalOrgs = await Organization.countDocuments({});
    // if (totalOrgs > 1) {
    //   return NextResponse.json(
    //     {
    //       orgCount: totalOrgs,
    //       error: "There already exists multiple Organizations",
    //     },
    //     { status: 403 }
    //   );
    // }

    const settings = await Settings.findOne({
      // organizationId: userData.organizationId,
      organizationId,
    }).select('twoFA').lean().exec();

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    // console.log(settings)

    return NextResponse.json({ twoFA: settings.twoFA });
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
    const [userData, { enable2FA }] = await Promise.all([
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

    // Check email configuration before enabling 2FA
    const settings = await Settings.findOne({ organizationId }).select('mailConfig').lean().exec();

    if (
      enable2FA
      && (!settings?.mailConfig?.mailProvider
        || settings.mailConfig.mailProvider === '')
    ) {
      return NextResponse.json(
        {
          error:
            'Email configuration with valid provider is required to enable 2FA',
        },
        { status: 400 },
      );
    }

    const updatedUser = await Settings.findOneAndUpdate(
      {
        organizationId,
      },
      {
        twoFA: {
          enable2FA,
        },
      },
      {
        new: true,
        runValidators: true,
        upsert: true,
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
