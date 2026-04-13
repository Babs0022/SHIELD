import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import QRCode from 'qrcode';

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
      SELECT id, eoa_address
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
 * GET /api/deposit
 * Get deposit address and QR code
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
    const result = await sql`
      SELECT eoa_address
      FROM developer.api_keys
      WHERE id = ${auth.apiKeyId}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    const eoaAddress = result[0].eoa_address;

    // Generate QR code for the address
    const qrCodeDataUrl = await QRCode.toDataURL(eoaAddress, {
      width: 256,
      margin: 2,
      color: {
        dark: '#8A8AFF',
        light: '#111111',
      },
    });

    return NextResponse.json({
      address: eoaAddress,
      qrCode: qrCodeDataUrl,
      network: 'Base Sepolia',
      currency: 'ETH',
      instructions: [
        'Send ETH to the address above',
        'Funds will appear in your balance once the transaction is confirmed',
        'You can also scan the QR code with a mobile wallet app',
      ],
    });
  } catch (error) {
    console.error('Deposit error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
