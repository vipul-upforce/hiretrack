import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { User, Organization } from '@/lib/mongodb';
import connectToDatabase, { User, Organization } from '@/lib/mongodb';
import mongoose from 'mongoose';

import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';

export async function GET(req: NextRequest) {
  try {
    const [session] = await Promise.all([
      getAuthenticatedUser(req, ['admin', 'hr']),
      connectToDatabase(),
    ]);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Give models a moment to initialize if they haven't already
    let retries = 0;
    while (!User && retries < 5) {
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      retries += 1;
    }

    if (!User) {
      return NextResponse.json(
        { error: 'Database models not initialized' },
        { status: 500 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(session.organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organization identifier' },
        { status: 400 },
      );
    }

    const orgObjectId = new mongoose.Types.ObjectId(session.organizationId);

    const [aggregated] = await User.aggregate([
      { $match: { organizationId: orgObjectId } },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          password: 0,
          refreshTokens: 0,
          resetToken: 0,
          resetTokenExpiry: 0,
        },
      },
      {
        $facet: {
          nonSystem: [{ $match: { role: { $ne: 'system' } } }],
          latestSystem: [{ $match: { role: 'system' } }, { $limit: 1 }],
        },
      },
      {
        $project: {
          result: { $concatArrays: ['$nonSystem', '$latestSystem'] },
        },
      },
    ]);

    return NextResponse.json(aggregated?.result ?? []);
  } catch (error: unknown) {
    logger.error({ error, url: req.url }, 'Error fetching users');
    return NextResponse.json(
      {
        error: `Internal server error${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  await connectToDatabase();

  // Give models a moment to initialize if they haven't already
  let retries = 0;
  while ((!User || !Organization) && retries < 5) {
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    retries += 1;
  }

  try {
    // eslint-disable-next-line prefer-const
    let { adminId, organizationId } = await req.json();
    organizationId = new mongoose.Types.ObjectId(organizationId);
    if (!adminId || !organizationId) {
      return NextResponse.json(
        { error: 'Both adminId and organizationId are required' },
        { status: 400 },
      );
    }
    if (!Organization) {
      return NextResponse.json(
        { error: 'Database models not initialized' },
        { status: 500 },
      );
    }
    const organization = await Organization.findById(organizationId).exec();
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }
    const DEFAULT_LANES = [
      'applied',
      'screening',
      'shortlisted',
      'processing',
      'accepted',
      'rejected',
    ];
    if (!organization.lanes || organization.lanes.length === 0) {
      organization.lanes = DEFAULT_LANES;
      await organization.save();
    }

    if (!User) {
      return NextResponse.json(
        { error: 'Database models not initialized' },
        { status: 500 },
      );
    }
    const updatedAdmin = await User.updateOne(
      { _id: adminId },
      { $set: { organizationId } },
    );

    if (updatedAdmin.matchedCount === 0) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    if (updatedAdmin.modifiedCount === 0) {
      return NextResponse.json({ error: 'No changes made' }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: 'Admin updated successfully',
        user: updatedAdmin,
        lanes: organization.lanes,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    logger.error({ error }, 'Error updating admin');
    return NextResponse.json(
      {
        error: `Failed to update admin${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      },
      { status: 400 },
    );
  }
}
