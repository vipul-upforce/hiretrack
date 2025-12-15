import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import CryptoJS from 'crypto-js';
import { generateOrgJwtSecret } from '@/lib/jwtSecretGenerator';
import { AuthenticatedUser, AnalyticsApiResponse } from './middleware';

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

interface ValidationError {
  field: string;
  message: string;
}

/**
 * Enhanced analytics middleware with security and performance optimizations
 */
export class EnhancedAnalyticsMiddleware {
  private rateLimitConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per window
    message: 'Too many analytics requests. Please try again later.',
  };

  /**
   * Rate limiting implementation
   */
  private checkRateLimit(identifier: string): {
    allowed: boolean;
    remainingRequests?: number;
    resetTime?: number;
  } {
    const now = Date.now();
    const key = `analytics:${identifier}`;

    let rateLimitData = rateLimitStore.get(key);

    // Initialize or reset if window expired
    if (!rateLimitData || now > rateLimitData.resetTime) {
      rateLimitData = {
        count: 1,
        resetTime: now + this.rateLimitConfig.windowMs,
      };
      rateLimitStore.set(key, rateLimitData);
      return {
        allowed: true,
        remainingRequests: this.rateLimitConfig.maxRequests - 1,
        resetTime: rateLimitData.resetTime,
      };
    }

    // Check if limit exceeded
    if (rateLimitData.count >= this.rateLimitConfig.maxRequests) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: rateLimitData.resetTime,
      };
    }

    // Increment counter
    rateLimitData.count++;
    rateLimitStore.set(key, rateLimitData);

    return {
      allowed: true,
      remainingRequests: this.rateLimitConfig.maxRequests - rateLimitData.count,
      resetTime: rateLimitData.resetTime,
    };
  }

  /**
   * Enhanced authentication with better error handling
   */
  private async authenticateRequest(
    request: NextRequest,
  ): Promise<{ user: AuthenticatedUser | null; error: string | null }> {
    try {
      const cookieStore = await cookies();
      const httpOnlyToken = cookieStore.get('auth_token');
      // const regularToken = cookieStore.get("token");

      // Prefer httpOnly token for security
      const token = httpOnlyToken?.value;

      if (!token) {
        return { user: null, error: 'Authentication token not found' };
      }

      // const JWT_SECRET = process.env.JWT_SECRET;
      const orgId = cookieStore.get('org_id')?.value;
      const JWT_SECRET = generateOrgJwtSecret(orgId);

      if (!JWT_SECRET) {
        return { user: null, error: 'Server configuration error' };
      }

      const secretKey = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(token, secretKey);

      if (!payload || typeof payload !== 'object' || !payload.user) {
        return { user: null, error: 'Invalid token structure' };
      }

      // Decrypt user data
      const bytes = CryptoJS.AES.decrypt(payload.user as string, JWT_SECRET);
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      // Validate required user fields
      if (
        !decryptedData._id
        || !decryptedData.email
        || !decryptedData.organizationId
      ) {
        return { user: null, error: 'Invalid user data in token' };
      }

      return {
        user: {
          id: decryptedData._id || decryptedData.id,
          email: decryptedData.email,
          organizationId:
            typeof decryptedData.organizationId === 'string'
              ? decryptedData.organizationId
              : decryptedData.organizationId.toString(),
          role: decryptedData.role,
          name: decryptedData.name,
        },
        error: null,
      };
    } catch (error) {
      return { user: null, error: 'Token verification failed' };
    }
  }

  /**
   * Enhanced authorization with detailed permission checking
   */
  private validatePermissions(
    user: AuthenticatedUser,
    requestedOrgId?: string,
  ): { allowed: boolean; error: string | null } {
    // Check role permissions
    const allowedRoles = ['admin', 'hr'];
    if (!allowedRoles.includes(user.role.toLowerCase())) {
      return {
        allowed: false,
        error: `Role '${user.role}' not authorized for analytics access`,
      };
    }

    // Verify organization access
    if (requestedOrgId && requestedOrgId !== user.organizationId) {
      return { allowed: false, error: 'Access denied: Organization mismatch' };
    }

    return { allowed: true, error: null };
  }

  /**
   * Input validation for analytics requests
   */
  private validateAnalyticsInput(request: NextRequest): {
    valid: boolean;
    errors: ValidationError[];
  } {
    const url = new URL(request.url);
    const errors: ValidationError[] = [];

    // Validate date range
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime())) {
        errors.push({
          field: 'startDate',
          message: 'Invalid start date format',
        });
      }

      if (isNaN(end.getTime())) {
        errors.push({ field: 'endDate', message: 'Invalid end date format' });
      }

      if (start && end && start > end) {
        errors.push({
          field: 'dateRange',
          message: 'Start date must be before end date',
        });
      }

      // Validate date range is not too large (max 2 years)
      const maxRangeMs = 2 * 365 * 24 * 60 * 60 * 1000;
      if (start && end && end.getTime() - start.getTime() > maxRangeMs) {
        errors.push({
          field: 'dateRange',
          message: 'Date range too large (maximum 2 years)',
        });
      }
    }

    // Validate organization ID
    const organizationId = url.searchParams.get('organizationId');
    if (
      organizationId
      && (organizationId.length < 10 || organizationId.length > 50)
    ) {
      errors.push({
        field: 'organizationId',
        message: 'Invalid organization ID format',
      });
    }

    // Validate filter parameters
    const jobIds = url.searchParams.get('jobIds');
    if (jobIds) {
      const jobIdArray = jobIds.split(',').filter(Boolean);
      if (jobIdArray.length > 100) {
        errors.push({
          field: 'jobIds',
          message: 'Too many job IDs (maximum 100)',
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Create secure error response without sensitive information
   */
  private createSecureErrorResponse(
    error: string,
    status: number = 400,
  ): NextResponse {
    // Don't expose internal error details in production
    const sanitizedError = process.env.NODE_ENV === 'production'
      ? this.sanitizeErrorMessage(error)
      : error;

    return NextResponse.json(
      {
        success: false,
        error: sanitizedError,
        timestamp: new Date().toISOString(),
      } as AnalyticsApiResponse,
      { status },
    );
  }

  /**
   * Sanitize error messages for production
   */
  private sanitizeErrorMessage(error: string): string {
    const sanitizedErrors: Record<string, string> = {
      'JWT_SECRET not configured': 'Authentication service unavailable',
      'Token verification failed': 'Invalid authentication',
      'Database connection failed': 'Service temporarily unavailable',
      'Organization mismatch': 'Access denied',
    };

    for (const [original, sanitized] of Object.entries(sanitizedErrors)) {
      if (error.includes(original)) {
        return sanitized;
      }
    }

    // Generic error for unknown cases
    return 'Request processing failed';
  }

  /**
   * Log security events for monitoring
   */
  private logSecurityEvent(
    event: string,
    user: AuthenticatedUser | null,
    request: NextRequest,
    details?: any,
  ) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      userId: user?.id || 'anonymous',
      userRole: user?.role || 'unknown',
      organizationId: user?.organizationId || 'unknown',
      ip:
        request.headers.get('x-forwarded-for')
        || request.headers.get('x-real-ip')
        || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      url: request.url,
      details,
    };

  }

  /**
   * Main enhanced middleware function
   */
  public async withEnhancedAnalyticsAuth(
    request: NextRequest,
    handler: (
      user: AuthenticatedUser,
      request: NextRequest
    ) => Promise<NextResponse>,
  ): Promise<NextResponse> {
    try {
      // Rate limiting check
      const clientIp = request.headers.get('x-forwarded-for')
        || request.headers.get('x-real-ip')
        || 'unknown';

      const rateLimitResult = this.checkRateLimit(clientIp);
      if (!rateLimitResult.allowed) {
        this.logSecurityEvent('RATE_LIMIT_EXCEEDED', null, request, {
          ip: clientIp,
        });

        const response = this.createSecureErrorResponse(
          this.rateLimitConfig.message,
          429,
        );
        response.headers.set(
          'X-RateLimit-Limit',
          this.rateLimitConfig.maxRequests.toString(),
        );
        response.headers.set('X-RateLimit-Remaining', '0');
        response.headers.set(
          'X-RateLimit-Reset',
          Math.ceil(rateLimitResult.resetTime! / 1000).toString(),
        );
        return response;
      }

      // Input validation
      const validationResult = this.validateAnalyticsInput(request);
      if (!validationResult.valid) {
        this.logSecurityEvent('INVALID_INPUT', null, request, {
          errors: validationResult.errors,
        });
        return this.createSecureErrorResponse(
          `Invalid input: ${validationResult.errors.map((e) => e.message).join(', ')}`,
          400,
        );
      }

      // Authentication
      const authResult = await this.authenticateRequest(request);
      if (!authResult.user) {
        this.logSecurityEvent('AUTH_FAILED', null, request, {
          error: authResult.error,
        });
        return this.createSecureErrorResponse('Authentication required', 401);
      }

      // Authorization
      const url = new URL(request.url);
      const requestedOrgId = url.searchParams.get('organizationId')
        || authResult.user.organizationId;

      const permissionResult = this.validatePermissions(
        authResult.user,
        requestedOrgId,
      );
      if (!permissionResult.allowed) {
        this.logSecurityEvent('ACCESS_DENIED', authResult.user, request, {
          requestedOrgId,
          error: permissionResult.error,
        });
        return this.createSecureErrorResponse('Insufficient permissions', 403);
      }

      // Add security headers to response
      const response = await handler(authResult.user, request);

      // Add rate limit headers
      response.headers.set(
        'X-RateLimit-Limit',
        this.rateLimitConfig.maxRequests.toString(),
      );
      response.headers.set(
        'X-RateLimit-Remaining',
        rateLimitResult.remainingRequests!.toString(),
      );
      response.headers.set(
        'X-RateLimit-Reset',
        Math.ceil(rateLimitResult.resetTime! / 1000).toString(),
      );

      // Add security headers
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'SAMEORIGIN');
      response.headers.set('X-XSS-Protection', '1; mode=block');

      // Log successful access
      this.logSecurityEvent('ANALYTICS_ACCESS', authResult.user, request, {
        endpoint: request.url.split('?')[0],
      });

      return response;
    } catch (error: unknown) {
      this.logSecurityEvent('MIDDLEWARE_ERROR', null, request, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return this.createSecureErrorResponse('Internal server error', 500);
    }
  }

  /**
   * Cleanup expired rate limit entries (call periodically)
   */
  public cleanupRateLimitStore(): void {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
      if (now > data.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }
}

// Export singleton instance
export const enhancedAnalyticsMiddleware = new EnhancedAnalyticsMiddleware();

// Export convenience function
export const withEnhancedAnalyticsAuth = enhancedAnalyticsMiddleware.withEnhancedAnalyticsAuth.bind(
  enhancedAnalyticsMiddleware,
);
