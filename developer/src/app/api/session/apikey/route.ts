import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { queryWithRetry } from '@/lib/db-retry';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function GET(request: NextRequest) {
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

    // Get the API key info for this user
    const [apiKey] = await queryWithRetry<any[]>(() => sql`
      SELECT
        id,
        api_key_prefix,
        eoa_address,
        tier,
        created_at,
        last_used_at
      FROM developer.api_keys
      WHERE owner_address = ${ownerAddress}
      AND is_active = true
      LIMIT 1
    `);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Not Found', message: 'No API key found for this user' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      apiKey: {
        prefix: apiKey.api_key_prefix,
        eoaAddress: apiKey.eoa_address,
        tier: apiKey.tier,
        createdAt: apiKey.created_at,
        lastUsedAt: apiKey.last_used_at,
      },
    });
  } catch (error) {
    console.error('API key fetch error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
