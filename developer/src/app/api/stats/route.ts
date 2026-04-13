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
      SELECT id
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
 * GET /api/stats
 * Get API usage statistics
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
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'day';

    let intervalStr: string;
    if (period === 'day') {
      intervalStr = '1 day';
    } else if (period === 'week') {
      intervalStr = '7 days';
    } else {
      intervalStr = '30 days';
    }

    // Total requests and error count
    const statsResult = await sql`
      SELECT
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE response_status >= 400) as error_count,
        AVG(response_time_ms)::integer as avg_response_time
      FROM developer.api_request_logs
      WHERE api_key_id = ${auth.apiKeyId}
      AND created_at > NOW() - ${intervalStr}::interval
    `;

    // Requests by endpoint
    const endpointResult = await sql`
      SELECT
        endpoint,
        COUNT(*) as count
      FROM developer.api_request_logs
      WHERE api_key_id = ${auth.apiKeyId}
      AND created_at > NOW() - ${intervalStr}::interval
      GROUP BY endpoint
      ORDER BY count DESC
    `;

    const totalRequests = parseInt(statsResult[0]?.total_requests || '0');
    const errorCount = parseInt(statsResult[0]?.error_count || '0');

    return NextResponse.json({
      totalRequests,
      errorCount,
      avgResponseTime: parseInt(statsResult[0]?.avg_response_time || '0'),
      requestsByEndpoint: endpointResult.reduce(
        (acc: Record<string, number>, row: any) => ({
          ...acc,
          [row.endpoint]: parseInt(row.count),
        }),
        {}
      ),
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
