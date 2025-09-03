import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Only count failed requests
  keyGenerator?: (req: NextRequest) => string; // Custom key generation
}

interface RateLimitStore {
  requests: number;
  resetTime: number;
}

// In-memory store for rate limiting
// In production, you might want to use Redis for distributed systems
const rateLimitStore = new Map<string, RateLimitStore>();
console.log("💬💬 rateLimitStore: ", rateLimitStore);
// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

/**
 * Production-ready rate limiter for authentication endpoints
 * Uses in-memory storage to avoid external dependencies
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = "Too many requests, please try again later",
    skipSuccessfulRequests = false,
    keyGenerator = defaultKeyGenerator,
  } = config;

  return async function rateLimitMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const key = keyGenerator(request);
    const now = Date.now();

    // Get or create rate limit entry
    let rateLimit = rateLimitStore.get(key);

    if (!rateLimit || rateLimit.resetTime < now) {
      // Create new window
      rateLimit = {
        requests: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, rateLimit);
    }

    // Check if limit exceeded
    if (rateLimit.requests >= maxRequests) {
      const retryAfter = Math.ceil((rateLimit.resetTime - now) / 1000);

      return NextResponse.json(
        { error: message },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(rateLimit.resetTime).toISOString(),
          },
        }
      );
    }

    // Process request
    const response = await handler(request);

    // Increment counter based on configuration
    if (!skipSuccessfulRequests || response.status >= 400) {
      rateLimit.requests++;
    }

    // Add rate limit headers to response
    const remaining = Math.max(0, maxRequests - rateLimit.requests);
    response.headers.set("X-RateLimit-Limit", maxRequests.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set(
      "X-RateLimit-Reset",
      new Date(rateLimit.resetTime).toISOString()
    );

    return response;
  };
}

/**
 * Default key generator using IP address and endpoint
 */
function defaultKeyGenerator(req: NextRequest): string {
  // Get IP address from various headers (works with proxies/load balancers)
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0] || realIp || "unknown";

  // Include pathname to have separate limits per endpoint
  const pathname = req.nextUrl.pathname;

  return `${ip}:${pathname}`;
}

/**
 * Enhanced key generator that includes user identification
 * Useful for authenticated endpoints
 */
export function createUserBasedKeyGenerator(
  getUserId: (req: NextRequest) => string | null
) {
  return (req: NextRequest): string => {
    const userId = getUserId(req);
    if (userId) {
      return `user:${userId}:${req.nextUrl.pathname}`;
    }
    return defaultKeyGenerator(req);
  };
}

/**
 * Pre-configured rate limiters for different use cases
 */

// Email-based key generator for password reset
function emailKeyGenerator(email: string): string {
  return `email:${email}`;
}

// Email-based password reset rate limiter
export function createEmailPasswordResetLimiter() {
  return async function emailPasswordResetMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
    email?: string
  ): Promise<NextResponse> {
    // Extract email if not provided
    if (!email) {
      email = await extractEmailFromRequest(request);
      if (!email) {
        return NextResponse.json(
          { error: "Email is required" },
          { status: 400 }
        );
      }
    }
    const emailKey = `password-reset:${email}`;
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxRequests = 3; // 3 reset requests per hour

    let emailRateLimit = rateLimitStore.get(emailKey);
    if (!emailRateLimit || emailRateLimit.resetTime < now) {
      emailRateLimit = {
        requests: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(emailKey, emailRateLimit);
    }

    if (emailRateLimit.requests >= maxRequests) {
      const retryAfter = Math.ceil((emailRateLimit.resetTime - now) / 1000);
      return NextResponse.json(
        {
          error:
            "Too many password reset requests for this email, please try again in 1 hour",
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
          },
        }
      );
    }

    // Process the request
    const response = await handler(request);

    // Always increment for password reset requests
    emailRateLimit.requests++;

    return response;
  };
}

export const passwordResetRateLimiter = createEmailPasswordResetLimiter();

// Email-based OTP rate limiter
export function createEmailOTPLimiter() {
  return async function emailOTPMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
    email?: string
  ): Promise<NextResponse> {
    // Extract email if not provided
    if (!email) {
      email = await extractEmailFromRequest(request);
      if (!email) {
        return NextResponse.json(
          { error: "Email is required" },
          { status: 400 }
        );
      }
    }
    const emailKey = `otp:${email}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 1; // 1 OTP per minute

    let emailRateLimit = rateLimitStore.get(emailKey);
    if (!emailRateLimit || emailRateLimit.resetTime < now) {
      emailRateLimit = {
        requests: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(emailKey, emailRateLimit);
    }

    if (emailRateLimit.requests >= maxRequests) {
      const retryAfter = Math.ceil((emailRateLimit.resetTime - now) / 1000);
      return NextResponse.json(
        { error: "Please wait before requesting a new OTP" },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
          },
        }
      );
    }

    // Process the request
    const response = await handler(request);

    // Always increment for OTP requests
    emailRateLimit.requests++;

    return response;
  };
}

export const otpRateLimiter = createEmailOTPLimiter();

// General API rate limiting
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  message: "API rate limit exceeded",
});

// Email-based signup rate limiter
export function createEmailSignupLimiter() {
  return async function emailSignupMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
    email?: string
  ): Promise<NextResponse> {
    // Extract email if not provided
    if (!email) {
      email = await extractEmailFromRequest(request);
      if (!email) {
        return NextResponse.json(
          { error: "Email is required" },
          { status: 400 }
        );
      }
    }
    const emailKey = `signup:${email}`;
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxRequests = 3; // 3 signup attempts per email per hour

    let emailRateLimit = rateLimitStore.get(emailKey);
    if (!emailRateLimit || emailRateLimit.resetTime < now) {
      emailRateLimit = {
        requests: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(emailKey, emailRateLimit);
    }

    if (emailRateLimit.requests >= maxRequests) {
      const retryAfter = Math.ceil((emailRateLimit.resetTime - now) / 1000);
      return NextResponse.json(
        { error: "Too many signup attempts for this email address" },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
          },
        }
      );
    }

    // Process the request
    const response = await handler(request);

    // Only increment on failed attempts
    if (response.status >= 400) {
      emailRateLimit.requests++;
    }

    return response;
  };
}

export const signupRateLimiter = createEmailSignupLimiter();

/**
 * Helper to apply rate limiting to API routes
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  rateLimiter = apiRateLimiter
) {
  return async (req: NextRequest) => {
    return rateLimiter(req, handler);
  };
}

/**
 * Helper function to extract email from request body
 */
async function extractEmailFromRequest(
  request: NextRequest
): Promise<string | null> {
  try {
    const body = await request.clone().json();
    return body.email || null;
  } catch (e) {
    return null;
  }
}

/**
 * Email-based rate limiter for login attempts
 */
export function createEmailLoginRateLimiter() {
  return async function emailRateLimitMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
    email?: string
  ): Promise<NextResponse> {
    const emailKey = email || (await extractEmailFromRequest(request));
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 5; // 5 attempts per email

    let emailRateLimit = rateLimitStore.get(emailKey);
    if (!emailRateLimit || emailRateLimit.resetTime < now) {
      emailRateLimit = {
        requests: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(emailKey, emailRateLimit);
    }

    if (emailRateLimit.requests >= maxRequests) {
      const retryAfter = Math.ceil((emailRateLimit.resetTime - now) / 1000);
      return NextResponse.json(
        {
          error:
            "Too many login attempts for this email address, please try again in 15 minutes",
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(
              emailRateLimit.resetTime
            ).toISOString(),
          },
        }
      );
    }

    // Process the actual request
    const response = await handler(request);

    // Only increment counter on failed attempts
    if (response.status >= 400) {
      emailRateLimit.requests++;
    }

    // Add rate limit headers to response
    const remaining = Math.max(0, maxRequests - emailRateLimit.requests);
    response.headers.set("X-RateLimit-Limit", maxRequests.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set(
      "X-RateLimit-Reset",
      new Date(emailRateLimit.resetTime).toISOString()
    );

    return response;
  };
}

export const emailLoginRateLimiter = createEmailLoginRateLimiter();

// Email-based rate limiting for login attempts
export const loginRateLimiter = emailLoginRateLimiter;
