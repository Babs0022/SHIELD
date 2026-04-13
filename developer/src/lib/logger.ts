import sql from '@/lib/db';
import { queryWithRetry } from '@/lib/db-retry';

interface LogEntry {
  apiKeyId?: string;
  method: string;
  endpoint: string;
  queryParams?: Record<string, unknown>;
  requestBodyHash?: string;
  responseStatus: number;
  responseTimeMs: number;
  ipAddress?: string;
  userAgent?: string;
  errorCode?: string;
  errorMessage?: string;
  rateLimitHit?: boolean;
}

/**
 * Logs an API request to the database
 * Non-blocking - logs asynchronously without affecting response time
 */
export function logRequest(entry: LogEntry): void {
  // Fire and forget - don't await
  insertLog(entry).catch((err) => {
    console.error('Failed to log request:', err);
  });
}

async function insertLog(entry: LogEntry): Promise<void> {
  try {
    await queryWithRetry<any[]>(() => sql`
      INSERT INTO developer.api_request_logs (
        api_key_id,
        method,
        endpoint,
        query_params,
        request_body_hash,
        response_status,
        response_time_ms,
        ip_address,
        user_agent,
        error_code,
        error_message,
        rate_limit_hit
      ) VALUES (
        ${entry.apiKeyId || null},
        ${entry.method},
        ${entry.endpoint},
        ${entry.queryParams ? JSON.stringify(entry.queryParams) : null},
        ${entry.requestBodyHash || null},
        ${entry.responseStatus},
        ${entry.responseTimeMs},
        ${entry.ipAddress || null},
        ${entry.userAgent || null},
        ${entry.errorCode || null},
        ${entry.errorMessage || null},
        ${entry.rateLimitHit || false}
      )
    `);
  } catch (error) {
    console.error('Database log insert failed:', error);
  }
}

/**
 * Gets API usage statistics for a specific API key
 */
export async function getApiUsageStats(
  apiKeyId: string,
  period: 'day' | 'week' | 'month' = 'day'
): Promise<{
  totalRequests: number;
  errorCount: number;
  avgResponseTime: number;
  requestsByEndpoint: Record<string, number>;
}> {
  const interval =
    period === 'day'
      ? '1 day'
      : period === 'week'
        ? '7 days'
        : '30 days';

  const result = await queryWithRetry<any[]>(() => sql`
    SELECT
      COUNT(*) as total_requests,
      COUNT(*) FILTER (WHERE response_status >= 400) as error_count,
      AVG(response_time_ms)::integer as avg_response_time
    FROM developer.api_request_logs
    WHERE api_key_id = ${apiKeyId}
    AND created_at > NOW() - INTERVAL ${interval}
  `);

  const byEndpoint = await queryWithRetry<any[]>(() => sql`
    SELECT
      endpoint,
      COUNT(*) as count
    FROM developer.api_request_logs
    WHERE api_key_id = ${apiKeyId}
    AND created_at > NOW() - INTERVAL ${interval}
    GROUP BY endpoint
    ORDER BY count DESC
  `);

  return {
    totalRequests: parseInt(result[0]?.total_requests || '0'),
    errorCount: parseInt(result[0]?.error_count || '0'),
    avgResponseTime: parseInt(result[0]?.avg_response_time || '0'),
    requestsByEndpoint: byEndpoint.reduce(
      (acc: Record<string, number>, row: Record<string, unknown>) => ({
        ...acc,
        [row.endpoint as string]: parseInt(row.count as string),
      }),
      {}
    ),
  };
}

/**
 * Gets recent error logs for monitoring
 */
export async function getRecentErrors(
  limit: number = 50
): Promise<
  Array<{
    id: string;
    endpoint: string;
    method: string;
    responseStatus: number;
    errorMessage: string;
    createdAt: Date;
  }>
> {
  const result = await queryWithRetry<any[]>(() => sql`
    SELECT
      id::text,
      endpoint,
      method,
      response_status,
      error_message,
      created_at
    FROM developer.api_request_logs
    WHERE response_status >= 400
    AND created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);

  return result.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    endpoint: row.endpoint as string,
    method: row.method as string,
    responseStatus: row.response_status as number,
    errorMessage: (row.error_message as string) || 'Unknown error',
    createdAt: new Date(row.created_at as string),
  }));
}

/**
 * Gets API health metrics
 */
export async function getApiHealthMetrics(): Promise<{
  requestsLastHour: number;
  errorRate: number;
  avgResponseTime: number;
  uniqueApiKeys: number;
}> {
  const result = await queryWithRetry<any[]>(() => sql`
    SELECT
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as requests_last_hour,
      COUNT(*) FILTER (WHERE response_status >= 400 AND created_at > NOW() - INTERVAL '1 hour') as errors_last_hour,
      AVG(response_time_ms) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')::integer as avg_response_time,
      COUNT(DISTINCT api_key_id) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as unique_api_keys
    FROM developer.api_request_logs
  `);

  const requestsLastHour = parseInt(result[0]?.requests_last_hour || '0');
  const errorsLastHour = parseInt(result[0]?.errors_last_hour || '0');

  return {
    requestsLastHour,
    errorRate: requestsLastHour > 0 ? (errorsLastHour / requestsLastHour) * 100 : 0,
    avgResponseTime: parseInt(result[0]?.avg_response_time || '0'),
    uniqueApiKeys: parseInt(result[0]?.unique_api_keys || '0'),
  };
}
