import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { authenticateApiRequest } from '@/lib/auth';
import { logRequest } from '@/lib/logger';

/**
 * GET /api/v1/policies/:id
 * Get a specific policy by ID
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
      endpoint: '/api/v1/policies/:id',
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
    const [policy] = await sql`
      SELECT
        p.policy_id,
        p.resource_cid,
        p.recipient_address,
        p.mime_type,
        p.is_text,
        p.expiry,
        p.max_attempts,
        p.attempts,
        p.valid,
        p.status,
        p.content_length,
        p.created_at,
        p.created_via_api,
        (
          SELECT COUNT(*)
          FROM public.access_logs al
          WHERE al.policy_id = p.policy_id
          AND al.success = true
        ) as access_count
      FROM public.policies p
      WHERE p.policy_id = ${policyId}
      AND p.developer_api_key_id = ${apiKey.id}
    `;

    if (!policy) {
      logRequest({
        apiKeyId: apiKey.id,
        method: 'GET',
        endpoint: '/api/v1/policies/:id',
        responseStatus: 404,
        responseTimeMs: Date.now() - startTime,
        errorCode: 'NOT_FOUND',
        errorMessage: 'Policy not found',
      });
      return NextResponse.json(
        { error: 'Not Found', message: 'Policy not found or does not belong to this API key' },
        { status: 404 }
      );
    }

    logRequest({
      apiKeyId: apiKey.id,
      method: 'GET',
      endpoint: '/api/v1/policies/:id',
      responseStatus: 200,
      responseTimeMs: Date.now() - startTime,
    });

    return NextResponse.json({
      policy: {
        id: policy.policy_id,
        cid: policy.resource_cid,
        recipient: policy.recipient_address,
        mimeType: policy.mime_type,
        isText: policy.is_text,
        expiry: policy.expiry,
        maxAttempts: policy.max_attempts,
        attempts: policy.attempts,
        valid: policy.valid,
        status: policy.status,
        contentLength: policy.content_length,
        accessCount: parseInt(policy.access_count),
        createdViaApi: policy.created_via_api,
        createdAt: policy.created_at,
        link: `${process.env.FRONTEND_URL}/r/${policy.policy_id}`,
      },
    });
  } catch (error) {
    console.error('Get policy error:', error);
    logRequest({
      apiKeyId: apiKey.id,
      method: 'GET',
      endpoint: '/api/v1/policies/:id',
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

/**
 * DELETE /api/v1/policies/:id
 * Revoke a policy (mark as invalid)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const auth = await authenticateApiRequest(request);

  if (!auth.success) {
    logRequest({
      method: 'DELETE',
      endpoint: '/api/v1/policies/:id',
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
    // Check policy exists and belongs to this API key
    const [policy] = await sql`
      SELECT policy_id, status
      FROM public.policies
      WHERE policy_id = ${policyId}
      AND developer_api_key_id = ${apiKey.id}
    `;

    if (!policy) {
      logRequest({
        apiKeyId: apiKey.id,
        method: 'DELETE',
        endpoint: '/api/v1/policies/:id',
        responseStatus: 404,
        responseTimeMs: Date.now() - startTime,
        errorCode: 'NOT_FOUND',
        errorMessage: 'Policy not found',
      });
      return NextResponse.json(
        { error: 'Not Found', message: 'Policy not found or does not belong to this API key' },
        { status: 404 }
      );
    }

    if (policy.status === 'revoked') {
      return NextResponse.json(
        { error: 'Already Revoked', message: 'Policy has already been revoked' },
        { status: 409 }
      );
    }

    // Revoke the policy
    await sql`
      UPDATE public.policies
      SET valid = false,
          status = 'revoked'
      WHERE policy_id = ${policyId}
    `;

    logRequest({
      apiKeyId: apiKey.id,
      method: 'DELETE',
      endpoint: '/api/v1/policies/:id',
      responseStatus: 200,
      responseTimeMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      message: 'Policy revoked successfully',
      policyId,
      revokedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Revoke policy error:', error);
    logRequest({
      apiKeyId: apiKey.id,
      method: 'DELETE',
      endpoint: '/api/v1/policies/:id',
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
