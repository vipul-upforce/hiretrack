import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import CryptoJS from 'crypto-js';
import { generateOrgJwtSecret } from '@/lib/jwtSecretGenerator';
import { logger } from '@/lib/logger/logger.server';

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId: string;
  role: string;
  name: string;
}

export interface AnalyticsApiResponse {
  success: boolean;
  data?: any;
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
  request: NextRequest,
): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const httpOnlyToken = cookieStore.get('auth_token');
    const token = httpOnlyToken?.value;

    if (!token) {
      return null;
    }

    const orgId = request.cookies.get('org_id')?.value;
    const JWT_SECRET = generateOrgJwtSecret(orgId!);
    if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined');

    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);

    if (!payload || typeof payload !== 'object' || !payload.user) {
      throw new Error('Invalid token structure');
    }

    // Decrypt the user data using CryptoJS (same as main middleware)
    const bytes = CryptoJS.AES.decrypt(payload.user as string, JWT_SECRET);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    return {
      id: decryptedData._id || decryptedData.id,
      email: decryptedData.email,
      organizationId:
        typeof decryptedData.organizationId === 'string'
          ? decryptedData.organizationId
          : decryptedData.organizationId.toString(),
      role: decryptedData.role,
      name: decryptedData.name,
    };
  } catch (error) {
    logger.error(
      { error, url: request.url },
      'Analytics authentication failed',
    );
    return null;
  }
}

export function createAnalyticsResponse<T>(
  data: T,
  organizationId: string,
  metadata?: Partial<AnalyticsApiResponse['metadata']>,
): AnalyticsApiResponse {
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
  status: number = 400,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error,
      generatedAt: new Date(),
    } as AnalyticsApiResponse,
    { status },
  );
}

export function validateAnalyticsPermissions(
  user: AuthenticatedUser,
  requestedOrgId?: string,
): boolean {
  // Check if user has permission to access analytics
  const allowedRoles = ['admin', 'hr']; // Use lowercase to match the actual role values

  if (!allowedRoles.includes(user.role.toLowerCase())) {
    return false;
  }

  // If specific organization is requested, validate access
  if (requestedOrgId && requestedOrgId !== user.organizationId) {
    return false;
  }

  return true;
}

function checkRateLimit(identifier: string): {
  allowed: boolean;
  remainingRequests?: number;
} {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100; // 100 requests per window
  const key = `analytics:${identifier}`;

  let rateLimitData = rateLimitStore.get(key);

  // Initialize or reset if window expired
  if (!rateLimitData || now > rateLimitData.resetTime) {
    rateLimitData = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, rateLimitData);
    return { allowed: true, remainingRequests: maxRequests - 1 };
  }

  // Check if limit exceeded
  if (rateLimitData.count >= maxRequests) {
    return { allowed: false, remainingRequests: 0 };
  }

  // Increment counter
  rateLimitData.count++;
  rateLimitStore.set(key, rateLimitData);

  return {
    allowed: true,
    remainingRequests: maxRequests - rateLimitData.count,
  };
}

export async function withAnalyticsAuth(
  request: NextRequest,
  handler: (
    user: AuthenticatedUser,
    request: NextRequest,
  ) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    // Rate limiting check
    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const rateLimitResult = checkRateLimit(clientIp);
    if (!rateLimitResult.allowed) {
      const response = createAnalyticsErrorResponse(
        'Too many requests. Please try again later.',
        429,
      );
      response.headers.set('X-RateLimit-Limit', '100');
      response.headers.set('X-RateLimit-Remaining', '0');
      return response;
    }

    // Authenticate user
    const user = await authenticateAnalyticsRequest(request);

    if (!user) {
      return createAnalyticsErrorResponse('Authentication required', 401);
    }

    // Get requested organization ID from query params
    const url = new URL(request.url);
    const requestedOrgId =
      url.searchParams.get('organizationId') || user.organizationId;

    // Validate permissions
    if (!validateAnalyticsPermissions(user, requestedOrgId)) {
      return createAnalyticsErrorResponse(
        'Insufficient permissions for analytics access',
        403,
      );
    }

    // Call the handler with authenticated user
    const response = await handler(user, request);

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set(
      'X-RateLimit-Remaining',
      rateLimitResult.remainingRequests?.toString() || '0',
    );

    return response;
  } catch (error: unknown) {
    logger.error({ error, url: request.url }, 'Analytics middleware error.');

    // Handle specific error types
    if (
      (error instanceof Error && error.message?.includes('timeout')) ||
      (error instanceof Error && error.message?.includes('maxTimeMS'))
    ) {
      return createAnalyticsErrorResponse(
        'Query timeout - please try a smaller date range or add more filters',
        408,
      );
    }

    if (
      (error instanceof Error && error.message?.includes('memory')) ||
      (error instanceof Error && error.message?.includes('allowDiskUse'))
    ) {
      return createAnalyticsErrorResponse(
        'Query too large - please add more filters to reduce data size',
        413,
      );
    }

    return createAnalyticsErrorResponse('Internal server error', 500);
  }
}
