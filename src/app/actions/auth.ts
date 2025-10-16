"use server";

import jwt from "jsonwebtoken";
import CryptoJS from "crypto-js";

const JWT_SECRET =
  // process.env.JWT_SECRET ||
  // process.env.NEXT_PUBLIC_JWT_SECRET ||
  "hgerguhurhg_egosh_eohe_egjhagbqyuqwertyuiop";
export async function verifyAndDecryptToken(token: string) {
  try {
    // console.log(JWT_SECRET, "JWT_SECRET-2");

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
  console.log(JWT_SECRET, "JWT_SECRET-7");
  const encryptedPayload = CryptoJS.AES.encrypt(
    JSON.stringify(payload),
    String(JWT_SECRET)
  ).toString();
  console.log("type of encryptedPayload", typeof encryptedPayload);
  const signedToken = jwt.sign({ user: encryptedPayload }, String(JWT_SECRET), {
    expiresIn: "30d",
  });
  console.log("signedToken", signedToken);
  return signedToken;
};
