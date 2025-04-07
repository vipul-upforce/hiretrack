import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dbConnect, { CandidateAccount } from '@/lib/mongodb';
import { User } from '@/lib/mongodb';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { token, password } = await req.json();

    if (!User || !CandidateAccount) {
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 500 }
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
      // console.log("Checking user collection:", user ? "Found" : "Not found");
    } catch (e) {
      user = null;
      console.log("ERROR FINDING USER:", e);
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
        console.log("ERROR FINDING CANDIDATE:", e);
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
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
} 