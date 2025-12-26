import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { User } from '@/lib/mongodb';
import { signAccessToken } from '@/app/actions/auth';
import { loginRateLimiter } from '@/lib/rateLimiter';
import {
  generateRefreshToken,
  hashRefreshToken,
  storeRefreshToken,
  cleanupExpiredTokens,
} from '@/lib/refreshToken';
import { logger } from '@/lib/logger/logger.server';
import { setAuthCookies } from '@/lib/authCookies';

const returnTokenBasedResponse = async (obj: any, orgId: string) => {
  // Generate short-lived access token (15 minutes)
  const accessToken = await signAccessToken(obj[0], orgId);

  const userId = obj[0].id;
  const { role } = obj[0];
  const isCandidate = role === 'candidate';

  // Cleanup expired tokens before storing new one (keeps array clean)
  await cleanupExpiredTokens(userId, isCandidate);

  // Generate refresh token using JWT (same method as access token)
  const refreshTokenPayload = {
    userId,
    role,
    orgId,
    isCandidate,
    tokenVersion: obj[0].tokenVersion,
  };

  const refreshToken = generateRefreshToken(refreshTokenPayload, orgId);
  const refreshTokenHash = hashRefreshToken(refreshToken);

  // Store hashed refresh token in database
  await storeRefreshToken(
    userId,
    refreshTokenHash,
    isCandidate,
    7, // 7 days
  );

  const response = NextResponse.json({
    message: 'Logged In Successfully',
    user: accessToken,
    refreshToken, // Return JWT refresh token to client
  });

  setAuthCookies({
    response,
    accessToken,
    refreshToken,
    orgId,
  });

  return response;
};
async function handleVerifyOtp(req: NextRequest) {
  try {
    await connectToDatabase();
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { message: 'Email and OTP are required' },
        { status: 400 },
      );
    }

    const userData = await User?.aggregate([
      {
        $match: {
          email,
          otp: Number(otp),
          otpExpires: { $gt: new Date() },
        },
      },
      {
        $lookup: {
          from: 'organizations',
          localField: 'organizationId',
          foreignField: '_id',
          as: 'organizationInfo',
        },
      },
      {
        $unwind: {
          path: '$organizationInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'settings',
          localField: 'organizationId',
          foreignField: 'organizationId',
          as: 'settings',
        },
      },
      {
        $unwind: {
          path: '$settings',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          id: { $toString: '$_id' },
          name: 1,
          email: 1,
          role: 1,
          organizationId: { $toString: '$organizationId' },
          organizationInfo: {
            _id: { $toString: '$organizationInfo._id' },
            name: '$organizationInfo.name',
            adminId: '$organizationInfo.adminId',
            lanes: '$organizationInfo.lanes',
            openJobCards: '$organizationInfo.openJobCards',
            appliedApplications: '$organizationInfo.appliedApplications',
            tags: '$organizationInfo.tags',
          },
          fileStorage: '$settings.fileStorage.storageType',
          _id: 0,
        },
      },
    ]);

    if (userData) {
      // Remove OTP and otpExpires
      await User?.updateOne(
        { email, otp },
        { $unset: { otp: 1, otpExpires: 1 } },
      );

      const response = await returnTokenBasedResponse(
        userData,
        userData[0].organizationId,
      );
      return response;
    }
    return NextResponse.json(
      { message: 'Invalid or expired OTP' },
      { status: 400 },
    );
  } catch (error) {
    logger.error({ error }, ' Error verifying OTP');
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Export with rate limiting
export async function POST(req: Request) {
  // SECURITY FIX: Apply rate limiting to prevent OTP brute force attacks
  return loginRateLimiter(req as NextRequest, handleVerifyOtp);
}
