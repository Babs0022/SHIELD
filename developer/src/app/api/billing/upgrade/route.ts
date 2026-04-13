import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// USDC Contract address (Base Sepolia testnet)
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// Payment receiver address (platform treasury)
const PAYMENT_RECEIVER = process.env.PAYMENT_RECEIVER_ADDRESS || '';

// Tier pricing in USDC (6 decimals)
const TIER_PRICING: Record<string, { monthly: bigint; yearly: bigint } > = {
  starter: {
    monthly: BigInt(29000000), // $29
    yearly: BigInt(290000000), // $290 (2 months free)
  },
  pro: {
    monthly: BigInt(99000000), // $99
    yearly: BigInt(990000000), // $990 (2 months free)
  },
  enterprise: {
    monthly: BigInt(499000000), // $499
    yearly: BigInt(4990000000), // $4990 (2 months free)
  },
};

const TIER_LIMITS: Record<string, { daily: number; monthly: number; fileSize: number }> = {
  free: { daily: 10, monthly: 10, fileSize: 30 * 1024 * 1024 },
  starter: { daily: 100, monthly: 100, fileSize: 100 * 1024 * 1024 },
  pro: { daily: 500, monthly: 500, fileSize: 1024 * 1024 * 1024 },
  enterprise: { daily: Infinity, monthly: Infinity, fileSize: 5 * 1024 * 1024 * 1024 },
};

interface AuthenticatedRequest {
  ownerAddress: string;
  apiKeyId: string;
}

async function authenticate(req: NextRequest): Promise<AuthenticatedRequest | null> {
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

    const ownerAddress = payload.address as string;

    // Get API key for this owner
    const result = await sql`
      SELECT id
      FROM developer.api_keys
      WHERE owner_address = ${ownerAddress}
      AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    return {
      ownerAddress,
      apiKeyId: result[0].id,
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/billing/upgrade
 * Get upgrade pricing and current tier information
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
    // Get current tier
    const result = await sql`
      SELECT tier, monthly_policy_count
      FROM developer.api_keys
      WHERE id = ${auth.apiKeyId}
    `;

    const currentTier = result[0]?.tier || 'free';
    const currentUsage = parseInt(result[0]?.monthly_policy_count || '0');

    const tiers = Object.entries(TIER_PRICING).map(([tier, pricing]) => ({
      id: tier,
      name: tier.charAt(0).toUpperCase() + tier.slice(1),
      monthly: {
        amount: pricing.monthly.toString(),
        display: `$${(Number(pricing.monthly) / 1_000_000).toFixed(2)}`,
      },
      yearly: {
        amount: pricing.yearly.toString(),
        display: `$${(Number(pricing.yearly) / 1_000_000).toFixed(2)}`,
        savings: '2 months free',
      },
      limits: TIER_LIMITS[tier],
      isCurrent: tier === currentTier,
      canUpgrade: tier !== currentTier,
    }));

    return NextResponse.json({
      currentTier,
      currentUsage,
      usdcAddress: USDC_ADDRESS,
      paymentReceiver: PAYMENT_RECEIVER,
      tiers,
    });
  } catch (error) {
    console.error('Billing upgrade GET error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/billing/upgrade
 * Initiate a tier upgrade
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);

  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { tier, billingCycle } = body;

    if (!tier || !['starter', 'pro', 'enterprise'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier' },
        { status: 400 }
      );
    }

    if (!billingCycle || !['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json(
        { error: 'Invalid billing cycle' },
        { status: 400 }
      );
    }

    // Get current tier
    const currentResult = await sql`
      SELECT tier
      FROM developer.api_keys
      WHERE id = ${auth.apiKeyId}
    `;

    const currentTier = currentResult[0]?.tier || 'free';

    if (currentTier === tier) {
      return NextResponse.json(
        { error: 'Already on this tier' },
        { status: 400 }
      );
    }

    // Get pricing
    const pricing = TIER_PRICING[tier];
    const amount = billingCycle === 'monthly' ? pricing.monthly : pricing.yearly;

    // Generate unique payment reference
    const paymentRef = `shield_${auth.apiKeyId}_${tier}_${Date.now()}`;

    // Create pending subscription record
    const [subscription] = await sql`
      INSERT INTO developer.billing_subscriptions
        (api_key_id, tier, payment_token, payment_amount, tx_hash, status, started_at, expires_at)
      VALUES
        (${auth.apiKeyId}, ${tier}, ${USDC_ADDRESS}, ${Number(amount) / 1_000_000}, ${paymentRef}, 'pending', NOW(), NOW() + INTERVAL ${billingCycle === 'monthly' ? '1 month' : '1 year'})
      RETURNING id
    `;

    return NextResponse.json({
      payment: {
        token: USDC_ADDRESS,
        amount: amount.toString(),
        receiver: PAYMENT_RECEIVER,
        reference: paymentRef,
      },
      subscription: {
        id: subscription.id,
        tier,
        billingCycle,
        status: 'pending',
      },
      instructions: {
        description: `Send ${(Number(amount) / 1_000_000).toFixed(2)} USDC to ${PAYMENT_RECEIVER}`,
        reference: `Ref: ${paymentRef}`,
        network: 'Base Sepolia Testnet',
      },
    });
  } catch (error) {
    console.error('Billing upgrade POST error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/billing/upgrade
 * Verify payment and activate subscription
 */
export async function PUT(req: NextRequest) {
  const auth = await authenticate(req);

  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { txHash } = body;

    if (!txHash) {
      return NextResponse.json(
        { error: 'Transaction hash required' },
        { status: 400 }
      );
    }

    // Verify transaction on-chain (simplified - in production use proper verification)
    // For now, we just update the record

    // Update subscription status
    await sql`
      UPDATE developer.billing_subscriptions
      SET
        tx_hash = ${txHash},
        status = 'confirmed',
        confirmed_at = NOW()
      WHERE api_key_id = ${auth.apiKeyId}
      AND status = 'pending'
    `;

    // Get the subscription tier
    const result = await sql`
      SELECT tier
      FROM developer.billing_subscriptions
      WHERE api_key_id = ${auth.apiKeyId}
      AND status = 'confirmed'
      ORDER BY confirmed_at DESC
      LIMIT 1
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'No pending subscription found' },
        { status: 404 }
      );
    }

    const newTier = result[0].tier;
    const limits = TIER_LIMITS[newTier];

    // Update API key tier and limits
    await sql`
      UPDATE developer.api_keys
      SET
        tier = ${newTier},
        monthly_policy_limit = ${limits.monthly}
      WHERE id = ${auth.apiKeyId}
    `;

    return NextResponse.json({
      success: true,
      message: `Upgraded to ${newTier} tier`,
      tier: newTier,
      limits: limits,
    });
  } catch (error) {
    console.error('Billing upgrade PUT error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
