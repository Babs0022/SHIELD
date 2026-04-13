import crypto from 'crypto';
import sql from '@/lib/db';

const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 5000, 15000, 30000, 60000]; // 1s, 5s, 15s, 30s, 60s

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface WebhookConfig {
  id: string;
  url: string;
  secret: string;
  events: string[];
}

/**
 * Gets all active webhooks for an API key
 */
export async function getWebhooksForApiKey(
  apiKeyId: string
): Promise<WebhookConfig[]> {
  const result = await sql`
    SELECT id, url, secret, events
    FROM developer.webhooks
    WHERE api_key_id = ${apiKeyId}
    AND is_active = true
  `;

  return result.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    url: row.url as string,
    secret: row.secret as string,
    events: row.events as string[],
  }));
}

/**
 * Signs a webhook payload with the webhook secret
 */
export function signWebhookPayload(
  payload: WebhookPayload,
  secret: string
): string {
  const payloadString = JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
}

/**
 * Delivers a webhook event
 */
export async function deliverWebhook(
  webhook: WebhookConfig,
  event: string,
  data: Record<string, unknown>
): Promise<{ success: boolean; responseStatus?: number; error?: string }> {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const signature = signWebhookPayload(payload, webhook.secret);

  // Record delivery attempt
  const [delivery] = await sql`
    INSERT INTO developer.webhook_deliveries
      (webhook_id, event_type, payload, signature)
    VALUES
      (${webhook.id}, ${event}, ${JSON.stringify(payload)}, ${signature})
    RETURNING id
  `;

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SHIELD-Signature': signature,
        'X-SHIELD-Event': event,
        'X-SHIELD-Delivery': delivery.id,
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.text();

    // Update delivery record
    await sql`
      UPDATE developer.webhook_deliveries
      SET
        response_status = ${response.status},
        response_body = ${responseBody},
        delivered_at = NOW()
      WHERE id = ${delivery.id}
    `;

    // Update webhook stats
    if (response.ok) {
      await sql`
        UPDATE developer.webhooks
        SET
          last_success_at = NOW(),
          failure_count = 0
        WHERE id = ${webhook.id}
      `;
      return { success: true, responseStatus: response.status };
    } else {
      await sql`
        UPDATE developer.webhooks
        SET
          failure_count = failure_count + 1,
          last_failure_at = NOW(),
          last_failure_reason = ${response.statusText}
        WHERE id = ${webhook.id}
      `;
      return { success: false, responseStatus: response.status };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update delivery record with error
    await sql`
      UPDATE developer.webhook_deliveries
      SET
        failed_at = NOW(),
        error_message = ${errorMessage}
      WHERE id = ${delivery.id}
    `;

    // Update webhook stats
    await sql`
      UPDATE developer.webhooks
      SET
        failure_count = failure_count + 1,
        last_failure_at = NOW(),
        last_failure_reason = ${errorMessage}
      WHERE id = ${webhook.id}
    `;

    return { success: false, error: errorMessage };
  }
}

/**
 * Queues a webhook for retry
 */
export async function queueWebhookRetry(
  deliveryId: string,
  attemptCount: number
): Promise<void> {
  if (attemptCount >= MAX_RETRIES) {
    // Mark as permanently failed
    await sql`
      UPDATE developer.webhook_deliveries
      SET failed_at = NOW()
      WHERE id = ${deliveryId}
    `;
    return;
  }

  const delay = RETRY_DELAYS[Math.min(attemptCount, RETRY_DELAYS.length - 1)];

  // In a production environment, you'd use a proper job queue like Bull or SQS
  // For now, we'll just update the attempt count
  await sql`
    UPDATE developer.webhook_deliveries
    SET attempt_count = attempt_count + 1
    WHERE id = ${deliveryId}
  `;

  // Schedule retry (simplified - in production use proper scheduling)
  setTimeout(async () => {
    try {
      // Re-deliver webhook (implementation would require fetching from DB)
      // This is a placeholder for the retry logic
    } catch (error) {
      console.error('Webhook retry failed:', error);
    }
  }, delay);
}

/**
 * Dispatches an event to all webhooks configured for an API key
 */
export async function dispatchWebhookEvent(
  apiKeyId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  const webhooks = await getWebhooksForApiKey(apiKeyId);

  // Filter webhooks that subscribe to this event
  const matchingWebhooks = webhooks.filter(
    (w) => w.events.includes(event) || w.events.includes('*')
  );

  // Deliver to all matching webhooks in parallel
  await Promise.all(
    matchingWebhooks.map(async (webhook) => {
      try {
        const result = await deliverWebhook(webhook, event, data);
        if (!result.success && result.responseStatus) {
          // Trigger retry if needed
          // queueWebhookRetry(deliveryId, attemptCount);
        }
      } catch (error) {
        console.error(`Webhook delivery failed for ${webhook.url}:`, error);
      }
    })
  );
}

/**
 * Gets recent webhook deliveries for a webhook
 */
export async function getWebhookDeliveries(
  webhookId: string,
  limit: number = 50
): Promise<
  Array<{
    id: string;
    eventType: string;
    responseStatus: number | null;
    attemptCount: number;
    deliveredAt: Date | null;
    failedAt: Date | null;
  }>
> {
  const result = await sql`
    SELECT
      id::text,
      event_type,
      response_status,
      attempt_count,
      delivered_at,
      failed_at
    FROM developer.webhook_deliveries
    WHERE webhook_id = ${webhookId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return result.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    eventType: row.event_type as string,
    responseStatus: row.response_status as number | null,
    attemptCount: row.attempt_count as number,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at as string) : null,
    failedAt: row.failed_at ? new Date(row.failed_at as string) : null,
  }));
}

/**
 * Validates a webhook URL
 */
export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Generates a webhook secret
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}
