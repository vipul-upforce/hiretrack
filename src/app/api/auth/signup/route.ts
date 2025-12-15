import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase, { CandidateAccount, User, Lane } from '@/lib/mongodb';
import mongoose from 'mongoose';
import { signupRateLimiter } from '@/lib/rateLimiter';
import { NotificationService } from '@/lib/notifications/notificationService';
import { logger } from '@/lib/logger/logger.server';

async function handleSignup(req: NextRequest) {
  try {
    await connectToDatabase();
    const {
      email,
      password,
      name,
      role,
      triggerUserId,
      triggerUserName,
      organizationId,
    } = await req.json();

    let orgId = organizationId;

    if (!(organizationId instanceof mongoose.Types.ObjectId)) {
      orgId = new mongoose.Types.ObjectId(organizationId);
    }
    if (!User || !Lane) {
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 400 },
      );
    }
    // Check if user already exists in the same organization
    const existingUser =
      (await User.findOne({ email, orgId })) ||
      (await CandidateAccount?.findOne({ email, orgId }));

    if (existingUser) {
      if (existingUser.isDeleted) {
        return NextResponse.json(
          { error: 'User already exists, but is deactivated.' },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: 'User already exists in this organization' },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role,
      organizationId: orgId.toString(),
    });

    // Send user creation notification (only if triggerUser is provided, indicating this is an admin action)
    if (triggerUserId && triggerUserName && role !== 'candidate') {
      try {
        await NotificationService.notifyUserAdded({
          organizationId: orgId.toString(),
          newUserId: user._id.toString(),
          newUserName: user.name,
          newUserEmail: user.email,
          newUserRole: user.role,
          triggerUserId,
          triggerUserName,
        });
      } catch (notificationError) {
        logger.error(
          { notificationError },
          'Failed to send user creation notification',
        );
      }
    }

    const response = NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 },
    );

    return response;
  } catch (error: unknown) {
    logger.error({ error }, 'Error during user signup');
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'An unknown error occured.' },
      { status: 500 },
    );
  }
}

// Export with rate limiting
export async function POST(req: Request) {
  // SECURITY FIX: Apply rate limiting to prevent signup spam
  return signupRateLimiter(req as NextRequest, handleSignup);
}
