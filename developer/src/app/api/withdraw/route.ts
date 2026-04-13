import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

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

    const result = await sql`
      SELECT id, eoa_address, encrypted_eoa_key
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
 * POST /api/withdraw
 * Initiate a withdrawal from developer wallet
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
    const { amount, toAddress } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    if (!toAddress || !toAddress.startsWith('0x') || toAddress.length !== 42) {
      return NextResponse.json(
        { error: 'Invalid address' },
        { status: 400 }
      );
    }

    // Get current balance
    const result = await sql`
      SELECT eoa_address, balance_eth, encrypted_eoa_key
      FROM developer.api_keys
      WHERE id = ${auth.apiKeyId}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    const currentBalance = parseFloat(result[0].balance_eth);
    const eoaAddress = result[0].eoa_address;
    const encryptedPrivateKey = result[0].encrypted_eoa_key;

    if (currentBalance < amount) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          current: currentBalance,
          requested: amount,
        },
        { status: 400 }
      );
    }

    // Reserve balance during withdrawal
    await sql`
      UPDATE developer.api_keys
      SET balance_eth = balance_eth - ${amount}
      WHERE id = ${auth.apiKeyId}
    `;

    // Create withdrawal request
    const [withdrawal] = await sql`
      INSERT INTO developer.withdrawal_requests
        (api_key_id, amount_eth, to_address, status)
      VALUES
        (${auth.apiKeyId}, ${amount}, ${toAddress}, 'pending')
      RETURNING id
    `;

    // In production, this would:
    // 1. Decrypt the private key using the API key
    // 2. Sign and broadcast the transaction
    // 3. Update the record with tx_hash
    // 4. Handle transaction confirmation

    // For now, return the withdrawal request
    return NextResponse.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        amount,
        toAddress,
        fromAddress: eoaAddress,
        status: 'pending',
        message: 'Withdrawal request created. Processing may take a few minutes.',
      },
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/withdraw
 * Get withdrawal history
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
    const withdrawals = await sql`
      SELECT
        id,
        amount_eth,
        to_address,
        tx_hash,
        status,
        created_at,
        completed_at
      FROM developer.withdrawal_requests
      WHERE api_key_id = ${auth.apiKeyId}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({
      withdrawals: withdrawals.map((w: any) => ({
        id: w.id,
        amount: parseFloat(w.amount_eth as string),
        toAddress: w.to_address,
        txHash: w.tx_hash,
        status: w.status,
        createdAt: w.created_at,
        completedAt: w.completed_at,
      })),
    });
  } catch (error) {
    console.error('Withdraw history error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
