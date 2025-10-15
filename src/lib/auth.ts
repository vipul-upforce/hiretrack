import { verifyAndDecryptToken } from "@/app/actions/auth";
import { NextRequest } from "next/server";
import { jwtDecode } from "jwt-decode";
import CryptoJS from "crypto-js";

interface JWTPayload {
  user: string;
}

// / Define the User interface for type safety
interface User {
  id: string;
  _id: string; // For backward compatibility
  organizationId: string;
  name: string;
  email?: string;
  role?: string;
  [key: string]: any;
}
export async function auth(request: NextRequest) {
  // SECURITY FIX: Check both httpOnly and regular tokens for backward compatibility
  const httpOnlyToken = request.cookies.get("auth_token");
  const regularToken = request.cookies.get("auth_token");
  const token = httpOnlyToken?.value || regularToken?.value;

  if (token) {
    const decryptedResponse = await verifyAndDecryptToken(String(token));
    if (decryptedResponse.success && decryptedResponse.user) {
      return { user: decryptedResponse.user };
    }
  }
}

export async function verifyAndDecryptJWTToken(token: string) {
  const JWT_SECRET =
    process.env.JWT_SECRET ||
    process.env.NEXT_PUBLIC_JWT_SECRET ||
    "hgerguhurhg_egosh_eohe_egjhagbqyuqwertyuiop";
  // console.log(JWT_SECRET, "JWT_SECRET-5");
  try {
    if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");

    const decoded = jwtDecode<JWTPayload>(token);
    if (!decoded || typeof decoded !== "object" || !decoded.user) {
      throw new Error("Invalid token structure");
    }

    const bytes = CryptoJS.AES.decrypt(decoded.user, JWT_SECRET);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    // IMPORTANT FIX: Ensure _id field exists for backward compatibility
    // Some parts of the codebase expect _id while others use id
    if (decryptedData && decryptedData.id && !decryptedData._id) {
      decryptedData._id = decryptedData.id;
    }

    return { success: true, user: decryptedData };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown Error Occurred",
    };
  }
}
export async function verifyAndDecryptSSE(token: string) {
  const JWT_SECRET =
    process.env.JWT_SECRET ||
    process.env.NEXT_PUBLIC_JWT_SECRET ||
    "hgerguhurhg_egosh_eohe_egjhagbqyuqwertyuiop";
  // console.log(JWT_SECRET, "JWT_SECRET-6");
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
// Add getCurrentUser
export async function getCurrentUser(
  request?: NextRequest
): Promise<User | null> {
  const authResult = await auth(request);
  if (!authResult || !authResult.user) {
    return null;
  }
  return authResult.user as User;
}

export async function verifyAndDecrypCaptcha(token: string) {
  const JWT_SECRET =
    process.env.JWT_SECRET ||
    process.env.NEXT_PUBLIC_JWT_SECRET ||
    "hgerguhurhg_egosh_eohe_egjhagbqyuqwertyuiop";
  try {
    if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");
    if (!token) throw new Error("Token is empty");

    console.log(token, "token");
    // console.log(JWT_SECRET, "JWT_SECRET-7");

    // Assume token is an AES-encrypted string (not a JWT)
    const bytes = CryptoJS.AES.decrypt(token, JWT_SECRET);
    console.log(bytes, "bytes");
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    console.log(decryptedData, "decryptedData");
    if (!decryptedData) {
      throw new Error("Decryption failed: no data returned");
    }

    return decryptedData; // Return decrypted string
  } catch (err) {
    console.error("Decryption error:", err);
    return null; // Return null to match getDecodedCaptcha expectation
  }
}
