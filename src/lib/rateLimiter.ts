import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
  message?: string;  // Custom error message
  skipSuccessfulRequests?: boolean;  // Only count failed requests
  keyGenerator?: (req: NextRequest) => string;  // Custom key generation
}

interface RateLimitStore {
  requests: number;
  resetTime: number;
}

// In-memory store for rate limiting
// In production, you might want to use Redis for distributed systems
const rateLimitStore = new Map<string, RateLimitStore>();

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
    keyGenerator = defaultKeyGenerator
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
        resetTime: now + windowMs
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
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString()
          }
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
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
    
    return response;
  };
}

/**
 * Default key generator using IP address and endpoint
 */
function defaultKeyGenerator(req: NextRequest): string {
  // Get IP address from various headers (works with proxies/load balancers)
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
  
  // Include pathname to have separate limits per endpoint
  const pathname = req.nextUrl.pathname;
  
  return `${ip}:${pathname}`;
}

/**
 * Enhanced key generator that includes user identification
 * Useful for authenticated endpoints
 */
export function createUserBasedKeyGenerator(getUserId: (req: NextRequest) => string | null) {
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

// Strict rate limiting for login attempts
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: "Too many login attempts, please try again in 15 minutes",
  skipSuccessfulRequests: true // Only count failed login attempts
});

// Moderate rate limiting for password reset
export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 reset requests per hour
  message: "Too many password reset requests, please try again in 1 hour"
});

// OTP rate limiting
export const otpRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 1, // 1 OTP per minute
  message: "Please wait before requesting a new OTP"
});

// General API rate limiting
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  message: "API rate limit exceeded"
});

// Signup rate limiting (by IP to prevent abuse)
export const signupRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 signups per hour per IP
  message: "Too many signup attempts from this IP address"
});

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