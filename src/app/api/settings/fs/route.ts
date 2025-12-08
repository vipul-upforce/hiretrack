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
    })
      .select('fileStorage')
      .lean()
      .exec();

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ fileStorage: settings.fileStorage });
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
    const [userData, fileStorage] = await Promise.all([
      getAuthenticatedUser(req, 'admin'),
      req.json(),
      connectToDatabase(),
    ]);
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

    let storageObj;
    if (fileStorage.storageType === 's3') {
      storageObj = {
        awsRegion: fileStorage.awsRegion,
        awsAccessKeyId: fileStorage.awsAccessKeyId,
        awsSecretAccessKey: fileStorage.awsSecretAccessKey,
        awsBucketName: fileStorage.awsBucketName,
        storageType: fileStorage.storageType,
      };
    } else if (fileStorage.storageType === 'cloudinary') {
      storageObj = {
        cloudinaryCloudName: fileStorage.cloudinaryCloudName,
        cloudinaryApiKey: fileStorage.cloudinaryApiKey,
        cloudinaryApiSecret: fileStorage.cloudinaryApiSecret,
        storageType: fileStorage.storageType,
      };
    } else if (fileStorage.storageType === 'local') {
      storageObj = { storageType: 'local' };
    }

    const updatedUser = await Settings.findOneAndUpdate(
      {
        organizationId,
      },
      { fileStorage: storageObj },
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
