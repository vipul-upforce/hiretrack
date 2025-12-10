'use server';

import jwt from 'jsonwebtoken';
import CryptoJS from 'crypto-js';
import { generateOrgJwtSecret } from '@/lib/jwtSecretGenerator';
import { NextRequest } from 'next/server';
import { getUserRole } from '@/lib/utils/checklistVisibility';
import type { UserRole } from '@/lib/models/JobLaneConfig';

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
    return { success: true, user: decryptedData };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown Error Occurred',
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

export const signToken = async (payload: unknown, orgId: string) => {
  const JWT_SECRET = generateOrgJwtSecret(orgId);

  if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined');

  const encryptedPayload = CryptoJS.AES.encrypt(
    JSON.stringify(payload),
    String(JWT_SECRET),
  ).toString();

  return jwt.sign({ user: encryptedPayload }, JWT_SECRET, { expiresIn: '30d' });
};
