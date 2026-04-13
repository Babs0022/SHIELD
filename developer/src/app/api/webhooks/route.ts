import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { isValidWebhookUrl, generateWebhookSecret } from '@/lib/webhooks';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const VALID_EVENTS = [
  'policy.created',
  'policy.accessed',
  'policy.expired',
  'tier.upgraded',
  'tier.downgraded',
  '*',
];

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
 * GET /api/webhooks
 * List all webhooks for the account
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
    const webhooks = await sql`
      SELECT
        id,
        url,
        events,
        is_active,
        failure_count,
        last_success_at,
        created_at
      FROM developer.webhooks
      WHERE api_key_id = ${auth.apiKeyId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      webhooks: webhooks.map((w: any) => ({
        id: w.id,
        url: w.url,
        events: w.events,
        isActive: w.is_active,
        failureCount: w.failure_count,
        lastSuccessAt: w.last_success_at,
        createdAt: w.created_at,
      })),
    });
  } catch (error) {
    console.error('List webhooks error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webhooks
 * Create a new webhook
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);

  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { url, events } = body;

    if (!url || !isValidWebhookUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid webhook URL. Must use HTTPS.' },
        { status: 400 }
      );
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'At least one event is required' },
        { status: 400 }
      );
    }

    // Validate events
    const invalidEvents = events.filter((e) => !VALID_EVENTS.includes(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid events',
          invalidEvents,
          validEvents: VALID_EVENTS,
        },
        { status: 400 }
      );
    }

    // Generate webhook secret
    const webhookSecret = generateWebhookSecret();

    // Create webhook
    const [webhook] = await sql`
      INSERT INTO developer.webhooks
        (api_key_id, url, secret, events)
      VALUES
        (${auth.apiKeyId}, ${url}, ${webhookSecret}, ${events})
      RETURNING id, url, events, is_active, created_at
    `;

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.is_active,
        createdAt: webhook.created_at,
        // Only show secret on creation
        secret: webhookSecret,
      },
      warning: 'Save this secret - you won\'t be able to see it again!',
    });
  } catch (error) {
    console.error('Create webhook error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/webhooks
 * Delete a webhook
 */
export async function DELETE(req: NextRequest) {
  const auth = await authenticate(req);

  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    // Delete webhook (only if owned by this API key)
    const result = await sql`
      DELETE FROM developer.webhooks
      WHERE id = ${webhookId}
      AND api_key_id = ${auth.apiKeyId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    console.error('Delete webhook error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/webhooks
 * Update webhook status
 */
export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req);

  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive must be a boolean' },
        { status: 400 }
      );
    }

    // Update webhook
    const result = await sql`
      UPDATE developer.webhooks
      SET
        is_active = ${isActive},
        updated_at = NOW()
      WHERE id = ${id}
      AND api_key_id = ${auth.apiKeyId}
      RETURNING id, is_active
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      webhook: {
        id: result[0].id,
        isActive: result[0].is_active,
      },
    });
  } catch (error) {
    console.error('Update webhook error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
