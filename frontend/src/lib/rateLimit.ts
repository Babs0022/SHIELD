import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

// Default rate limits by tier
const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  free: { windowMs: 60 * 1000, maxRequests: 10 },      // 10 requests per minute
  pro: { windowMs: 60 * 1000, maxRequests: 60 },       // 60 requests per minute
};

/**
 * Check if a wallet address has exceeded its rate limit
 */
export async function checkRateLimit(
  walletAddress: string,
  tier: string = 'free',
  config?: RateLimitConfig
): Promise<{ allowed: boolean; retryAfter?: number; remaining?: number }> {
  const limits = config || DEFAULT_LIMITS[tier] || DEFAULT_LIMITS.free;
  const now = new Date();
  const windowStart = new Date(now.getTime() - limits.windowMs);

  try {
    // Clean up old entries first
    await sql`
      DELETE FROM rate_limits
      WHERE wallet_address = ${walletAddress}
      AND requested_at < ${windowStart}
    `;

    // Count requests in current window
    const result = await sql`
      SELECT COUNT(*) as count
      FROM rate_limits
      WHERE wallet_address = ${walletAddress}
      AND requested_at >= ${windowStart}
    `;

    const requestCount = parseInt(result[0].count);

    if (requestCount >= limits.maxRequests) {
      // Get the oldest request to calculate retry-after
      const oldestResult = await sql`
        SELECT MIN(requested_at) as oldest
        FROM rate_limits
        WHERE wallet_address = ${walletAddress}
      `;
      const oldestRequest = new Date(oldestResult[0].oldest);
      const retryAfter = Math.ceil((oldestRequest.getTime() + limits.windowMs - now.getTime()) / 1000);

      return {
        allowed: false,
        retryAfter: Math.max(1, retryAfter),
        remaining: 0,
      };
    }

    // Log the current request
    await sql`
      INSERT INTO rate_limits (wallet_address, requested_at)
      VALUES (${walletAddress}, ${now})
    `;

    return {
      allowed: true,
      remaining: limits.maxRequests - requestCount - 1,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow request if we can't check rate limit
    return { allowed: true, remaining: 0 };
  }
}

/**
 * Middleware to apply rate limiting to API routes
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Extract wallet address from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Invalid authorization format.' }, { status: 401 });
    }

    // Decode JWT to get wallet address (simplified - in production, verify the token)
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      const walletAddress = payload.address;
      const tier = payload.tier || 'free';

      const rateLimitResult = await checkRateLimit(walletAddress, tier, config);

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter: rateLimitResult.retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(rateLimitResult.retryAfter),
              'X-RateLimit-Remaining': '0',
            },
          }
        );
      }

      // Add rate limit headers to response
      const response = await handler(request);
      response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
      return response;
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      return handler(request);
    }
  };
}
