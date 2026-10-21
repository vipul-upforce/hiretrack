import { randomBytes, randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

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
 * Default key generator using IP address and endpoint
 */
function defaultKeyGenerator(req: NextRequest): string {
  // Get IP address from various headers (works with proxies/load balancers)
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';

  // Include pathname to have separate limits per endpoint
  const { pathname } = req.nextUrl;
  // console.log('‼️ defaultKeyGenerator', `${ip}:${pathname}`);
  return `${ip}:${pathname}`;
}

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  return (forwardedFor?.split(',')[0] || realIp || 'unknown').trim();
}

function generateClientId(): string {
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }
  return randomBytes(16).toString('hex');
}

/**
 * Helper function to extract email from request body
 */
async function extractEmailFromRequest(
  request: NextRequest,
): Promise<string | null> {
  try {
    const body = await request.clone().json();
    return body.email || null;
  } catch {
    return null;
  }
}

/**
 * Production-ready rate limiter for authentication endpoints
 * Uses in-memory storage to avoid external dependencies
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    keyGenerator = defaultKeyGenerator,
  } = config;

  return async function rateLimitMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
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
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          },
        },
      );
    }

    // Process request
    const response = await handler(request);

    // Increment counter based on configuration
    if (!skipSuccessfulRequests || response.status >= 400) {
      rateLimit.requests += 1;
    }

    // Add rate limit headers to response
    const remaining = Math.max(0, maxRequests - rateLimit.requests);
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set(
      'X-RateLimit-Reset',
      new Date(rateLimit.resetTime).toISOString(),
    );

    return response;
  };
}

/**
 * Enhanced key generator that includes user identification
 * Useful for authenticated endpoints
 */
export function createUserBasedKeyGenerator(
  getUserId: (req: NextRequest) => string | null,
) {
  return (req: NextRequest): string => {
    const userId = getUserId(req);
    if (userId) {
      return `user:${userId}:${req.nextUrl.pathname}`;
    }
    return defaultKeyGenerator(req);
  };
}

// Email-based password reset rate limiter
export function createEmailPasswordResetLimiter() {
  return async function emailPasswordResetMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
    email?: string,
  ): Promise<NextResponse> {
    let emailValue: string | null = email || null;
    // Extract email if not provided
    if (!email) {
      emailValue = await extractEmailFromRequest(request);
      if (!emailValue) {
        return NextResponse.json(
          { error: 'Email is required' },
          { status: 400 },
        );
      }
    }

    const emailKey = `password-reset:${email || emailValue}`;
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
            'Too many password reset requests for this email, please try again in 1 hour',
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
        },
      );
    }

    // Process the request
    const response = await handler(request);

    // Always increment for password reset requests
    emailRateLimit.requests += 1;

    return response;
  };
}

export const passwordResetRateLimiter = createEmailPasswordResetLimiter();

// IP-based rate limiter for password reset token attempts
// Used when resetting password with a token (no email in request body)
export const passwordResetTokenRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes per IP
  message: 'Too many password reset attempts, please try again later',
});

// Email-based OTP rate limiter
export function createEmailOTPLimiter() {
  return async function emailOTPMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
    email?: string,
  ): Promise<NextResponse> {
    // Extract email if not provided
    if (!email) {
      const emailValue = await extractEmailFromRequest(request);
      if (!emailValue) {
        return NextResponse.json(
          { error: 'Email is required' },
          { status: 400 },
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
        { error: 'Please wait before requesting a new OTP' },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
        },
      );
    }

    // Process the request
    const response = await handler(request);

    // Always increment for OTP requests
    emailRateLimit.requests += 1;

    return response;
  };
}

export const otpRateLimiter = createEmailOTPLimiter();

// General API rate limiting
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 50, // 50 requests per minute
  message: 'API rate limit exceeded',
});

// Email-based signup rate limiter
export function createEmailSignupLimiter() {
  return async function emailSignupMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
    email?: string,
  ): Promise<NextResponse> {
    // Extract email if not provided
    let emailToUse = email;
    if (!emailToUse) {
      const emailValue = await extractEmailFromRequest(request);
      if (!emailValue) {
        return NextResponse.json(
          { error: 'Email is required' },
          { status: 400 },
        );
      }
      emailToUse = emailValue;
    }
    const emailKey = `signup:${emailToUse}`;
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
        { error: 'Too many signup attempts for this email address' },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
        },
      );
    }

    // Process the request
    const response = await handler(request);

    // Only increment on failed attempts
    if (response.status >= 400) {
      emailRateLimit.requests += 1;
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
  rateLimiter = apiRateLimiter,
) {
  return async (req: NextRequest) => rateLimiter(req, handler);
}

/**
 * Email-based rate limiter for login attempts
 */
export function createEmailLoginRateLimiter() {
  return async function emailRateLimitMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
    email?: string,
  ): Promise<NextResponse> {
    const emailKey = email || (await extractEmailFromRequest(request));
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 5; // 5 attempts per email

    let emailRateLimit = rateLimitStore.get(emailKey as string);
    if (!emailRateLimit || emailRateLimit.resetTime < now) {
      emailRateLimit = {
        requests: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(emailKey as string, emailRateLimit);
    }

    if (emailRateLimit.requests >= maxRequests) {
      const retryAfter = Math.ceil((emailRateLimit.resetTime - now) / 1000);
      return NextResponse.json(
        {
          error:
            'Too many login attempts for this email address, please try again in 15 minutes',
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(
              emailRateLimit.resetTime,
            ).toISOString(),
          },
        },
      );
    }

    // Process the actual request
    const response = await handler(request);

    // Only increment counter on failed attempts
    if (response.status >= 400) {
      emailRateLimit.requests += 1;
    }

    // Add rate limit headers to response
    const remaining = Math.max(0, maxRequests - emailRateLimit.requests);
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set(
      'X-RateLimit-Reset',
      new Date(emailRateLimit.resetTime).toISOString(),
    );

    return response;
  };
}

export const emailLoginRateLimiter = createEmailLoginRateLimiter();

export function createLoginRateLimiter() {
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxRequestsPerClient = 10; // per browser/client id
  const maxRequestsPerIp = 20; // shared IP limit (covers scripts/postman)
  const cookieName = 'lt_cid';
  const cookieMaxAgeSec = 60 * 60 * 24 * 30; // 30 days
  const clientMessage =
    'Too many login attempts for this client, please try again in 10 minutes';
  const ipMessage =
    'Too many login attempts, please try again later';
  const isProd = process.env.NODE_ENV === 'production';

  return async function loginRateLimitMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
  ): Promise<NextResponse> {
    const now = Date.now();
    const ip = getClientIp(request);
    const ipKey = `login:ip:${ip}`;

    let ipRateLimit = rateLimitStore.get(ipKey);
    if (!ipRateLimit || ipRateLimit.resetTime < now) {
      ipRateLimit = { requests: 0, resetTime: now + windowMs };
      rateLimitStore.set(ipKey, ipRateLimit);
    }

    const existingClientId = request.cookies.get(cookieName)?.value;
    const clientId = existingClientId || generateClientId();
    const clientKey = `login:client:${clientId}`;

    let clientRateLimit = rateLimitStore.get(clientKey);
    if (!clientRateLimit || clientRateLimit.resetTime < now) {
      clientRateLimit = { requests: 0, resetTime: now + windowMs };
      rateLimitStore.set(clientKey, clientRateLimit);
    }

    const attachClientCookie = (response: NextResponse) => {
      if (!existingClientId) {
        response.cookies.set(cookieName, clientId, {
          httpOnly: true,
          secure: isProd,
          sameSite: 'lax',
          path: '/',
          maxAge: cookieMaxAgeSec,
        });
      }
    };

    if (ipRateLimit.requests >= maxRequestsPerIp) {
      const retryAfter = Math.ceil((ipRateLimit.resetTime - now) / 1000);
      const response = NextResponse.json(
        { error: ipMessage },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit-IP': maxRequestsPerIp.toString(),
            'X-RateLimit-Remaining-IP': '0',
            'X-RateLimit-Reset-IP': new Date(
              ipRateLimit.resetTime,
            ).toISOString(),
          },
        },
      );
      attachClientCookie(response);
      return response;
    }

    if (clientRateLimit.requests >= maxRequestsPerClient) {
      const retryAfter = Math.ceil((clientRateLimit.resetTime - now) / 1000);
      const response = NextResponse.json(
        { error: clientMessage },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequestsPerClient.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(
              clientRateLimit.resetTime,
            ).toISOString(),
            'X-RateLimit-Limit-IP': maxRequestsPerIp.toString(),
            'X-RateLimit-Remaining-IP': Math.max(
              0,
              maxRequestsPerIp - ipRateLimit.requests,
            ).toString(),
            'X-RateLimit-Reset-IP': new Date(
              ipRateLimit.resetTime,
            ).toISOString(),
          },
        },
      );
      attachClientCookie(response);
      return response;
    }

    const response = await handler(request);

    if (response.status >= 400) {
      ipRateLimit.requests += 1;
      clientRateLimit.requests += 1;
    }

    response.headers.set(
      'X-RateLimit-Limit',
      maxRequestsPerClient.toString(),
    );
    response.headers.set(
      'X-RateLimit-Remaining',
      Math.max(0, maxRequestsPerClient - clientRateLimit.requests).toString(),
    );
    response.headers.set(
      'X-RateLimit-Reset',
      new Date(clientRateLimit.resetTime).toISOString(),
    );
    response.headers.set(
      'X-RateLimit-Limit-IP',
      maxRequestsPerIp.toString(),
    );
    response.headers.set(
      'X-RateLimit-Remaining-IP',
      Math.max(0, maxRequestsPerIp - ipRateLimit.requests).toString(),
    );
    response.headers.set(
      'X-RateLimit-Reset-IP',
      new Date(ipRateLimit.resetTime).toISOString(),
    );

    attachClientCookie(response);
    return response;
  };
}

// Cookie + IP based rate limiting for login attempts
export const loginRateLimiter = createLoginRateLimiter();

export const logsRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 15, // 15 requests per minute
  message: 'rate limit exceeded',
});
