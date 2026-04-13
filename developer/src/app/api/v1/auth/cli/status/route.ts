import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { queryWithRetry } from '@/lib/db-retry';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceCode = searchParams.get('code');

    if (!deviceCode) {
      return NextResponse.json(
        { error: 'Device code required' },
        { status: 400 }
      );
    }

    const [authRequest] = await queryWithRetry<any[]>(() => sql`
      SELECT
        car.status,
        car.owner_address,
        car.api_key_id,
        car.created_at,
        car.expires_at,
        car.completed_at,
        ak.eoa_address
      FROM developer.cli_auth_requests car
      LEFT JOIN developer.api_keys ak ON ak.id = car.api_key_id
      WHERE car.device_code = ${deviceCode}
    `);

    if (!authRequest) {
      return NextResponse.json(
        { error: 'Device code not found' },
        { status: 404 }
      );
    }

    // If completed and has api_key_id, fetch the API key details
    let apiKey = null;
    let eoaAddress = null;
    if (authRequest.status === 'completed' && authRequest.api_key_id) {
      const [keyData] = await queryWithRetry<any[]>(() => sql`
        SELECT api_key_prefix, eoa_address
        FROM developer.api_keys
        WHERE id = ${authRequest.api_key_id}
      `);
      if (keyData) {
        // Return partial API key (prefix only) - full key is only shown once during generation
        apiKey = `${keyData.api_key_prefix}...`;
        eoaAddress = keyData.eoa_address;
      }
    }

    return NextResponse.json({
      deviceCode,
      status: authRequest.status,
      ownerAddress: authRequest.owner_address,
      apiKeyId: authRequest.api_key_id,
      hasApiKey: !!authRequest.api_key_id,
      apiKey,
      eoaAddress,
      createdAt: authRequest.created_at,
      expiresAt: authRequest.expires_at,
      completedAt: authRequest.completed_at,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
