import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import CryptoJS from 'crypto-js';
import { User, CandidateAccount } from '@/lib/mongodb';
import { generateOrgJwtSecret } from './jwtSecretGenerator';
import { UserRole } from './models/JobLaneConfig';

export interface RefreshTokenPayload {
  userId: string;
  orgId: string;
  isCandidate: boolean;
  deviceId?: string;
  deviceInfo?: string;
  tokenVersion?: number;
  role?: UserRole | string;
}

/**
 * Generate a secure refresh token using JWT (same method as access token)
 * - Encrypts payload with AES
 * - Signs with JWT
 * - Expires in 7 days
 */
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
 * Store refresh token in database (supports multiple devices)
 */
export async function storeRefreshToken(
  userId: string,
  tokenHash: string,
  isCandidate: boolean = false,
  deviceId?: string,
  deviceInfo?: string,
  expiryDays: number = 7,
): Promise<string> {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + expiryDays);

  const deviceIdToUse = deviceId || crypto.randomUUID();
  const tokenEntry = {
    token: tokenHash,
    expiry,
    deviceId: deviceIdToUse,
    deviceInfo: deviceInfo || 'Unknown Device',
    createdAt: new Date(),
  };

  if (isCandidate) {
    await CandidateAccount.findByIdAndUpdate(userId, {
      $push: { refreshTokens: tokenEntry },
    });
  } else {
    await User.findByIdAndUpdate(userId, {
      $push: { refreshTokens: tokenEntry },
    });
  }

  return deviceIdToUse;
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
  deviceId?: string;
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
    ? await CandidateAccount.findById(userId).select('+refreshTokens')
    : await User.findById(userId).select('+refreshTokens');

  if (!user || !user.refreshTokens || user.refreshTokens.length === 0) {
    return { valid: false };
  }

  // Cleanup expired tokens before verification
  const now = new Date();
  const validTokens = user.refreshTokens.filter((rt) => rt.expiry > now);

  if (validTokens.length < user.refreshTokens.length) {
    await cleanupExpiredTokens(userId, isCandidate);
  }

  // Find matching token from valid tokens
  const tokenEntry = validTokens.find((rt) => rt.token === tokenHash);

  if (!tokenEntry) {
    return { valid: false };
  }

  return {
    valid: true,
    deviceId: tokenEntry.deviceId,
    payload,
  };
}

/**
 * Clear refresh token from database
 * If deviceId is provided, clears only that device's token
 * If deviceId is not provided, clears all tokens
 */
export async function clearRefreshToken(
  userId: string,
  deviceId?: string,
  isCandidate: boolean = false,
): Promise<void> {
  if (isCandidate) {
    if (deviceId) {
      // Clear specific device token
      await CandidateAccount.findByIdAndUpdate(userId, {
        $pull: { refreshTokens: { deviceId } },
      });
    } else {
      // Clear all tokens
      await CandidateAccount.findByIdAndUpdate(userId, {
        $set: { refreshTokens: [] },
      });
    }
  } else if (deviceId) {
    await User.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { deviceId } },
    });
  } else {
    await User.findByIdAndUpdate(userId, { $set: { refreshTokens: [] } });
  }
}

/**
 * Cleanup expired tokens from database
 */
export async function cleanupExpiredTokens(
  userId: string,
  isCandidate: boolean = false,
): Promise<void> {
  const now = new Date();

  if (isCandidate) {
    await CandidateAccount.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { expiry: { $lt: now } } },
    });
  } else {
    await User.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { expiry: { $lt: now } } },
    });
  }
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
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + 7); // 7 days

  if (isCandidate) {
    await CandidateAccount.findByIdAndUpdate(
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
    await User.findByIdAndUpdate(
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
