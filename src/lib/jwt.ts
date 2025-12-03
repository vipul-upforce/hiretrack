import jwt from "jsonwebtoken";
import CryptoJS from "crypto-js";
import { generateOrgJwtSecret } from "./jwtSecretGenerator";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXT_PUBLIC_JWT_SECRET ||
  "your_jwt_secret_key";
// console.log(JWT_SECRET, "JWT_SECRET-8");

export const signToken = (payload: any, orgId: string, expiresIn: string = "15m") => {
  const JWT_SECRET = generateOrgJwtSecret(orgId);
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");

  // console.log(JWT_SECRET, "JWT_SECRET-8 ");

  const encryptedPayload = CryptoJS.AES.encrypt(
    JSON.stringify(payload),
    JWT_SECRET
  ).toString();
  // Use short expiration for access tokens (15 minutes by default)
  return jwt.sign({ user: encryptedPayload }, JWT_SECRET, { expiresIn: expiresIn as any });
};

// Helper function for access tokens (15 minutes)
export const signAccessToken = (payload: any, orgId: string) => {
  return signToken(payload, orgId, "15m"); // 15 minutes
};

// Keep long-lived token for backward compatibility (if needed)
export const signLongLivedToken = (payload: any, orgId: string) => {
  return signToken(payload, orgId, "7d"); // 7 days
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};
