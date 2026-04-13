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
 * GET /api/logs
 * Get API request logs
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const period = searchParams.get('period') || 'day';

    let logs: any[];
    if (period === 'day') {
      logs = await sql`
        SELECT
          id::text,
          method,
          endpoint,
          response_status,
          response_time_ms,
          error_code,
          error_message,
          rate_limit_hit,
          created_at
        FROM developer.api_request_logs
        WHERE api_key_id = ${auth.apiKeyId}
        AND created_at > NOW() - INTERVAL '1 day'
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else if (period === 'week') {
      logs = await sql`
        SELECT
          id::text,
          method,
          endpoint,
          response_status,
          response_time_ms,
          error_code,
          error_message,
          rate_limit_hit,
          created_at
        FROM developer.api_request_logs
        WHERE api_key_id = ${auth.apiKeyId}
        AND created_at > NOW() - INTERVAL '7 days'
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else {
      logs = await sql`
        SELECT
          id::text,
          method,
          endpoint,
          response_status,
          response_time_ms,
          error_code,
          error_message,
          rate_limit_hit,
          created_at
        FROM developer.api_request_logs
        WHERE api_key_id = ${auth.apiKeyId}
        AND created_at > NOW() - INTERVAL '30 days'
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    }

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        method: log.method,
        endpoint: log.endpoint,
        responseStatus: log.response_status,
        responseTimeMs: log.response_time_ms,
        errorCode: log.error_code,
        errorMessage: log.error_message,
        rateLimitHit: log.rate_limit_hit,
        createdAt: log.created_at,
      })),
    });
  } catch (error) {
    console.error('Logs error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
