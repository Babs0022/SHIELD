import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import { SignJWT } from 'jose';
import sql from '@/lib/db';
import { queryWithRetry } from '@/lib/db-retry';

export async function POST(request: NextRequest) {
  try {
    const { address, signature, message } = await request.json();

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
      // Create user in main app users table
      await queryWithRetry<any[]>(() => sql`
        INSERT INTO public.users
          (wallet_address, tier, daily_link_count, last_link_creation_date)
        VALUES
          (${normalizedAddress}, 'free', 0, ${new Date()})
      `);
    }

    // Create session (regardless of whether they have API key)
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const sessionToken = await new SignJWT({
      address: normalizedAddress,
      type: 'developer_session',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    // Check if developer already has an API key
    const existingKey = await queryWithRetry<any[]>(() => sql`
      SELECT id
      FROM developer.api_keys
      WHERE owner_address = ${normalizedAddress}
      AND is_active = true
      LIMIT 1
    `);

    // Set cookie
    const response = NextResponse.json({
      success: true,
      hasApiKey: existingKey.length > 0,
      message: existingKey.length > 0 ? 'Welcome back' : 'Welcome! Generate your API key in the dashboard.',
    });

    response.cookies.set('shield_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Web auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
