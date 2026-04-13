import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import sql from '@/lib/db';
import { generateApiKey, hashApiKey, encrypt } from '@/lib/crypto';
import { Wallet } from 'ethers';

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

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(sessionToken, secret);

    if (!payload.address) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid session' },
        { status: 401 }
      );
    }

    const ownerAddress = (payload.address as string).toLowerCase();

    // Check if user already has an active API key
    const [existingKey] = await sql`
      SELECT id
      FROM developer.api_keys
      WHERE owner_address = ${ownerAddress}
      AND is_active = true
      LIMIT 1
    `;

    if (existingKey) {
      return NextResponse.json(
        { error: 'Conflict', message: 'You already have an API key. Revoke it first to generate a new one.' },
        { status: 409 }
      );
    }

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

    // Create developer record
    const [newKey] = await sql`
      INSERT INTO developer.api_keys
        (owner_address, api_key_hash, api_key_prefix, eoa_address, encrypted_eoa_key, tier)
      VALUES
        (${ownerAddress}, ${apiKeyHash}, ${apiKeyPrefix}, ${eoaAddress}, ${encryptedEoaKey}, 'free')
      RETURNING id
    `;

    // Update any pending CLI auth requests with this new API key
    await sql`
      UPDATE developer.cli_auth_requests
      SET api_key_id = ${newKey.id}
      WHERE owner_address = ${ownerAddress}
      AND status = 'completed'
      AND api_key_id IS NULL
    `;

    return NextResponse.json({
      success: true,
      message: 'IMPORTANT: Save your API key and private key securely. They will not be shown again.',
      apiKey,
      eoaAddress,
      eoaPrivateKey,
    });
  } catch (error) {
    console.error('API key generation error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
