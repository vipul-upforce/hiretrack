"use server";

import jwt from "jsonwebtoken";
import CryptoJS from "crypto-js";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
export async function verifyAndDecryptToken(token: string) {
  try {
    if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || typeof decoded !== "object" || !decoded.user) {
      throw new Error("Invalid token structure");
    }

    const bytes = CryptoJS.AES.decrypt(decoded.user, JWT_SECRET);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return { success: true, user: decryptedData };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown Error Occurred",
    };
  }
}

export const signToken = async (payload: unknown) => {
  const encryptedPayload = CryptoJS.AES.encrypt(
    JSON.stringify(payload),
    JWT_SECRET
  ).toString();
  return jwt.sign({ user: encryptedPayload }, JWT_SECRET, { expiresIn: "1d" });
};
