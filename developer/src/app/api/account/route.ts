import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { queryWithRetry } from '@/lib/db-retry';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

async function authenticate(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('shield_session')?.value;

  if (!sessionToken) {
    return null;
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(sessionToken, secret);

    if (!payload.address) {
      return null;
    }

    return { ownerAddress: payload.address as string };
  } catch {
    return null;
  }
}

/**
 * GET /api/account
 * Get current account info including API key
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);

  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const result = await queryWithRetry<any[]>(() => sql`
      SELECT
        id,
        api_key_prefix,
        eoa_address,
        balance_eth,
        tier,
        monthly_policy_limit,
        monthly_policy_count,
        is_active,
        created_at,
        last_used_at
      FROM developer.api_keys
      WHERE owner_address = ${auth.ownerAddress}
      AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'No API key found' },
        { status: 404 }
      );
    }

    const key = result[0];

    // Get usage stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [usageToday] = await queryWithRetry<any[]>(() => sql`
      SELECT COUNT(*) as count
      FROM developer.api_usage_logs
      WHERE api_key_id = ${key.id}
      AND created_at > ${today}
      AND success = true
    `);

    const [totalUsage] = await queryWithRetry<any[]>(() => sql`
      SELECT COUNT(*) as count
      FROM developer.api_usage_logs
      WHERE api_key_id = ${key.id}
      AND success = true
    `);

    // Return masked API key (full key not stored, only shown on creation)
    return NextResponse.json({
      id: key.id,
      apiKey: `${key.api_key_prefix}...`,
      apiKeyPrefix: key.api_key_prefix,
      eoaAddress: key.eoa_address,
      balance: key.balance_eth,
      tier: key.tier,
      monthlyPolicyLimit: key.monthly_policy_limit,
      monthlyPolicyCount: parseInt(key.monthly_policy_count),
      isActive: key.is_active,
      createdAt: key.created_at,
      lastUsedAt: key.last_used_at,
      usage: {
        today: parseInt(usageToday?.count || '0'),
        total: parseInt(totalUsage?.count || '0'),
      },
    });
  } catch (error) {
    console.error('Account error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
