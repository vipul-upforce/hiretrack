import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import connectToDatabase, { CandidateAccount, User } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { passwordResetTokenRateLimiter } from '@/lib/rateLimiter';
import { logger } from '@/lib/logger/logger.server';

async function handleResetPassword(req: NextRequest) {
  try {
    await connectToDatabase();
    const { token, password } = await req.json();

    if (!User || !CandidateAccount) {
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 500 },
      );
    }

    // Hash the token from the request
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid reset token
    let user = null;
    let isCandidate = false;

    try {
      user = await User.findOne({
        resetToken: resetTokenHash,
        resetTokenExpiry: { $gt: new Date() },
      });
    } catch {
      user = null;
    }

    if (!user) {
      try {
        user = await CandidateAccount.findOne({
          resetToken: resetTokenHash,
          resetTokenExpiry: { $gt: new Date() },
        });

        if (user) {
          isCandidate = true;
        }
      } catch (e) {
        logger.error({ error: e, url: req.url }, 'ERROR FINDING CANDIDATE');
        user = null;
      }
    }

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user's password and clear reset token
    if (isCandidate) {
      await CandidateAccount.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        resetToken: undefined,
        resetTokenExpiry: undefined,
      });
    } else {
      await User.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        resetToken: undefined,
        resetTokenExpiry: undefined,
      });
    }

    return NextResponse.json(
      { message: 'Password reset successful' },
      { status: 200 },
    );
  } catch (error) {
    logger.error({ error, url: req.url }, 'Reset password error');
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 },
    );
  }
}

// Export with rate limiting for POST
export async function POST(req: Request) {
  return passwordResetTokenRateLimiter(req as NextRequest, handleResetPassword);
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const { candidateId, password } = await req.json();

    if (!candidateId || !password) {
      return NextResponse.json(
        { error: 'Candidate ID and password are required' },
        { status: 400 },
      );
    }
    if (!User) {
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 404 },
      );
    }

    if (password.length < 7) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 },
      );
    }

    const userData = await getAuthenticatedUser(req, 'admin');
    if (!userData) {
      return NextResponse.json(
        { message: 'Unauthorised Access' },
        { status: 401 },
      );
    }
    const user = await User.findById(candidateId);
    if (!user) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.findByIdAndUpdate(candidateId, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });

    return NextResponse.json(
      { message: 'Password reset successful' },
      { status: 200 },
    );
  } catch (error) {
    logger.error({ error, url: req.url }, 'Reset password error');
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 },
    );
  }
}
