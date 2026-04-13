import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { queryWithRetry } from '@/lib/db-retry';
import { generateDeviceCode } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const { cliVersion } = await request.json();

    // Generate unique device code
    let deviceCode: string;
    let attempts = 0;

    do {
      deviceCode = generateDeviceCode();
      // Check if code exists
      const existing = await queryWithRetry<any[]>(() => sql`
        SELECT id FROM developer.cli_auth_requests
        WHERE device_code = ${deviceCode}
        AND status = 'pending'
        AND expires_at > NOW()
      `);

      if (existing.length === 0) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return NextResponse.json(
        { error: 'Failed to generate device code' },
        { status: 500 }
      );
    }

    // Get client info
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create auth request
    await queryWithRetry<any[]>(() => sql`
      INSERT INTO developer.cli_auth_requests
        (device_code, status, ip_address, user_agent, expires_at)
      VALUES
        (${deviceCode}, 'pending', ${ipAddress}::inet, ${userAgent}, NOW() + INTERVAL '10 minutes')
    `);

    const verificationUri = `${process.env.DEVELOPER_URL}/auth/cli?code=${deviceCode}`;

    return NextResponse.json({
      deviceCode,
      verificationUri,
      expiresIn: 600, // 10 minutes in seconds
    });
  } catch (error) {
    console.error('CLI auth initiation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
