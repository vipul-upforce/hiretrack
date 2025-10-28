import { verifyAndDecryptToken } from "@/app/actions/auth";
import { NextRequest } from "next/server";
import { jwtDecode } from "jwt-decode";
import CryptoJS from "crypto-js";
import { generateOrgJwtSecret } from "./jwtSecretGenerator";

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
  let orgId = request.cookies.get("org_id")?.value;

  if (!orgId) {
    try {
      // Fetch the first organization's ID if orgId is missing
      const response = await fetch("/api/organization");
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          orgId = data[0]._id;
        } else {
          return {
            success: false,
            error: "No organizations found",
          };
        }
      } else {
        return {
          success: false,
          error: "Failed to fetch organization ID",
        };
      }
    } catch (error) {
      return {
        success: false,
        error:
          "Error fetching organization ID: " +
          (error instanceof Error ? error.message : "Unknown error"),
      };
    }
  }

  if (token) {
    const decryptedResponse = await verifyAndDecryptToken(String(token), orgId);
    if (decryptedResponse.success && decryptedResponse.user) {
      return { user: decryptedResponse.user };
    }
  }
}

export async function verifyAndDecryptJWTToken(token: string, orgId: string) {
  // const JWT_SECRET =
  //   process.env.JWT_SECRET ||
  //   process.env.NEXT_PUBLIC_JWT_SECRET ||
  //   "your_jwt_secret_key";
  const JWT_SECRET = generateOrgJwtSecret(orgId);
  console.log(JWT_SECRET, "JWT_SECRET-5");
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
export async function verifyAndDecryptSSE(token: string, orgId: string) {
  // const JWT_SECRET =
  //   process.env.JWT_SECRET ||
  //   process.env.NEXT_PUBLIC_JWT_SECRET ||
  //   "your_jwt_secret_key";
  const JWT_SECRET = generateOrgJwtSecret(orgId);
  console.log(JWT_SECRET, "JWT_SECRET-6");

  try {
    // console.log(JWT_SECRET, "JWT_SECRET-6");
    if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");
    // console.log("type of JWT_SECRET", typeof JWT_SECRET);
    // console.log("type of token", typeof token);
    // console.log("token", token);
    const decoded = jwtDecode<JWTPayload>(token);
    // console.log(decoded, "decoded");
    if (!decoded || typeof decoded !== "object" || !decoded.user) {
      throw new Error("Invalid token structure");
    }
    // console.log("type of JWT_SECRET", typeof JWT_SECRET);
    const bytes = CryptoJS.AES.decrypt(decoded.user, String(JWT_SECRET));
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

export async function verifyAndDecrypCaptcha(token: string, orgId: string) {
  // const JWT_SECRET =
  //   process.env.JWT_SECRET ||
  //   process.env.NEXT_PUBLIC_JWT_SECRET ||
  //   "your_jwt_secret_key";
  const JWT_SECRET = generateOrgJwtSecret(orgId);

  try {
    if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");
    if (!token) throw new Error("Token is empty");

    // console.log(token, "token");
    // console.log(JWT_SECRET, "JWT_SECRET-7");

    // Assume token is an AES-encrypted string (not a JWT)
    const bytes = CryptoJS.AES.decrypt(token, JWT_SECRET);
    // console.log(bytes, "bytes");
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    // console.log(decryptedData, "decryptedData");
    if (!decryptedData) {
      throw new Error("Decryption failed: no data returned");
    }

    return decryptedData; // Return decrypted string
  } catch (err) {
    // console.error("Decryption error:", err);
    return null; // Return null to match getDecodedCaptcha expectation
  }
}
