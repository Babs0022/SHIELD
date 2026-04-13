import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { authenticateApiRequest } from '@/lib/auth';
import { logRequest } from '@/lib/logger';

/**
 * GET /api/v1/policies/:id/accesses
 * Get access logs for a specific policy
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const auth = await authenticateApiRequest(request);

  if (!auth.success) {
    logRequest({
      method: 'GET',
      endpoint: '/api/v1/policies/:id/accesses',
      responseStatus: auth.response.status,
      responseTimeMs: Date.now() - startTime,
      errorCode: 'UNAUTHORIZED',
      errorMessage: 'Invalid API key',
    });
    return auth.response;
  }

  const { apiKey } = auth;
  const { id: policyId } = await params;

  try {
    // Verify policy belongs to this API key
    const [policy] = await sql`
      SELECT policy_id
      FROM public.policies
      WHERE policy_id = ${policyId}
      AND developer_api_key_id = ${apiKey.id}
    `;

    if (!policy) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Policy not found or access denied' },
        { status: 404 }
      );
    }

    // Get access logs
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const logs = await sql`
      SELECT
        al.id::text,
        al.attempt_number,
        al.ip_address,
        al.success,
        al.created_at,
        al.failure_reason
      FROM public.access_logs al
      WHERE al.policy_id = ${policyId}
      ORDER BY al.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Get summary stats
    const [stats] = await sql`
      SELECT
        COUNT(*) as total_attempts,
        COUNT(*) FILTER (WHERE success = true) as successful_accesses,
        COUNT(*) FILTER (WHERE success = false) as failed_attempts
      FROM public.access_logs
      WHERE policy_id = ${policyId}
    `;

    logRequest({
      apiKeyId: apiKey.id,
      method: 'GET',
      endpoint: '/api/v1/policies/:id/accesses',
      responseStatus: 200,
      responseTimeMs: Date.now() - startTime,
    });

    return NextResponse.json({
      policyId,
      accesses: logs.map((log: any) => ({
        id: log.id,
        attemptNumber: log.attempt_number,
        ipAddress: log.ip_address,
        success: log.success,
        failureReason: log.failure_reason,
        createdAt: log.created_at,
      })),
      stats: {
        totalAttempts: parseInt(stats.total_attempts),
        successfulAccesses: parseInt(stats.successful_accesses),
        failedAttempts: parseInt(stats.failed_attempts),
      },
      pagination: {
        limit,
        offset,
        total: logs.length,
      },
    });
  } catch (error) {
    console.error('Get policy accesses error:', error);
    logRequest({
      apiKeyId: apiKey.id,
      method: 'GET',
      endpoint: '/api/v1/policies/:id/accesses',
      responseStatus: 500,
      responseTimeMs: Date.now() - startTime,
      errorCode: 'INTERNAL_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
