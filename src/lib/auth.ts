import { verifyAndDecryptToken } from "@/app/actions/auth";
import { NextRequest } from "next/server";
import { jwtDecode } from "jwt-decode";
import CryptoJS from "crypto-js";

interface JWTPayload {
  user: string;
}

export async function auth(request: NextRequest) {
  const token = request.cookies.get("token");
  if (token?.value) {
    const decryptedResponse = await verifyAndDecryptToken(String(token?.value));
    if (decryptedResponse.success && decryptedResponse.user) {
      return { user: decryptedResponse.user };
    }
  }
}

export async function verifyAndDecryptJWTToken(token: string) {
  const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
  try {
    if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");

    const decoded = jwtDecode<JWTPayload>(token);
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
export async function verifyAndDecryptSSE(token: string) {
  const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
  try {
    if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");

    const decoded = jwtDecode<JWTPayload>(token);
    if (!decoded || typeof decoded !== "object" || !decoded.user) {
      throw new Error("Invalid token structure");
    }

    const bytes = CryptoJS.AES.decrypt(decoded.user, JWT_SECRET);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return { ...decryptedData };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown Error Occurred",
    };
  }
}
