import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import sql from '@/lib/db';
import { queryWithRetry } from '@/lib/db-retry';

export async function POST(request: NextRequest) {
  try {
    const { deviceCode, address, signature, message } = await request.json();

    // Verify signature
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const normalizedAddress = address.toLowerCase();

    // Check if user exists in main app, if not create them
    const existingUser = await queryWithRetry<any[]>(() => sql`
      SELECT wallet_address FROM public.users
      WHERE wallet_address = ${normalizedAddress}
    `);

    if (existingUser.length === 0) {
      await queryWithRetry<any[]>(() => sql`
        INSERT INTO public.users
          (wallet_address, tier, daily_link_count, last_link_creation_date)
        VALUES
          (${normalizedAddress}, 'free', 0, ${new Date()})
      `);
    }

    // Check device code
    const [authRequest] = await queryWithRetry<any[]>(() => sql`
      SELECT * FROM developer.cli_auth_requests
      WHERE device_code = ${deviceCode}
      AND status = 'pending'
      AND expires_at > NOW()
    `);

    if (!authRequest) {
      return NextResponse.json(
        { error: 'Invalid or expired device code' },
        { status: 400 }
      );
    }

    // Check if developer has an API key
    const [existingKey] = await queryWithRetry<any[]>(() => sql`
      SELECT id, api_key_hash
      FROM developer.api_keys
      WHERE owner_address = ${normalizedAddress}
      AND is_active = true
      LIMIT 1
    `);

    if (!existingKey) {
      // Mark auth as completed but without API key
      await queryWithRetry<any[]>(() => sql`
        UPDATE developer.cli_auth_requests
        SET
          status = 'completed',
          owner_address = ${normalizedAddress},
          completed_at = NOW()
        WHERE device_code = ${deviceCode}
      `);

      // Return special response that CLI can handle
      return NextResponse.json({
        success: true,
        status: 'needs_api_key',
        message: 'Authentication successful! Please visit the dashboard to generate your API key.',
        redirectUrl: `${process.env.DEVELOPER_URL}/dashboard`,
      });
    }

    // Has API key - complete auth normally
    await queryWithRetry<any[]>(() => sql`
      UPDATE developer.cli_auth_requests
      SET
        status = 'completed',
        owner_address = ${normalizedAddress},
        api_key_id = ${existingKey.id},
        completed_at = NOW()
      WHERE device_code = ${deviceCode}
    `);

    return NextResponse.json({
      success: true,
      status: 'authenticated',
      message: 'CLI authentication successful.',
    });
  } catch (error) {
    console.error('CLI verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
