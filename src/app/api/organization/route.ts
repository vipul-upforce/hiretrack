import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  Settings,
  Organization,
  User,
  Lane,
} from '@/lib/mongodb';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getAuthenticatedUser } from '@/app/actions/auth';
import path from 'path';
import fs from 'fs/promises';
import { apiRateLimiter } from '@/lib/rateLimiter';
import { logger } from '@/lib/logger/logger.server';

const ORG_BASE_DIR = path.join(process.cwd(), 'organizations');
// Handle POST request
async function ensureBaseDir() {
  try {
    await fs.mkdir(ORG_BASE_DIR, { recursive: true });
  } catch (error) {
    logger.error(
      { error },
      `Failed to create base directory ${ORG_BASE_DIR}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    throw new Error('Failed to initialize organization directory');
  }
}

export async function POST(req: NextRequest) {
  await connectToDatabase();
  let createdOrg = null;
  let admin = null;
  try {
    const { name, adminData } = await req.json();

    if (!Organization || !User || !Settings) {
      return NextResponse.json(
        { error: 'Database not connected.' },
        { status: 400 },
      );
    }

    // Check if any organization exists
    const orgCount = await Organization.countDocuments({}).lean().exec();
    const isFirstOrg = orgCount === 0;

    if (isFirstOrg) {
      // Allow creating first organization without authentication
      // userData can be null
    } else {
      // Organization(s) already exist - check multipleOrg setting
      const firstOrg = await Organization.findOne({}, { _id: 1, createdAt: 1 })
        .sort({ createdAt: 1 })
        .lean();

      if (!firstOrg) {
        return NextResponse.json(
          { error: 'Failed to retrieve organization settings.' },
          { status: 500 },
        );
      }

      const settings = await Settings.findOne(
        {
          organizationId: firstOrg._id.toString(),
        },
        { multipleOrg: 1 },
      ).lean();

      if (!settings?.multipleOrg) {
        return NextResponse.json(
          {
            error:
              'Enable multiple organizations from settings of the first organization.',
          },
          { status: 400 },
        );
      }

      // Multiple org is enabled - require authentication
      const userData = await getAuthenticatedUser(req, 'admin');
      if (!userData) {
        return NextResponse.json(
          {
            error:
              'Authentication required to create additional organizations.',
          },
          { status: 400 },
        );
      }
    }
    await ensureBaseDir();
    try {
      // 1. Create organization first
      createdOrg = await Organization.create([
        {
          name,
          adminId: new mongoose.Types.ObjectId(), // adminId is required
          customFields: {
            h3qmln24v: { fields: [], formName: 'Job Position' },
            g2xh8hoe1: { fields: [], formName: 'Candidate' },
          },
        },
      ]);
      const orgFolder = path.join(ORG_BASE_DIR, name);
      try {
        await fs.mkdir(orgFolder, { recursive: true });
      } catch (error) {
        logger.error(
          { error, url: req.url },
          `Failed to create folder for organization ${name}`,
        );
        // Optionally rollback organization creation
        await Organization.deleteOne({ _id: createdOrg[0]._id });
        throw new Error('Failed to create organization folder');
      }

      const hashedPassword = await bcrypt.hash(adminData.password, 10);

      // 2. Check if user with the same email already exists in the organization
      const existingUser = await User.findOne({
        email: adminData.email,
        organizationId: createdOrg[0]._id,
      });
      if (existingUser) {
        return NextResponse.json(
          { error: 'User with this email already exists in the organization.' },
          { status: 400 },
        );
      }

      // 3. Create admin user with org ID
      admin = await User.create([
        {
          ...adminData,
          password: hashedPassword,
          organizationId: createdOrg[0]._id,
          role: 'admin',
        },
      ]);

      await Settings.create([
        {
          organizationId: createdOrg[0]._id,
          multipleOrg: false,
          portalConfigs: {
            portalName: name,
          },
        },
      ]);

      // 4. Create default lanes for the organization
      if (Lane) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const defaultLanes = await (Lane as any).createDefaultLanes(
          createdOrg[0]._id,
          admin[0]._id, // createdBy
        );

        // Update organization with default lane references
        const laneIds = defaultLanes.map(
          (lane: { _id: mongoose.Types.ObjectId }) => lane._id,
        );
        await Organization.findByIdAndUpdate(
          createdOrg[0]._id,
          { defaultLanes: laneIds },
          { new: true },
        );
      }

      // 5. Update organization with admin ID
      await Organization.findByIdAndUpdate(
        createdOrg[0]._id,
        { adminId: admin[0]._id },
        { new: true },
      );

      return NextResponse.json(
        {
          message: 'Organization and Admin Created Successfully',
          organization: createdOrg[0],
          admin: admin[0],
          logout: !!req.cookies.get('org_id')?.value,
        },
        { status: 201 },
      );
    } catch (adminError) {
      // Manual rollback: Delete the created organization if admin creation fails
      if (createdOrg) {
        const orgFolder = path.join(ORG_BASE_DIR, name);
        await Organization.deleteOne({ _id: createdOrg[0]._id });
        try {
          await fs.rm(orgFolder, { recursive: true, force: true });
        } catch (cleanupError) {
          logger.warn(
            { cleanupError, url: req.url },
            `Failed to clean up folder ${orgFolder}:`,
          );
        }
      }
      throw adminError; // Re-throw to be caught by outer catch block
    }
  } catch (error: unknown) {
    logger.error({ error, url: req.url });
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Unknown error occurred' },
      { status: 400 },
    );
  }
}

// Handle PUT request
export async function PUT(req: Request) {
  await connectToDatabase();

  try {
    const { orgId, lanes } = await req.json();
    if (!Organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 },
      );
    }
    const updatedOrg = await Organization.findByIdAndUpdate(
      orgId,
      { lanes },
      { new: true },
    );

    if (!updatedOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(updatedOrg, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Unknown error occurred' },
      { status: 400 },
    );
  }
}

const handleChekOrg = async (req: NextRequest) => {
  try {
    await connectToDatabase();

    if (!Settings) {
      return NextResponse.json(
        { error: 'Settings model not found' },
        { status: 500 },
      );
    }

    // Get pagination parameters from query string
    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const skip = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          error:
            'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100.',
        },
        { status: 400 },
      );
    }

    // Fetch settings with pagination and optimized projection
    const [settings, totalCount] = await Promise.all([
      Settings.find(
        {},
        {
          fileStorage: 0,
          mailConfig: 0,
          gemini: 0,
          aiProviders: 0,
          emailTemplates: 0,
          googleCalendar: 0,
          zoom: 0,
          twoFA: 0,
        },
      )
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Settings.countDocuments({}),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    const orgCount = await Organization.countDocuments({}).lean().exec();
    let allow = false;

    if (orgCount > 1 || orgCount === 0) {
      allow = true;
    } else {
      const firstOrg = await Organization.findOne({}, { _id: 1, createdAt: 1 })
        .sort({ createdAt: 1 })
        .lean()
        .exec();

      if (firstOrg) {
        const firstOrgSettings = await Settings.findOne(
          { organizationId: firstOrg._id.toString() },
          { multipleOrg: 1 },
        )
          .lean()
          .exec();
        allow = firstOrgSettings?.multipleOrg ?? false;
      }
    }

    return NextResponse.json({
      allow,
      data: settings,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
};

//! !! THIS IMPLIES RESTRICT ACCESS TO REGISTER/ORG PAGE
export async function GET(req: NextRequest) {
  return apiRateLimiter(req as NextRequest, handleChekOrg);
}
