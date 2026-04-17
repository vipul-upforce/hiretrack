import { NextRequest, NextResponse } from 'next/server';
import {
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
  updateRefreshToken,
  // cleanupExpiredTokens,
  verifyAndDecryptRefreshToken,
} from '@/lib/refreshToken';
import { signAccessToken } from '@/app/actions/auth';
import connectToDatabase, {
  User,
  CandidateAccount,
  Settings,
} from '@/lib/mongodb';
import { validateLicense } from '@/lib/licenseUtils';
import { IUser } from '@/lib/models/user';
import { clearAuthTokens, setAuthCookies } from '@/lib/authCookies';
import { apiRateLimiter } from '@/lib/rateLimiter';
import * as Sentry from '@sentry/nextjs';

type RefreshReason =
  | 'NO_REFRESH_COOKIE'
  | 'LICENSE_INVALID'
  | 'TOKEN_NOT_FOUND_IN_DB'
  | 'TOKEN_DECRYPT_INVALID'
  | 'VERIFY_REFRESH_FAILED'
  | 'USER_NOT_FOUND_OR_DELETED'
  | 'REFRESH_SUCCESS'
  | 'REFRESH_UNEXPECTED_ERROR';

interface RefreshEventContext {
  hasRefreshCookie?: boolean;
  hasOrgCookie?: boolean;
  isCandidate?: boolean;
  orgId?: string;
  userId?: string;
  statusCode?: number;
}

function captureRefreshEvent(
  reason: RefreshReason,
  context: RefreshEventContext = {},
  level: Sentry.SeverityLevel = 'warning',
) {
  Sentry.withScope((scope) => {
    scope.setTag('module', 'auth');
    scope.setTag('flow', 'refresh');
    scope.setTag('reason', reason);
    scope.setLevel(level);
    scope.setContext('auth_refresh', context);
    Sentry.captureMessage(`auth.refresh.${reason.toLowerCase()}`);
  });
}

async function handleRefreshToken(req: NextRequest) {
  try {
    await connectToDatabase();

    // Read refresh token from httpOnly cookie only
    const refreshToken = req.cookies.get('refresh_token')?.value;
    const orgIdFromCookie = req.cookies.get('org_id')?.value;

    if (!refreshToken) {
      captureRefreshEvent('NO_REFRESH_COOKIE', {
        hasRefreshCookie: false,
        hasOrgCookie: Boolean(orgIdFromCookie),
        statusCode: 400,
      });
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 },
      );
    }

    // STEP 1: Validate license BEFORE refreshing token (runs every 15 min)
    const licenseValidation = await validateLicense();
    if (!licenseValidation.valid) {
      captureRefreshEvent('LICENSE_INVALID', {
        hasRefreshCookie: true,
        hasOrgCookie: Boolean(orgIdFromCookie),
        statusCode: 403,
      });
      const res = NextResponse.json(
        {
          error: 'License validation failed',
          licenseError: licenseValidation.error,
          code: 'LICENSE_INVALID',
        },
        { status: 403 },
      );
      clearAuthTokens(res);
      return res;
    }

    // STEP 2: Try to get orgId from cookie first (most common case)
    let tokenVerification = orgIdFromCookie
      ? verifyAndDecryptRefreshToken(refreshToken, orgIdFromCookie)
      : verifyAndDecryptRefreshToken(refreshToken, '');
    let orgId: string;
    let userId: string;
    let isCandidate: boolean;
    // If token is invalid, try to find orgId from database
    if (!tokenVerification.success || !tokenVerification.payload) {
      // Try to find user by hashed token in database to get orgId
      const tokenHash = hashRefreshToken(refreshToken);

      let user = await User!
        .findOne({
          'refreshTokens.token': tokenHash,
          'refreshTokens.expiry': { $gt: new Date() },
        })
        .select('+refreshTokens organizationId');

      let foundIsCandidate = false;
      if (!user) {
        user = await CandidateAccount!
          .findOne({
            'refreshTokens.token': tokenHash,
            'refreshTokens.expiry': { $gt: new Date() },
          })
          .select('+refreshTokens organizationId');
        foundIsCandidate = true;
      }

      if (!user) {
        captureRefreshEvent('TOKEN_NOT_FOUND_IN_DB', {
          hasRefreshCookie: true,
          hasOrgCookie: Boolean(orgIdFromCookie),
          statusCode: 401,
        });
        const response = NextResponse.json(
          { error: 'Invalid or expired refresh token' },
          { status: 401 },
        );
        clearAuthTokens(response);
        return response;
      }

      // Now try to decrypt with correct orgId from database
      orgId = user.organizationId.toString();
      tokenVerification = verifyAndDecryptRefreshToken(refreshToken, orgId);
      if (!tokenVerification.success || !tokenVerification.payload) {
        captureRefreshEvent('TOKEN_DECRYPT_INVALID', {
          hasRefreshCookie: true,
          hasOrgCookie: Boolean(orgIdFromCookie),
          orgId,
          statusCode: 401,
        });
        const res = NextResponse.json(
          { error: 'Invalid or expired refresh token' },
          { status: 401 },
        );
        clearAuthTokens(res);
        return res;
      }

      isCandidate = foundIsCandidate;
      const payload = tokenVerification.payload!;
      userId = payload.userId;
      orgId = payload.orgId; // This can override the orgId from user if needed
      isCandidate = payload.isCandidate || foundIsCandidate;
    } else {
      // Token was successfully decrypted
      const payload = tokenVerification.payload!;
      userId = payload.userId;
      orgId = payload.orgId;
      isCandidate = payload.isCandidate || false;
    }

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
      captureRefreshEvent('VERIFY_REFRESH_FAILED', {
        hasRefreshCookie: true,
        hasOrgCookie: Boolean(orgIdFromCookie),
        isCandidate,
        orgId,
        userId,
        statusCode: 401,
      });
      const res = NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 },
      );
      clearAuthTokens(res);
      return res;
    }

    // STEP 4: Get user data
    const user = isCandidate
      ? await CandidateAccount!
          .findById(userId)
          .select('name _id role email organizationId isDeleted ')
      : await User!
          .findById(userId)
          .select('tokenVersion name _id role email organizationId isDeleted ');

    if (!user || user.isDeleted) {
      captureRefreshEvent('USER_NOT_FOUND_OR_DELETED', {
        hasRefreshCookie: true,
        hasOrgCookie: Boolean(orgIdFromCookie),
        isCandidate,
        orgId,
        userId,
        statusCode: 404,
      });
      const res = NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
      clearAuthTokens(res);
      return res;
    }

    const fileStorage = await Settings!
      .findOne({ organizationId: orgId })
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
        ? ((user as IUser)?.tokenVersion as number | undefined | null)
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

    captureRefreshEvent(
      'REFRESH_SUCCESS',
      {
        hasRefreshCookie: true,
        hasOrgCookie: Boolean(orgIdFromCookie),
        isCandidate,
        orgId,
        userId,
        statusCode: 200,
      },
      'info',
    );

    return response;
  } catch (error) {
    captureRefreshEvent('REFRESH_UNEXPECTED_ERROR', {
      hasRefreshCookie: Boolean(req.cookies.get('refresh_token')?.value),
      hasOrgCookie: Boolean(req.cookies.get('org_id')?.value),
      statusCode: 500,
    });
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return apiRateLimiter(req as NextRequest, handleRefreshToken);
}
