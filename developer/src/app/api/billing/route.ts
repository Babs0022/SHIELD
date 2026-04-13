import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { baseSepolia, base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// USDC Contract ABI (minimal)
const USDC_ABI = [
  {
    constant: true,
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
] as const;

// Pricing in USDC
const TIER_PRICING: Record<string, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
  starter: { monthly: 29, yearly: 290 },
  pro: { monthly: 99, yearly: 990 },
  enterprise: { monthly: 499, yearly: 4990 },
};

const USDC_ADDRESS =
  process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC

const PLATFORM_WALLET =
  process.env.PLATFORM_WALLET_ADDRESS || '';

/**
 * GET /api/billing/pricing
 * Returns pricing for all tiers
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tier = searchParams.get('tier');

    if (tier) {
      const pricing = TIER_PRICING[tier];
      if (!pricing) {
        return NextResponse.json(
          { error: 'Invalid tier' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        tier,
        pricing,
        usdcAddress: USDC_ADDRESS,
      });
    }

    return NextResponse.json({
      tiers: TIER_PRICING,
      usdcAddress: USDC_ADDRESS,
    });
  } catch (error) {
    console.error('Billing pricing error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/billing/upgrade
 * Initiates a tier upgrade
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKeyId, targetTier, billingCycle, txHash } = body;

    if (!apiKeyId || !targetTier || !billingCycle || !txHash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json(
        { error: 'Invalid billing cycle' },
        { status: 400 }
      );
    }

    const pricing = TIER_PRICING[targetTier];
    if (!pricing) {
      return NextResponse.json(
        { error: 'Invalid tier' },
        { status: 400 }
      );
    }

    const amount = pricing[billingCycle as keyof typeof pricing];

    // Record the upgrade request
    const [subscription] = await sql`
      INSERT INTO developer.billing_subscriptions
        (api_key_id, tier, payment_token, payment_amount, tx_hash, status)
      VALUES
        (${apiKeyId}, ${targetTier}, ${USDC_ADDRESS}, ${amount}, ${txHash}, 'pending')
      RETURNING id
    `;

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      message: 'Payment verification in progress',
      amount,
      txHash,
    });
  } catch (error) {
    console.error('Billing upgrade error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * Verify USDC payment on-chain
 */
export async function verifyPayment(
  txHash: string,
  expectedAmount: number,
  fromAddress: string
): Promise<{ verified: boolean; error?: string }> {
  try {
    const rpcUrl =
      process.env.RPC_URL || 'https://sepolia.base.org';
    const chain =
      process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? base : baseSepolia;

    const client = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    // Wait for transaction receipt
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (receipt.status !== 'success') {
      return { verified: false, error: 'Transaction failed' };
    }

    // Get transaction details
    const tx = await client.getTransaction({
      hash: txHash as `0x${string}`,
    });

    // Verify amount using transfer event logs
    const decimals = 6; // USDC has 6 decimals
    const expectedUnits = parseUnits(expectedAmount.toString(), decimals);

    // Parse transfer event from logs
    const transferEvent = receipt.logs.find((log) => {
      // Transfer event signature: keccak256("Transfer(address,address,uint256)")
      return (
        log.topics[0] ===
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
      );
    });

    if (!transferEvent) {
      return { verified: false, error: 'No transfer event found' };
    }

    // Verify recipient is platform wallet
    const toAddress = `0x${transferEvent.topics[2]?.slice(-40)}`;
    if (toAddress.toLowerCase() !== PLATFORM_WALLET.toLowerCase()) {
      return { verified: false, error: 'Invalid recipient' };
    }

    // Verify amount
    const amount = BigInt(transferEvent.data);
    if (amount < expectedUnits) {
      return {
        verified: false,
        error: `Insufficient amount: ${formatUnits(amount, decimals)} USDC received, ${expectedAmount} USDC expected`,
      };
    }

    return { verified: true };
  } catch (error) {
    console.error('Payment verification error:', error);
    return { verified: false, error: 'Verification failed' };
  }
}

/**
 * PATCH /api/billing/verify
 * Verifies payment and activates subscription
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID required' },
        { status: 400 }
      );
    }

    // Get subscription details
    const [subscription] = await sql`
      SELECT *
      FROM developer.billing_subscriptions
      WHERE id = ${subscriptionId}
    `;

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Verify payment on-chain
    const verification = await verifyPayment(
      subscription.tx_hash,
      parseFloat(subscription.payment_amount),
      '' // Would need to track sender address
    );

    if (!verification.verified) {
      await sql`
        UPDATE developer.billing_subscriptions
        SET status = 'failed'
        WHERE id = ${subscriptionId}
      `;

      return NextResponse.json(
        { error: verification.error || 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Activate subscription
    const expiresAt = new Date();
    expiresAt.setMonth(
      expiresAt.getMonth() +
      (subscription.tier === 'yearly' ? 12 : 1)
    );

    await sql`
      UPDATE developer.billing_subscriptions
      SET
        status = 'confirmed',
        confirmed_at = NOW(),
        expires_at = ${expiresAt}
      WHERE id = ${subscriptionId}
    `;

    // Update API key tier
    await sql`
      UPDATE developer.api_keys
      SET
        tier = ${subscription.tier},
        monthly_policy_limit = ${getTierLimit(subscription.tier)}
      WHERE id = ${subscription.api_key_id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Subscription activated',
      expiresAt,
    });
  } catch (error) {
    console.error('Billing verification error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

function getTierLimit(tier: string): number {
  switch (tier) {
    case 'starter':
      return 100;
    case 'pro':
      return 500;
    case 'enterprise':
      return 999999;
    default:
      return 10;
  }
}
