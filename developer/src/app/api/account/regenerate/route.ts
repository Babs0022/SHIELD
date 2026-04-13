import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { generateApiKey, hashApiKey, encrypt } from '@/lib/crypto';
import { Wallet } from 'ethers';

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
 * POST /api/account/regenerate
 * Regenerate API key (revoke old, create new with new EOA)
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
    const { confirm } = body;

    if (!confirm) {
      return NextResponse.json(
        { error: 'Confirmation required', message: 'Set confirm: true to regenerate API key' },
        { status: 400 }
      );
    }

    // Get old key info to preserve tier
    const oldKeyResult = await sql`
      SELECT tier
      FROM developer.api_keys
      WHERE owner_address = ${auth.ownerAddress}
      AND is_active = true
      LIMIT 1
    `;

    const oldTier = oldKeyResult[0]?.tier || 'free';

    // Revoke existing keys
    await sql`
      UPDATE developer.api_keys
      SET is_active = false,
          revoked_at = NOW()
      WHERE owner_address = ${auth.ownerAddress}
      AND is_active = true
    `;

    // Generate new EOA for this developer
    const newWallet = Wallet.createRandom();
    const eoaAddress = newWallet.address.toLowerCase();
    const eoaPrivateKey = newWallet.privateKey;

    // Generate API key
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);
    const apiKeyPrefix = apiKey.substring(0, 16);

    // Encrypt private key
    const encryptedEoaKey = encrypt(eoaPrivateKey);

    // Create new developer record with same tier
    const [newKey] = await sql`
      INSERT INTO developer.api_keys
        (owner_address, api_key_hash, api_key_prefix, eoa_address, encrypted_eoa_key, tier)
      VALUES
        (${auth.ownerAddress}, ${apiKeyHash}, ${apiKeyPrefix}, ${eoaAddress}, ${encryptedEoaKey}, ${oldTier})
      RETURNING id
    `;

    // Return new credentials
    return NextResponse.json({
      success: true,
      message: 'API key regenerated successfully. Save these credentials - they will not be shown again.',
      apiKey,
      eoaAddress,
      eoaPrivateKey,
    });
  } catch (error) {
    console.error('Regenerate key error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
