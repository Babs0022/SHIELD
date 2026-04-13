import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
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
 * GET /api/transactions
 * Get transaction history for the current user
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
    // Get the API key for this user
    const [apiKey] = await sql`
      SELECT id
      FROM developer.api_keys
      WHERE owner_address = ${auth.ownerAddress}
      AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!apiKey) {
      return NextResponse.json({ transactions: [] });
    }

    // Get withdrawal transactions
    const withdrawals = await sql`
      SELECT
        id::text,
        'withdrawal' as type,
        amount_eth as amount,
        amount_eth * 2500 as amount_usd,
        status,
        tx_hash,
        'Withdrawal to ' || LEFT(to_address, 6) || '...' || RIGHT(to_address, 4) as description,
        created_at
      FROM developer.withdrawal_requests
      WHERE api_key_id = ${apiKey.id}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    // Get policy creation transactions (from api_usage_logs)
    const policyCreations = await sql`
      SELECT
        id::text,
        'policy_creation' as type,
        gas_cost_eth as amount,
        gas_cost_usd as amount_usd,
        CASE WHEN success THEN 'completed' ELSE 'failed' END as status,
        policy_id as description,
        created_at
      FROM developer.api_usage_logs
      WHERE api_key_id = ${apiKey.id}
      AND endpoint LIKE '%policies%'
      AND method = 'POST'
      ORDER BY created_at DESC
      LIMIT 50
    `;

    // Combine and sort by date
    const allTransactions = [
      ...withdrawals.map((w: any) => ({
        ...w,
        amountUsd: w.amount_usd ? parseFloat(w.amount_usd.toString()) : undefined,
        createdAt: new Date(w.created_at).toISOString(),
      })),
      ...policyCreations.map((p: any) => ({
        ...p,
        amountUsd: p.amount_usd ? parseFloat(p.amount_usd.toString()) : undefined,
        description: `Policy: ${p.description?.slice(0, 10) || 'Unknown'}...`,
        createdAt: new Date(p.created_at).toISOString(),
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      transactions: allTransactions.slice(0, 50),
    });
  } catch (error) {
    console.error('Transactions error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
