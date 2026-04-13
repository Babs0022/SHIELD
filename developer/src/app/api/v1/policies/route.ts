import { NextRequest, NextResponse } from 'next/server';
import { keccak256, encodePacked, formatEther } from 'viem';
import sql from '@/lib/db';
import { queryWithRetry } from '@/lib/db-retry';
import { decrypt } from '@/lib/crypto';
import { authenticateApiRequest, checkRateLimit } from '@/lib/auth';
import { publicClient, getWalletClient, SHIELD_CONTRACT_ADDRESS, shieldAbi } from '@/lib/contract';
// Pinata import removed - CLI now uploads directly to IPFS
import { logRequest } from '@/lib/logger';

const TIER_LIMITS: Record<string, { daily: number; fileSize: number; textChars: number }> = {
  free: { daily: 10, fileSize: 30 * 1024 * 1024, textChars: 500 },
  starter: { daily: 100, fileSize: 100 * 1024 * 1024, textChars: 5000 },
  pro: { daily: 500, fileSize: 1024 * 1024 * 1024, textChars: Infinity },
  enterprise: { daily: Infinity, fileSize: 5 * 1024 * 1024 * 1024, textChars: Infinity },
};

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const auth = await authenticateApiRequest(request);

  if (!auth.success) {
    logRequest({
      method: 'GET',
      endpoint: '/api/v1/policies',
      responseStatus: auth.response.status,
      responseTimeMs: Date.now() - startTime,
      errorCode: 'UNAUTHORIZED',
      errorMessage: 'Invalid API key',
    });
    return auth.response;
  }

  const { apiKey } = auth;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    let policies;

    if (status === 'active') {
      policies = await queryWithRetry<any[]>(() => sql`
        SELECT
          p.policy_id,
          p.resource_cid,
          p.recipient_address,
          p.mime_type,
          p.is_text,
          p.expiry,
          p.max_attempts,
          p.attempts,
          p.valid,
          p.status,
          p.content_length,
          p.created_at,
          (
            SELECT COUNT(*)
            FROM public.access_logs al
            WHERE al.policy_id = p.policy_id
            AND al.success = true
          ) as access_count
        FROM public.policies p
        WHERE p.developer_api_key_id = ${apiKey.id}
        AND p.status = 'active'
        AND p.valid = true
        AND p.expiry > ${Math.floor(Date.now() / 1000)}
        ORDER BY p.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `);
    } else {
      policies = await queryWithRetry<any[]>(() => sql`
        SELECT
          p.policy_id,
          p.resource_cid,
          p.recipient_address,
          p.mime_type,
          p.is_text,
          p.expiry,
          p.max_attempts,
          p.attempts,
          p.valid,
          p.status,
          p.content_length,
          p.created_at,
          (
            SELECT COUNT(*)
            FROM public.access_logs al
            WHERE al.policy_id = p.policy_id
            AND al.success = true
          ) as access_count
        FROM public.policies p
        WHERE p.developer_api_key_id = ${apiKey.id}
        ORDER BY p.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `);
    }

    const formatted = policies.map((p: any) => ({
      id: p.policy_id,
      cid: p.resource_cid,
      recipient: p.recipient_address,
      mimeType: p.mime_type,
      isText: p.is_text,
      expiry: p.expiry,
      maxAttempts: p.max_attempts,
      attempts: p.attempts,
      valid: p.valid,
      status: p.status,
      contentLength: p.content_length,
      accessCount: parseInt(p.access_count as string),
      createdAt: p.created_at,
      link: `${process.env.FRONTEND_URL}/r/${p.policy_id}`,
    }));

    logRequest({
      apiKeyId: apiKey.id,
      method: 'GET',
      endpoint: '/api/v1/policies',
      responseStatus: 200,
      responseTimeMs: Date.now() - startTime,
    });

    return NextResponse.json({
      policies: formatted,
      pagination: {
        limit,
        offset,
        total: formatted.length,
      },
    });
  } catch (error) {
    console.error('List policies error:', error);

    const apiKey = auth.apiKey;
    logRequest({
      apiKeyId: apiKey?.id,
      method: 'GET',
      endpoint: '/api/v1/policies',
      responseStatus: 500,
      responseTimeMs: Date.now() - startTime,
      errorCode: 'INTERNAL_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);

  if (!auth.success) {
    return auth.response;
  }

  const { apiKey } = auth;

  try {
    const rateLimit = await checkRateLimit(apiKey.id, apiKey.tier);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Try again in ${Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)} seconds`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { contentCid, recipientAddress, expiry, maxAttempts, mimeType, isText, contentLength } = body;

    if (!contentCid || !recipientAddress || !expiry || !maxAttempts) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const limits = TIER_LIMITS[apiKey.tier] || TIER_LIMITS.free;

    if (isText && contentLength && contentLength > limits.textChars) {
      return NextResponse.json(
        { error: 'Content Too Large', message: `Text exceeds ${limits.textChars} character limit` },
        { status: 413 }
      );
    }

    if (!isText && contentLength && contentLength > limits.fileSize) {
      return NextResponse.json(
        { error: 'Content Too Large', message: `File exceeds ${limits.fileSize / 1024 / 1024}MB limit` },
        { status: 413 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [usage] = await sql`
      SELECT COUNT(*) as count
      FROM developer.api_usage_logs
      WHERE api_key_id = ${apiKey.id}
      AND endpoint = 'POST /api/v1/policies'
      AND created_at > ${today}
      AND success = true
    `;

    if (parseInt(usage.count) >= limits.daily) {
      return NextResponse.json(
        { error: 'Daily Limit Exceeded', message: `You have created ${limits.daily} policies today` },
        { status: 429 }
      );
    }

    const startTime = Date.now();

    // CLI now uploads directly to IPFS, so we just use the provided contentCid
    // No need to upload to IPFS here anymore

    const policyId = keccak256(
      encodePacked(
        ['address', 'string', 'uint256'],
        [apiKey.eoaAddress as `0x${string}`, contentCid, BigInt(Date.now())]
      )
    );

    const expiryTimestamp = Math.floor(Date.now() / 1000) + parseInt(expiry);

    const privateKey = decrypt(apiKey.encryptedEoaKey) as `0x${string}`;

    const balance = await publicClient.getBalance({
      address: apiKey.eoaAddress as `0x${string}`,
    });

    const estimatedGas = await publicClient.estimateContractGas({
      address: SHIELD_CONTRACT_ADDRESS,
      abi: shieldAbi,
      functionName: 'createPolicy',
      args: [
        policyId,
        recipientAddress.toLowerCase() as `0x${string}`,
        BigInt(expiryTimestamp),
        BigInt(maxAttempts),
      ],
      account: apiKey.eoaAddress as `0x${string}`,
    });

    const gasPrice = await publicClient.getGasPrice();
    const totalCost = estimatedGas * gasPrice;

    if (balance < totalCost) {
      return NextResponse.json(
        {
          error: 'Insufficient Balance',
          message: `Need ${formatEther(totalCost)} ETH, have ${formatEther(balance)} ETH`,
        },
        { status: 402 }
      );
    }

    const walletClient = getWalletClient(privateKey);

    const txHash = await walletClient.writeContract({
      address: SHIELD_CONTRACT_ADDRESS,
      abi: shieldAbi,
      functionName: 'createPolicy',
      args: [
        policyId,
        recipientAddress.toLowerCase() as `0x${string}`,
        BigInt(expiryTimestamp),
        BigInt(maxAttempts),
      ],
      gas: estimatedGas,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    await sql`
      INSERT INTO public.policies
        (policy_id, creator_id, resource_cid, recipient_address, mime_type, is_text, expiry, max_attempts, attempts, valid, status, content_length, created_via_api, developer_api_key_id)
      VALUES
        (${policyId}, ${apiKey.eoaAddress}, ${contentCid}, ${recipientAddress.toLowerCase()}, ${mimeType || null}, ${isText || false}, ${expiryTimestamp}, ${parseInt(maxAttempts)}, 0, true, 'active', ${contentLength || 0}, true, ${apiKey.id})
    `;

    const responseTime = Date.now() - startTime;
    const gasCostEth = Number(receipt.gasUsed) / 1e18;
    const ethPriceUsd = 2500;
    const gasCostUsd = gasCostEth * ethPriceUsd;

    await sql`
      INSERT INTO developer.api_usage_logs
        (api_key_id, endpoint, method, policy_id, gas_used, gas_cost_eth, gas_cost_usd, response_time_ms, success)
      VALUES
        (${apiKey.id}, 'POST /api/v1/policies', 'POST', ${policyId}, ${receipt.gasUsed.toString()}, ${gasCostEth}, ${gasCostUsd}, ${responseTime}, true)
    `;

    await sql`
      UPDATE developer.api_keys
      SET balance_eth = balance_eth - ${gasCostEth}
      WHERE id = ${apiKey.id}
    `;

    return NextResponse.json({
      success: true,
      policyId,
      link: `${process.env.FRONTEND_URL}/r/${policyId}`,
      // decryptionKey is intentionally NOT returned - client must append it locally
      txHash,
      gasUsed: receipt.gasUsed.toString(),
      gasCostEth,
      gasCostUsd,
    });
  } catch (error) {
    console.error('Policy creation error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
