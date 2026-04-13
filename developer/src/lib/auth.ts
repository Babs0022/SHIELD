import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { queryWithRetry } from '@/lib/db-retry';
import { hashApiKey } from '@/lib/crypto';

export interface AuthenticatedRequest extends NextRequest {
  apiKey?: {
    id: string;
    ownerAddress: string;
    eoaAddress: string;
    tier: string;
    encryptedEoaKey: string;
    balance_eth: string;
  };
}

/**
 * Middleware to authenticate API requests using Bearer token
 */
export async function authenticateApiRequest(
  request: NextRequest
): Promise<{ success: true; apiKey: NonNullable<AuthenticatedRequest['apiKey']> } | { success: false; response: NextResponse }> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid Authorization header' },
        { status: 401 }
      ),
    };
  }

  const apiKey = authHeader.substring(7);

  if (!apiKey.startsWith('shield_live_') && !apiKey.startsWith('shield_test_')) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid API key format' },
        { status: 401 }
      ),
    };
  }

  const apiKeyHash = hashApiKey(apiKey);

  try {
    const result = await queryWithRetry<any[]>(() => sql`
      SELECT
        id,
        owner_address,
        eoa_address,
        tier,
        balance_eth,
        encrypted_eoa_key,
        is_active
      FROM developer.api_keys
      WHERE api_key_hash = ${apiKeyHash}
    `);

    if (result.length === 0) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Unauthorized', message: 'Invalid API key' },
          { status: 401 }
        ),
      };
    }

    const key = result[0];

    if (!key.is_active) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Unauthorized', message: 'API key has been revoked' },
          { status: 401 }
        ),
      };
    }

    // Validate EOA address is 20 bytes (40 hex chars + 0x prefix)
    const validatedEoaAddress = key.eoa_address as string;
    if (!validatedEoaAddress?.match(/^0x[a-f0-9]{40}$/i)) {
      console.error('Invalid EOA address format in database:', validatedEoaAddress);
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Server Error', message: 'Invalid API key configuration. Please regenerate your API key.' },
          { status: 500 }
        ),
      };
    }

    // Update last used
    await queryWithRetry<any[]>(() => sql`
      UPDATE developer.api_keys
      SET last_used_at = NOW()
      WHERE id = ${key.id}
    `);

    return {
      success: true,
      apiKey: {
        id: key.id,
        ownerAddress: key.owner_address,
        eoaAddress: validatedEoaAddress,
        tier: key.tier,
        encryptedEoaKey: key.encrypted_eoa_key,
        balance_eth: key.balance_eth,
      },
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Internal Server Error', message: 'Authentication failed' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Rate limiting check based on tier
 */
export async function checkRateLimit(
  apiKeyId: string,
  tier: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const tierLimits: Record<string, { requestsPerMinute: number }> = {
    free: { requestsPerMinute: 10 },
    starter: { requestsPerMinute: 60 },
    pro: { requestsPerMinute: 300 },
    enterprise: { requestsPerMinute: 1000 },
  };

  const limit = tierLimits[tier]?.requestsPerMinute || 10;

  // Simple rate limiting using database
  // In production, use Redis
  const windowStart = new Date(Date.now() - 60000);

  const result = await queryWithRetry<any[]>(() => sql`
    SELECT COUNT(*) as request_count
    FROM developer.api_usage_logs
    WHERE api_key_id = ${apiKeyId}
    AND created_at > ${windowStart}
  `);

  const requestCount = parseInt(result[0].request_count);
  const allowed = requestCount < limit;

  return {
    allowed,
    remaining: Math.max(0, limit - requestCount),
    resetAt: new Date(Date.now() + 60000),
  };
}