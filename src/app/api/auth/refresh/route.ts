import { NextRequest, NextResponse } from 'next/server';
import {
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
  updateRefreshToken,
  cleanupExpiredTokens,
  verifyAndDecryptRefreshToken,
} from '@/lib/refreshToken';
import { signAccessToken } from '@/app/actions/auth';
import connectToDatabase, {
  User,
  CandidateAccount,
  Settings,
} from '@/lib/mongodb';
import { validateLicense } from '@/lib/licenseUtils';
import { UserRole } from '@/lib/models/JobLaneConfig';
import { IUser } from '@/lib/models/user';
import { clearAuthTokens, setAuthCookies } from '@/lib/authCookies';

async function handleRefreshToken(req: NextRequest) {
  try {
    await connectToDatabase();

    // Read refresh token from httpOnly cookie only
    const refreshToken = req.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 },
      );
    }

    // STEP 1: Validate license BEFORE refreshing token (runs every 15 min)
    const licenseValidation = await validateLicense();
    if (!licenseValidation.valid) {
      return NextResponse.json(
        {
          error: 'License validation failed',
          licenseError: licenseValidation.error,
          code: 'LICENSE_INVALID',
        },
        { status: 403 },
      );
    }

    // STEP 2: Try to get orgId from cookie first (most common case)
    const orgIdFromCookie = req.cookies.get('org_id')?.value;

    let tokenVerification = orgIdFromCookie
      ? verifyAndDecryptRefreshToken(refreshToken, orgIdFromCookie)
      : verifyAndDecryptRefreshToken(refreshToken, '');
    let orgId: string;
    let userId: string;
    let isCandidate: boolean;
    let tokenVersion: number | undefined;
    let role: UserRole | undefined;
    // If token is invalid, try to find orgId from database
    if (!tokenVerification.success || !tokenVerification.payload) {
      // Try to find user by hashed token in database to get orgId
      const tokenHash = hashRefreshToken(refreshToken);

      let user = await User!.findOne({
        'refreshTokens.token': tokenHash,
        'refreshTokens.expiry': { $gt: new Date() },
      }).select('+refreshTokens organizationId');

      let foundIsCandidate = false;
      if (!user) {
        user = await CandidateAccount!.findOne({
          'refreshTokens.token': tokenHash,
          'refreshTokens.expiry': { $gt: new Date() },
        }).select('+refreshTokens organizationId');
        foundIsCandidate = true;
      }
      console.log(user, 'user-77');

      if (!user) {
        const response = NextResponse.json(
          { error: 'Invalid or expired refresh token' },
          { status: 401 },
        );
        // clearAuthTokens(response);
        return response;
      }

      // Now try to decrypt with correct orgId from database
      orgId = user.organizationId.toString();
      tokenVerification = verifyAndDecryptRefreshToken(refreshToken, orgId);
      if (!tokenVerification.success || !tokenVerification.payload) {
        console.log(tokenVerification, 'tokenVerification-failed-92');
        const res = NextResponse.json(
          { error: 'Invalid or expired refresh token' },
          { status: 401 },
        );
        // clearAuthTokens(res);
        return res;
      }

      isCandidate = foundIsCandidate;
    } else {
      // Token was successfully decrypted
      const payload = tokenVerification.payload!;
      orgId = payload.orgId;
      userId = payload.userId;
      isCandidate = payload.isCandidate || false;
      tokenVersion = payload.tokenVersion;
      role = payload.role as UserRole;
    }
    console.log(tokenVerification, 'tokenVerification-109');
    const payload = tokenVerification.payload!;
    if (!userId) userId = payload.userId;
    if (!orgId) orgId = payload.orgId;
    if (isCandidate === undefined) isCandidate = payload.isCandidate || false;
    if (!tokenVersion) tokenVersion = payload.tokenVersion;
    if (!role) role = payload.role as UserRole;

    // STEP 3: Verify token exists in database (only if userId is set)
    // if (userId) {
    //   await cleanupExpiredTokens(userId, isCandidate);
    // }

    const verification = await verifyRefreshToken(
      refreshToken,
      userId,
      orgId,
      isCandidate,
    );

    if (!verification.valid) {
      console.log(verification, 'verification-failed-131');
    //  const res =
    // clearAuthTokens(res);
    return  NextResponse.json(
      { error: 'Invalid or expired refresh token' },
      { status: 401 },
    );
    }

    // STEP 4: Get user data
    const user = isCandidate
      ? await CandidateAccount!.findById(userId)
          .select('name _id role email organizationId isDeleted ')
          
      : await User!.findById(userId)
          .select('tokenVersion name _id role email organizationId isDeleted ')
          
    if (!user || user.isDeleted) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const fileStorage = await Settings!.findOne({ organizationId: orgId })
      .select('fileStorage')
      .lean();

    // STEP 5: Generate new access token

    const userPayload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: orgId,
      tokenVersion: !isCandidate
        ? (user as IUser)?.tokenVersion as number | undefined | null
        : undefined,
      fileStorage: fileStorage?.fileStorage?.storageType as string,
    };

    const newAccessToken = await signAccessToken(userPayload, orgId);
    // STEP 6: Token rotation - Generate new refresh token (JWT)
    const newRefreshTokenPayload = {
      userId,
      orgId,
      isCandidate,
      role: user.role,
      tokenVersion: !isCandidate
        ? (user as IUser)?.tokenVersion || undefined
        : undefined,
    };

    const newRefreshToken = generateRefreshToken(newRefreshTokenPayload, orgId);
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
    const oldTokenHash = hashRefreshToken(refreshToken);

    // Update the specific token entry (token rotation)
    await updateRefreshToken(
      userId,
      oldTokenHash,
      newRefreshTokenHash,
      isCandidate,
    );

    // STEP 7: Set new tokens and related cookies using shared utility
    const response = NextResponse.json({
      message: 'Token refreshed successfully',
      licenseValid: true,
    });

    setAuthCookies({
      response,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      orgId,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return handleRefreshToken(req as NextRequest);
}
