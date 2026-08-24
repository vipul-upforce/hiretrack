import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import CryptoJS from 'crypto-js';
import { User, CandidateAccount } from '@/lib/mongodb';
import { signAccessToken } from '@/app/actions/auth';
import { IAccessTokenPayload } from '@/types/login';
import { NextResponse } from 'next/server';
import { UserRole } from './models/JobLaneConfig';
import { generateOrgJwtSecret } from './jwtSecretGenerator';
import { setAuthCookies } from './authCookies';
import { logger } from './logger/logger.server';

export interface RefreshTokenPayload {
  userId: string;
  orgId: string;
  isCandidate: boolean;
  tokenVersion?: number;
  role?: UserRole | string;
}

export function generateRefreshToken(
  payload: RefreshTokenPayload,
  orgId: string,
): string {
  const JWT_SECRET = generateOrgJwtSecret(orgId);
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined');

  // Encrypt payload with AES (same as access token)
  const encryptedPayload = CryptoJS.AES.encrypt(
    JSON.stringify(payload),
    JWT_SECRET,
  ).toString();

  // Sign with JWT (7 days expiration)
  return jwt.sign({ refresh: encryptedPayload }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

/**
 * Verify and decrypt refresh token (same method as access token)
 */
export function verifyAndDecryptRefreshToken(
  token: string,
  orgId: string,
): {
  success: boolean;
  payload?: RefreshTokenPayload;
  error?: string;
  isExpired?: boolean;
} {
  try {
    const JWT_SECRET = generateOrgJwtSecret(orgId);
    if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined');

    // Verify JWT signature
    const decoded = jwt.verify(token, JWT_SECRET);

    if (
      !decoded ||
      typeof decoded !== 'object' ||
      !(decoded as { refresh?: string }).refresh
    ) {
      throw new Error('Invalid token structure');
    }

    // Decrypt payload with AES
    const bytes = CryptoJS.AES.decrypt(
      (decoded as { refresh: string }).refresh,
      JWT_SECRET,
    );
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    // Check expiration
    const exp =
      typeof decoded === 'object' && 'exp' in decoded
        ? (decoded.exp as number) * 1000 // Convert to milliseconds
        : null;

    const isExpired = exp ? exp < Date.now() : false;

    return {
      success: true,
      payload: decryptedData as RefreshTokenPayload,
      isExpired,
    };
  } catch (err) {
    // Check if token is expired
    if (err instanceof jwt.TokenExpiredError) {
      logger.info(
        { orgId: orgId ? `${orgId.substring(0, 8)}...` : '(empty)', isExpired: true },
        'Refresh token JWT expired',
      );
      return {
        success: false,
        error: 'Token expired',
        isExpired: true,
      };
    }

    const errorMessage = err instanceof Error ? err.message : 'Unknown Error Occurred';
    logger.warn(
      { orgId: orgId ? `${orgId.substring(0, 8)}...` : '(empty)', error: errorMessage },
      'Refresh token verify/decrypt failed',
    );
    return {
      success: false,
      error: errorMessage,
      isExpired: false,
    };
  }
}

/**
 * Hash refresh token before storing in database
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Clear refresh token from database
 * If tokenHash is provided, clears only that specific token
 * If tokenHash is not provided, clears all tokens
 */
export async function clearRefreshToken(
  userId: string,
  tokenHash?: string,
  isCandidate: boolean = false,
): Promise<void> {
  if (isCandidate) {
    if (tokenHash) {
      // Clear specific token
      await CandidateAccount!.findByIdAndUpdate(userId, {
        $pull: { refreshTokens: { token: tokenHash } },
      });
    } else {
      // Clear all tokens
      await CandidateAccount!.findByIdAndUpdate(userId, {
        $set: { refreshTokens: [] },
      });
    }
  } else if (tokenHash) {
    // Clear specific token
    await User!.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { token: tokenHash } },
    });
  } else {
    // Clear all tokens
    await User!.findByIdAndUpdate(userId, { $set: { refreshTokens: [] } });
  }
}
/**
 * Store refresh token in database (supports multiple devices)
 */
export async function storeRefreshToken(
  userId: string,
  tokenHash: string,
  isCandidate: boolean = false,
  expiryDays: number = 7,
): Promise<void> {
  const expiry = new Date();
  expiry.setTime(expiry.getTime() + expiryDays * 24 * 60 * 60 * 1000);

  const tokenEntry = {
    token: tokenHash,
    expiry,
    createdAt: new Date(),
  };

  if (isCandidate) {
    await CandidateAccount!.findByIdAndUpdate(userId, {
      $push: { refreshTokens: tokenEntry },
    });
  } else {
    await User!.findByIdAndUpdate(userId, {
      $push: { refreshTokens: tokenEntry },
    });
  }
}
/**
 * Cleanup expired tokens from database
 */
/**
 * Cleanup expired tokens from database
 * Uses $pull to atomically remove expired tokens - safe even if none exist
 * Uses a 5 second buffer to prevent deleting tokens that are valid but close to expiry
 * due to clock skew or timing issues
 *
 * @param excludeTokenHash - Optional token hash to exclude from cleanup (e.g., the token being verified)
 */
export async function cleanupExpiredTokens(
  userId: string,
  beforeDate: Date | null | undefined, // Optional date to filter tokens before
  excludeTokenHash: string | undefined = undefined, // Token to exclude from cleanup
  isCandidate: boolean = false,
): Promise<void> {
  const cutoffDate = beforeDate || new Date();
  // Add 5 second buffer - only delete tokens that are clearly expired
  // This prevents race conditions and clock skew issues
  const buffer = new Date(cutoffDate.getTime() - 5000);

  // Build pull condition - exclude specific token if provided
  interface PullCondition {
    expiry: { $lte: Date };
    token?: { $ne: string };
  }

  const pullCondition: PullCondition = { expiry: { $lte: buffer } };
  if (excludeTokenHash) {
    // Exclude the specified token from cleanup
    pullCondition.token = { $ne: excludeTokenHash };
  }

  if (isCandidate) {
    const result = await CandidateAccount!.findByIdAndUpdate(
      userId,
      {
        $pull: { refreshTokens: pullCondition },
      },
      { new: true, select: 'refreshTokens' },
    );

    if (result?.refreshTokens) {
      logger.info(
        {
          userId,
          isCandidate: true,
          cutoffDate: buffer.toISOString(),
          remainingTokens: result.refreshTokens.length,
          excludedToken: excludeTokenHash
            ? `${excludeTokenHash.substring(0, 8)}...`
            : undefined,
        },
        'Cleaned up expired candidate tokens',
      );
    }
  } else {
    const result = await User!.findByIdAndUpdate(
      userId,
      {
        $pull: { refreshTokens: pullCondition },
      },
      { new: true, select: 'refreshTokens' },
    );

    if (result?.refreshTokens) {
      logger.info(
        {
          userId,
          isCandidate: false,
          cutoffDate: buffer.toISOString(),
          remainingTokens: result.refreshTokens.length,
          excludedToken: excludeTokenHash
            ? `${excludeTokenHash.substring(0, 8)}...`
            : undefined,
        },
        'Cleaned up expired user tokens',
      );
    }
  }
}

/**
 * Verify refresh token from database (supports multiple devices)
 * First decrypts the JWT token, then verifies it exists in database
 */
export async function verifyRefreshToken(
  token: string,
  userId: string,
  orgId: string,
  isCandidate: boolean = false,
): Promise<{
  valid: boolean;
  payload?: RefreshTokenPayload;
  error?: string;
}> {
  logger.info(
    { userId, orgId: orgId ? `${orgId.substring(0, 8)}...` : '(empty)', isCandidate },
    'Verify refresh token start',
  );

  // First, verify and decrypt the JWT token
  const tokenVerification = verifyAndDecryptRefreshToken(token, orgId);

  if (!tokenVerification.success || !tokenVerification.payload) {
    logger.warn(
      { userId, orgId: orgId ? `${orgId.substring(0, 8)}...` : '(empty)', error: tokenVerification.error },
      'Refresh token JWT verification failed',
    );
    return {
      valid: false,
      error: tokenVerification.error || 'Token verification failed',
    };
  }

  const { payload } = tokenVerification;
  // Verify the token belongs to the correct user
  if (payload.userId !== userId) {
    logger.warn(
      { payloadUserId: payload.userId, expectedUserId: userId, isCandidate },
      'Refresh token user mismatch',
    );
    return {
      valid: false,
      error: 'Token user mismatch',
    };
  }

  // Hash the token for database lookup
  const tokenHash = hashRefreshToken(token);

  // Fetch user data first to check if token exists BEFORE cleanup
  // This prevents race condition where cleanup deletes the token we're verifying
  const user = isCandidate
    ? await CandidateAccount!.findById(userId).select('+refreshTokens')
    : await User!.findById(userId).select('+refreshTokens');

  if (!user || !user.refreshTokens || user.refreshTokens.length === 0) {
    logger.warn(
      { userId, isCandidate, hasUser: !!user, tokenCount: user?.refreshTokens?.length ?? 0 },
      'No refresh tokens found for user',
    );
    return {
      valid: false,
      error: 'No refresh tokens found for user',
    };
  }

  const now = new Date();

  // Log all tokens before cleanup for debugging


  // Check if the token we're verifying exists and is valid BEFORE cleanup
  const currentToken = user.refreshTokens.find((rt) => rt.token === tokenHash);

  if (currentToken) {
    const expiryDate =
      currentToken.expiry instanceof Date
        ? currentToken.expiry
        : new Date(currentToken.expiry);

    // Check if current token is expired
    if (expiryDate <= now) {
      logger.warn(
        {
          userId,
          isCandidate,
          tokenHash: `${tokenHash.substring(0, 8)}...`,
          expiry: expiryDate.toISOString(),
          now: now.toISOString(),
        },
        'Current token is expired',
      );
      return {
        valid: false,
        error: 'Token expired',
      };
    }
  }

  // Filter valid tokens (not expired) - use strict comparison with buffer
  // Add 1 second buffer to account for clock skew between server and database
  const buffer = new Date(now.getTime() - 1000); // Subtract 1 second for safety
  const validTokens = user.refreshTokens.filter((rt) => {
    const expiryDate =
      rt.expiry instanceof Date ? rt.expiry : new Date(rt.expiry);
    // Only consider tokens expired if they're at least 1 second past expiry
    return expiryDate > buffer;
  });

  // Only cleanup tokens that are clearly expired (with buffer)
  // CRITICAL: Exclude the current token from cleanup to prevent deleting the token we're verifying
  // This prevents race conditions where valid tokens are accidentally deleted
  await cleanupExpiredTokens(userId, buffer, tokenHash, isCandidate);

  if (validTokens.length === 0) {
    logger.warn(
      { userId, isCandidate, tokenHashPrefix: tokenHash.substring(0, 8) },
      'All stored refresh tokens expired',
    );
    return {
      valid: false,
      error: 'All tokens expired',
    };
  }

  // Find matching token from valid tokens
  const tokenEntry = validTokens.find((rt) => rt.token === tokenHash);

  if (!tokenEntry) {
    const tokenHashes = validTokens.map((rt) => rt.token);
    const hasPartialMatch = tokenHashes.some(
      (hash) =>
        hash &&
        tokenHash &&
        (hash.startsWith(tokenHash.substring(0, 8)) ||
          tokenHash.startsWith(hash.substring(0, 8))),
    );
    const errorReason = hasPartialMatch
      ? 'Token hash mismatch (possible rotation race condition)'
      : 'Token not found in database';
    logger.warn(
      {
        userId,
        isCandidate,
        tokenHashPrefix: tokenHash.substring(0, 8),
        validTokenCount: validTokens.length,
        hasPartialMatch,
      },
      `Refresh token DB check failed: ${errorReason}`,
    );
    return {
      valid: false,
      error: errorReason,
    };
  }

  logger.info(
    { userId, isCandidate, tokenHashPrefix: tokenHash.substring(0, 8) },
    'Refresh token verified successfully',
  );
  return {
    valid: true,
    payload,
  };
}

/**
 * Update refresh token (for token rotation)
 * Supports multiple concurrent tabs by:
 * 1. Adding the new token to the array
 * 2. Keeping the old token valid for a grace period (2 minutes)
 *    to allow other tabs to refresh concurrently
 * 3. The old token will be cleaned up automatically after expiry
 */
export async function updateRefreshToken(
  userId: string,
  oldTokenHash: string,
  newTokenHash: string,
  isCandidate: boolean = false,
): Promise<boolean> {
  logger.info(
    {
      userId,
      isCandidate,
      oldTokenPrefix: oldTokenHash.substring(0, 8),
      newTokenPrefix: newTokenHash.substring(0, 8),
    },
    'Token rotation: updating refresh token',
  );

  const newExpiry = new Date();
  newExpiry.setTime(newExpiry.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Grace period expiry for old token (2 minutes) to allow concurrent tab refreshes
  const gracePeriodExpiry = new Date();
  gracePeriodExpiry.setTime(gracePeriodExpiry.getTime() + 2 * 60 * 1000); // 2 minutes

  const newTokenEntry = {
    token: newTokenHash,
    expiry: newExpiry,
    createdAt: new Date(),
  };

  try {
    if (isCandidate) {
      const graceResult = await CandidateAccount!.findByIdAndUpdate(
        userId,
        {
          $set: {
            'refreshTokens.$[oldElem].expiry': gracePeriodExpiry,
          },
        },
        {
          arrayFilters: [{ 'oldElem.token': oldTokenHash }],
          new: true,
        },
      );
      if (!graceResult) {
        logger.warn({ userId, isCandidate }, 'Token rotation: user not found (candidate)');
        return false;
      }
      await CandidateAccount!.findByIdAndUpdate(userId, {
        $push: { refreshTokens: newTokenEntry },
      });
    } else {
      const graceResult = await User!.findByIdAndUpdate(
        userId,
        {
          $set: {
            'refreshTokens.$[oldElem].expiry': gracePeriodExpiry,
          },
        },
        {
          arrayFilters: [{ 'oldElem.token': oldTokenHash }],
          new: true,
        },
      );
      if (!graceResult) {
        logger.warn({ userId, isCandidate }, 'Token rotation: user not found');
        return false;
      }
      await User!.findByIdAndUpdate(userId, {
        $push: { refreshTokens: newTokenEntry },
      });
    }
    logger.info({ userId, isCandidate }, 'Token rotation completed');
    return true;
  } catch (err) {
    logger.error(
      { userId, isCandidate, error: err instanceof Error ? err.message : String(err) },
      'Token rotation failed',
    );
    return false;
  }
}

export const returnTokenBasedResponse = async (
  obj: IAccessTokenPayload,
): Promise<NextResponse> => {
  // Generate short-lived access token (30 minutes)
  const userId = obj.id;
  const { role } = obj;
  const isCandidate = role === 'candidate';
  const orgId = obj.organizationId.toString();
  const accessToken = await signAccessToken(obj, orgId);
  // const now = new Date();
  // // Cleanup expired tokens before storing new one (keeps array clean)
  // await cleanupExpiredTokens(userId, now, isCandidate);

  // Generate refresh token using JWT (same method as access token)
  const refreshTokenPayload = {
    userId,
    role,
    orgId,
    isCandidate,
    tokenVersion: obj.tokenVersion as number,
    fileStorage: obj.fileStorage as string,
    appliedApplications: obj.appliedApplications as string[],
  };

  const refreshToken = generateRefreshToken(refreshTokenPayload, orgId);
  const refreshTokenHash = hashRefreshToken(refreshToken);

  // Store hashed refresh token in database
  await storeRefreshToken(userId, refreshTokenHash, isCandidate, 7);

  const response = NextResponse.json({
    message: 'Logged In Successfully',
    loggedIn: true,
  });

  // Centralized auth cookie handling
  setAuthCookies({
    response,
    accessToken,
    refreshToken,
    orgId,
  });

  return response;
};
