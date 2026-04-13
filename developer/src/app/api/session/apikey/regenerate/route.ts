import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import sql from '@/lib/db';
import { generateApiKey, hashApiKey, encrypt } from '@/lib/crypto';
import { Wallet } from 'ethers';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * POST /api/session/apikey/regenerate
 * Revokes current API key and generates a new one with new EOA
 */
export async function POST(request: NextRequest) {
  try {
    // Verify session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('shield_session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No session found' },
        { status: 401 }
      );
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(sessionToken, secret);

    if (!payload.address) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid session' },
        { status: 401 }
      );
    }

    const ownerAddress = (payload.address as string).toLowerCase();

    // Verify confirmation
    const body = await request.json().catch(() => ({}));
    if (!body.confirm) {
      return NextResponse.json(
        { error: 'Confirmation required', message: 'Set confirm: true to regenerate API key' },
        { status: 400 }
      );
    }

    // Get current API key info (for tier preservation)
    const [currentKey] = await sql`
      SELECT tier, monthly_policy_count
      FROM developer.api_keys
      WHERE owner_address = ${ownerAddress}
      AND is_active = true
      LIMIT 1
    `;

    const currentTier = currentKey?.tier || 'free';
    const currentPolicyCount = currentKey?.monthly_policy_count || 0;

    // Revoke all existing keys for this owner
    await sql`
      UPDATE developer.api_keys
      SET is_active = false,
          revoked_at = NOW()
      WHERE owner_address = ${ownerAddress}
      AND is_active = true
    `;

    // Generate new EOA for this developer
    const newWallet = Wallet.createRandom();
    const eoaAddress = newWallet.address.toLowerCase();
    const eoaPrivateKey = newWallet.privateKey;

    // Generate new API key
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);
    const apiKeyPrefix = apiKey.substring(0, 16);

    // Encrypt private key
    const encryptedEoaKey = encrypt(eoaPrivateKey);

    // Create new developer record (preserving tier and policy count)
    const [newKey] = await sql`
      INSERT INTO developer.api_keys
        (owner_address, api_key_hash, api_key_prefix, eoa_address, encrypted_eoa_key, tier, monthly_policy_count)
      VALUES
        (${ownerAddress}, ${apiKeyHash}, ${apiKeyPrefix}, ${eoaAddress}, ${encryptedEoaKey}, ${currentTier}, ${currentPolicyCount})
      RETURNING id
    `;

    return NextResponse.json({
      success: true,
      message: 'API key regenerated successfully. Save these credentials - they will not be shown again.',
      apiKey,
      eoaAddress,
      eoaPrivateKey,
      tier: currentTier,
    });
  } catch (error) {
    console.error('API key regeneration error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to regenerate API key' },
      { status: 500 }
    );
  }
}
