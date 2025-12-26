import jwt from 'jsonwebtoken';
import CryptoJS from 'crypto-js';
import { generateOrgJwtSecret } from './jwtSecretGenerator';

export const signToken = (
  payload: any,
  orgId: string,
  expiresIn: string = '15m',
) => {
  const JWT_SECRET = generateOrgJwtSecret(orgId);
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined');

  const encryptedPayload = CryptoJS.AES.encrypt(
    JSON.stringify(payload),
    JWT_SECRET,
  ).toString();
  // Use short expiration for access tokens (15 minutes by default)
  return jwt.sign({ user: encryptedPayload }, JWT_SECRET, {
    expiresIn: expiresIn as any,
  });
};

// Helper function for access tokens (15 minutes)
export const signAccessToken = (payload: any, orgId: string) =>
  signToken(payload, orgId, '15m'); // 15 minutes

export const verifyToken = (token: string, orgId: string) => {
  try {
    const JWT_SECRET = generateOrgJwtSecret(orgId);
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};
