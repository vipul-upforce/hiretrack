
"use server";

import jwt from "jsonwebtoken";
import CryptoJS from "crypto-js";
import { generateOrgJwtSecret } from "@/lib/jwtSecretGenerator";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getUserRole } from "@/lib/utils/checklistVisibility";
import type { UserRole } from "@/lib/models/JobLaneConfig";
import connectToDatabase, { Settings, User } from "@/lib/mongodb";


export async function verifyAndDecryptToken(token: string, orgId: string) {
  try {
    const JWT_SECRET = generateOrgJwtSecret(orgId);


    if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined');


    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || typeof decoded !== 'object' || !decoded.user) {
      throw new Error('Invalid token structure');
    }

    const bytes = CryptoJS.AES.decrypt(decoded.user, JWT_SECRET);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  
    const oldTokenVersion = decryptedData?.tokenVersion;
    const organizationId = decryptedData?.organizationId;
    const userId = decryptedData?.id;
    if (!userId) {
      return { success: false, error: "User ID not found" };
    }
    await connectToDatabase();
    const user = await User.findById(userId).populate({
      path: "organizationId",
      select: "-customFields", // Exclude customFields from populated organization
    })
      .select("name email role organizationId tokenVersion ")
      .lean();

    if (!user) {
      return { success: false, error: "User not found" };
    }
    if (
      oldTokenVersion !== undefined &&
      user?.tokenVersion !== undefined &&
      Number(user?.tokenVersion) !== Number(oldTokenVersion)
    ) {
      // token version mismatch, log out
      const cookieStore = await cookies();
      const mutableCookieStore = cookieStore as unknown as {
        delete?: (name: string) => void;
      };
      const cookiesToDelete = ["auth_token",  "auth_state"];

      cookiesToDelete.forEach((cookieName) => {
        try {
          mutableCookieStore.delete?.(cookieName);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "unknown error";
          process.stderr.write(
            `Failed to delete cookie ${cookieName}: ${message}\n`
          );
        }
      });

      return {
        success: false,
        error: "Session expired. Please log in again.",
        logout: true,
      };
    }
    const fileStorage = await Settings.findOne({ organizationId }).select("fileStorage").lean();
    return {
      success: true,
      user: {
        id: user?._id.toString(),
        name: user?.name,
        email: user?.email,
        role: user?.role,
        // organizationId: typeof user?.organizationId === "string" ? user?.organizationId : (user?.organizationId as any)?._id?.toString() || "",
        organizationId: organizationId,
        organizationInfo: user?.organizationId,
        tokenVersion: user?.tokenVersion,
        fileStorage: fileStorage?.fileStorage?.storageType || "local",
      } as AuthenticatedUser,
      // >>>>>>> 9236ce0f301a4726f2d437719bc5a133445e91e2
    };
  } catch (error) {
    return {
      success: false,

      error: error instanceof Error ? error.message : 'Unknown Error Occurred',
    };
  }
}
export interface OrganizationTag {
  title: string;
  color: string;
  _id: string;
}

export interface LaneRestrictions {
  nonEditable?: string[];
  nonDeletable?: string[];
  _id?: string;
}

export interface OrganizationInfo {
  _id?: string;
  name?: string;
  adminId?: string;
  defaultLanes?: string[];
  laneRestrictions?: LaneRestrictions;
  openJobCards?: string[];
  tags?: OrganizationTag[];
  __v?: number;
  lanes?: string[];
}

export interface AuthenticatedUser {
  id?: string;
  name?: string;
  email: string;
  role: string;
  organizationId: string;
  organizationInfo?: OrganizationInfo;
  fileStorage?: string;
  tokenVersion?: number;
}


export async function getAuthenticatedUser(
  request: NextRequest,
  requiredRole?: string | string[],
): Promise<AuthenticatedUser | null> {
  const token = request.cookies.get('auth_token')?.value;
  const orgId = request.cookies.get('org_id')?.value;

  if (!token || !orgId) return null;

  const { success, user } = await verifyAndDecryptToken(token, orgId);
  if (!success || !user) {
    return null;
  }

  // Validate user role is valid using the same validation as getUserRole
  const validatedRole = getUserRole(user.role);
  if (!validatedRole) {
    return null; // Invalid role
  }

  // If a role is specified, validate it matches
  if (requiredRole) {
    const rolesToCheck = Array.isArray(requiredRole)
      ? requiredRole
      : [requiredRole];

    // Validate each required role and check if user's role matches
    const validRequiredRoles = rolesToCheck
      .map((role) => getUserRole(role))
      .filter((role): role is UserRole => role !== null);

    if (validRequiredRoles.length === 0 || !validRequiredRoles.includes(validatedRole)) {
      return null; // Role doesn't match required role(s) or required roles are invalid
    }
  }

  return user as AuthenticatedUser;
}


export const signToken = async (
  payload: unknown, 
  orgId: string, 
) => {
  const JWT_SECRET = generateOrgJwtSecret(orgId);
  console.log("payload-263", payload);
  
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");

  const encryptedPayload = CryptoJS.AES.encrypt(
    JSON.stringify(payload),
    String(JWT_SECRET),
  ).toString();

  return jwt.sign({ user: encryptedPayload }, JWT_SECRET, { expiresIn: "15m" as any});
};



// Helper function for access tokens (15 minutes)
export async function signAccessToken(payload: unknown, orgId: string) {
  return signToken(payload, orgId);

};
