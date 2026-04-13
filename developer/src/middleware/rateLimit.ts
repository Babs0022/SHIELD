import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

interface RateLimitConfig {
  requestsPerWindow: number;
  windowMs: number;
}

// Rate limits by tier
const TIER_LIMITS: Record<string, RateLimitConfig> = {
  free: { requestsPerWindow: 100, windowMs: 24 * 60 * 60 * 1000 }, // 100/day
  starter: { requestsPerWindow: 1000, windowMs: 24 * 60 * 60 * 1000 }, // 1000/day
  pro: { requestsPerWindow: 10000, windowMs: 24 * 60 * 60 * 1000 }, // 10000/day
  enterprise: { requestsPerWindow: 100000, windowMs: 24 * 60 * 60 * 1000 }, // 100k/day
};

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  totalLimit: number;
}

/**
 * Checks if a request is within rate limits for an API key
 */
export async function checkRateLimit(
  apiKeyId: string,
  tier: string = 'free'
): Promise<RateLimitResult> {
  const config = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const windowStart = new Date(Date.now() - config.windowMs);

  // Count requests in current window
  const result = await sql`
    SELECT COUNT(*) as count
    FROM developer.api_request_logs
    WHERE api_key_id = ${apiKeyId}
    AND created_at > ${windowStart}
  `;

  const requestCount = parseInt(result[0]?.count || '0');
  const allowed = requestCount < config.requestsPerWindow;
  const remaining = Math.max(0, config.requestsPerWindow - requestCount);
  const resetAt = Date.now() + config.windowMs;

  return {
    allowed,
    remaining,
    resetAt,
    totalLimit: config.requestsPerWindow,
  };
}

/**
 * Middleware to enforce rate limiting on API routes
 * Use this in API route handlers
 */
export async function rateLimitMiddleware(
  req: NextRequest,
  apiKeyId: string,
  tier: string
): Promise<{ allowed: true } | { allowed: false; response: NextResponse }> {
  const result = await checkRateLimit(apiKeyId, tier);

  if (!result.allowed) {
    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `You have exceeded your ${tier} tier limit of ${result.totalLimit} requests per day`,
        resetAt: result.resetAt,
      },
      { status: 429 }
    );

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', result.totalLimit.toString());
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', result.resetAt.toString());

    return { allowed: false, response };
  }

  return { allowed: true };
}

/**
 * Gets rate limit status for an API key
 * Useful for displaying in dashboard
 */
export async function getRateLimitStatus(
  apiKeyId: string,
  tier: string = 'free'
): Promise<{
  limit: number;
  used: number;
  remaining: number;
  resetAt: Date;
  percentage: number;
}> {
  const config = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const windowStart = new Date(Date.now() - config.windowMs);

  const result = await sql`
    SELECT COUNT(*) as count
    FROM developer.api_request_logs
    WHERE api_key_id = ${apiKeyId}
    AND created_at > ${windowStart}
  `;

  const used = parseInt(result[0]?.count || '0');
  const remaining = Math.max(0, config.requestsPerWindow - used);
  const resetAt = new Date(Date.now() + config.windowMs);
  const percentage = Math.min(100, (used / config.requestsPerWindow) * 100);

  return {
    limit: config.requestsPerWindow,
    used,
    remaining,
    resetAt,
    percentage,
  };
}

/**
 * Increments policy creation counter for rate limiting
 */
export async function incrementPolicyCount(apiKeyId: string): Promise<void> {
  await sql`
    UPDATE developer.api_keys
    SET monthly_policy_count = monthly_policy_count + 1,
        last_used_at = NOW()
    WHERE id = ${apiKeyId}
  `;
}

/**
 * Checks if API key has reached monthly policy limit
 */
export async function checkPolicyLimit(
  apiKeyId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const result = await sql`
    SELECT monthly_policy_count, monthly_policy_limit, tier
    FROM developer.api_keys
    WHERE id = ${apiKeyId}
  `;

  if (result.length === 0) {
    return { allowed: false, current: 0, limit: 0 };
  }

  const current = parseInt(result[0].monthly_policy_count);
  const limit = parseInt(result[0].monthly_policy_limit);
  const tier = result[0].tier;

  // Enterprise tier has unlimited policies
  if (tier === 'enterprise') {
    return { allowed: true, current, limit: Infinity };
  }

  return { allowed: current < limit, current, limit };
}

/**
 * Resets monthly policy counts (call at start of month)
 */
export async function resetMonthlyPolicyCounts(): Promise<void> {
  await sql`
    UPDATE developer.api_keys
    SET monthly_policy_count = 0
    WHERE tier != 'enterprise'
  `;
}
