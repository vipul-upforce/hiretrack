import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import CryptoJS from "crypto-js";
import connectToDatabase, { User } from "@/lib/mongodb";

export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId: string;
  role: string;
  name: string;
}

export interface AnalyticsApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    totalRecords?: number;
    dateRange?: {
      start: Date;
      end: Date;
    };
    generatedAt: Date;
    organizationId: string;
  };
}

export async function authenticateAnalyticsRequest(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    // Check both httpOnly and regular tokens for backward compatibility
    const httpOnlyToken = cookieStore.get("auth_token");
    const regularToken = cookieStore.get("token");
    const token = httpOnlyToken?.value || regularToken?.value;

    if (!token) {
      return null;
    }

    // Use the same JWT verification as main middleware
    const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
    if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");
    
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);

    if (!payload || typeof payload !== "object" || !payload.user) {
      throw new Error("Invalid token structure");
    }

    // Decrypt the user data using CryptoJS (same as main middleware)
    const bytes = CryptoJS.AES.decrypt(payload.user as string, JWT_SECRET);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    
    return {
      id: decryptedData._id || decryptedData.id,
      email: decryptedData.email,
      organizationId: typeof decryptedData.organizationId === 'string' ? decryptedData.organizationId : decryptedData.organizationId.toString(),
      role: decryptedData.role,
      name: decryptedData.name,
    };
  } catch (error) {
    console.error("Analytics authentication error:", error);
    return null;
  }
}

export function createAnalyticsResponse<T>(
  data: T, 
  organizationId: string,
  metadata?: Partial<AnalyticsApiResponse<T>["metadata"]>
): AnalyticsApiResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      generatedAt: new Date(),
      organizationId,
      ...metadata,
    },
  };
}

export function createAnalyticsErrorResponse(
  error: string, 
  status: number = 400
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error,
      generatedAt: new Date(),
    } as AnalyticsApiResponse,
    { status }
  );
}

export function validateAnalyticsPermissions(
  user: AuthenticatedUser, 
  requestedOrgId?: string
): boolean {
  // Check if user has permission to access analytics
  const allowedRoles = ["admin", "hr"]; // Use lowercase to match the actual role values
  
  if (!allowedRoles.includes(user.role.toLowerCase())) {
    return false;
  }

  // If specific organization is requested, validate access
  if (requestedOrgId && requestedOrgId !== user.organizationId) {
    return false;
  }

  return true;
}

export async function withAnalyticsAuth<T>(
  request: NextRequest,
  handler: (user: AuthenticatedUser, request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Authenticate user
    const user = await authenticateAnalyticsRequest(request);
    
    if (!user) {
      return createAnalyticsErrorResponse("Authentication required", 401);
    }

    // Get requested organization ID from query params
    const url = new URL(request.url);
    const requestedOrgId = url.searchParams.get("organizationId") || user.organizationId;

    // Validate permissions
    if (!validateAnalyticsPermissions(user, requestedOrgId)) {
      return createAnalyticsErrorResponse("Insufficient permissions for analytics access", 403);
    }

    // Call the handler with authenticated user
    return await handler(user, request);
  } catch (error) {
    console.error("Analytics middleware error:", error);
    return createAnalyticsErrorResponse("Internal server error", 500);
  }
}