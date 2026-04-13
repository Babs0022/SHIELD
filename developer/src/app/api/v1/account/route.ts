import { NextRequest, NextResponse } from 'next/server';
import { formatEther } from 'viem';
import sql from '@/lib/db';
import { authenticateApiRequest } from '@/lib/auth';
import { publicClient } from '@/lib/contract';

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request);

  if (!auth.success) {
    return auth.response;
  }

  const { apiKey } = auth;

  try {
    // Get on-chain balance
    const onChainBalance = await publicClient.getBalance({
      address: apiKey.eoaAddress as `0x${string}`,
    });

    // Get usage stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayUsage] = await sql`
      SELECT
        COUNT(*) as policy_count,
        COALESCE(SUM(gas_cost_eth), 0) as gas_spent_eth,
        COALESCE(SUM(gas_cost_usd), 0) as gas_spent_usd
      FROM developer.api_usage_logs
      WHERE api_key_id = ${apiKey.id}
      AND created_at > ${today}
    `;

    const [monthUsage] = await sql`
      SELECT
        COUNT(*) as policy_count,
        COALESCE(SUM(gas_cost_eth), 0) as gas_spent_eth,
        COALESCE(SUM(gas_cost_usd), 0) as gas_spent_usd
      FROM developer.api_usage_logs
      WHERE api_key_id = ${apiKey.id}
      AND created_at > DATE_TRUNC('month', NOW())
    `;

    const tierLimits: Record<string, { daily: number; monthly: number }> = {
      free: { daily: 10, monthly: 100 },
      starter: { daily: 100, monthly: 1000 },
      pro: { daily: 500, monthly: 5000 },
      enterprise: { daily: Infinity, monthly: Infinity },
    };

    const limits = tierLimits[apiKey.tier] || tierLimits.free;

    return NextResponse.json({
      account: {
        ownerAddress: apiKey.ownerAddress,
        eoaAddress: apiKey.eoaAddress,
        tier: apiKey.tier,
      },
      balance: {
        onChainEth: formatEther(onChainBalance),
        trackedEth: parseFloat(apiKey.balance_eth?.toString() || '0'),
        eoaAddress: apiKey.eoaAddress,
      },
      limits: {
        tier: apiKey.tier,
        dailyPolicies: limits.daily,
        monthlyPolicies: limits.monthly,
      },
      usage: {
        today: {
          policies: parseInt(todayUsage.policy_count),
          gasSpentEth: parseFloat(todayUsage.gas_spent_eth),
          gasSpentUsd: parseFloat(todayUsage.gas_spent_usd),
        },
        thisMonth: {
          policies: parseInt(monthUsage.policy_count),
          gasSpentEth: parseFloat(monthUsage.gas_spent_eth),
          gasSpentUsd: parseFloat(monthUsage.gas_spent_usd),
        },
      },
    });
  } catch (error) {
    console.error('Account fetch error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}