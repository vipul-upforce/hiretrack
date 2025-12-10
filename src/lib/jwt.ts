import jwt from 'jsonwebtoken';
import CryptoJS from 'crypto-js';
import { generateOrgJwtSecret } from './jwtSecretGenerator';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXT_PUBLIC_JWT_SECRET ||
  'your_jwt_secret_key';

export const signToken = (payload: any, orgId: string) => {
  const JWT_SECRET = generateOrgJwtSecret(orgId);
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined');

  const encryptedPayload = CryptoJS.AES.encrypt(
    JSON.stringify(payload),
    JWT_SECRET,
  ).toString();
  return jwt.sign({ user: encryptedPayload }, JWT_SECRET, { expiresIn: '30d' });
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};
