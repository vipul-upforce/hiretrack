import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import CryptoJS from 'crypto-js';
import { User, CandidateAccount } from '@/lib/mongodb';
import { generateOrgJwtSecret } from './jwtSecretGenerator';
import { UserRole } from './models/JobLaneConfig';
import { signAccessToken } from '@/app/actions/auth';
import { IAccessTokenPayload } from '@/types/login';
import { NextResponse } from 'next/server';
import { setAuthCookies } from './authCookies';

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
      return {
        success: false,
        error: 'Token expired',
        isExpired: true,
      };
    }

    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown Error Occurred',
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
export async function cleanupExpiredTokens(
  userId: string,
  isCandidate: boolean = false,
): Promise<void> {
  console.log(
    ' in cleanupExpiredTokens-176',
    userId,
    isCandidate,
    'isCandidate',
  );

  const now = new Date();

  if (isCandidate) {
    await CandidateAccount!.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { expiry: { $lt: now } } },
    });
  } else {
    await User!.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { expiry: { $lt: now } } },
    });
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
}> {
  // First, verify and decrypt the JWT token
  const tokenVerification = verifyAndDecryptRefreshToken(token, orgId);

  if (!tokenVerification.success || !tokenVerification.payload) {
    return { valid: false };
  }

  const { payload } = tokenVerification;

  // Verify the token belongs to the correct user
  if (payload.userId !== userId) {
    return { valid: false };
  }

  // Hash the token for database lookup
  const tokenHash = hashRefreshToken(token);

  const user = isCandidate
    ? await CandidateAccount!.findById(userId).select('+refreshTokens')
    : await User!.findById(userId).select('+refreshTokens');

  console.log(user, 'user-170', isCandidate, 'isCandidate');
  if (!user || !user.refreshTokens || user.refreshTokens.length === 0) {
    console.log('user-172 not found');

    return { valid: false };
  }

  // Cleanup expired tokens before verification
  const now = new Date();
  const validTokens = user.refreshTokens.filter((rt) => rt.expiry > now);
  console.log(
    validTokens?.length,
    user.refreshTokens?.length,
    'validTokens-235',
  );
  if (validTokens.length < user.refreshTokens.length) {
    console.log(' in cleanuo cleanupExpiredTokens-236');

    await cleanupExpiredTokens(userId, isCandidate);
  }
  console.log(validTokens, 'validTokens-184');
  // Find matching token from valid tokens
  const tokenEntry = validTokens.find((rt) => rt.token === tokenHash);
  console.log(
    tokenEntry,
    tokenHash,
    'tokenEntry-187 if not found then it fails',
  );
  if (!tokenEntry) {
    return { valid: false };
  }

  return {
    valid: true,
    payload,
  };
}

/**
 * Update refresh token (for token rotation)
 */
export async function updateRefreshToken(
  userId: string,
  oldTokenHash: string,
  newTokenHash: string,
  isCandidate: boolean = false,
): Promise<void> {
  // In updateRefreshToken function (around line 267)
  const newExpiry = new Date();
  newExpiry.setTime(newExpiry.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  if (isCandidate) {
    await CandidateAccount!.findByIdAndUpdate(
      userId,
      {
        $set: {
          'refreshTokens.$[elem].token': newTokenHash,
          'refreshTokens.$[elem].expiry': newExpiry,
        },
      },
      {
        arrayFilters: [{ 'elem.token': oldTokenHash }],
      },
    );
  } else {
    await User!.findByIdAndUpdate(
      userId,
      {
        $set: {
          'refreshTokens.$[elem].token': newTokenHash,
          'refreshTokens.$[elem].expiry': newExpiry,
        },
      },
      {
        arrayFilters: [{ 'elem.token': oldTokenHash }],
      },
    );
  }
}




export const returnTokenBasedResponse = async (obj: IAccessTokenPayload): Promise<NextResponse> => {
  // Generate short-lived access token (15 minutes)
  const accessToken = await signAccessToken(obj, obj.organizationId);
  const userId = obj.id;
  const { role } = obj;
  const isCandidate = role === 'candidate';
  const orgId = obj.organizationId.toString();

  // Cleanup expired tokens before storing new one (keeps array clean)
  await cleanupExpiredTokens(userId, isCandidate);

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