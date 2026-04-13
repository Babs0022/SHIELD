import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { queryWithRetry } from '@/lib/db-retry';

/**
 * Health check endpoint that also warms up the Neon database
 * Call this before making important API requests to avoid cold start delays
 */
export async function GET() {
  const start = Date.now();

  try {
    // Simple query to wake up the database
    const result = await queryWithRetry<any[]>(
      () => sql`SELECT 1 as alive`,
      10 // More retries for health check
    );

    const latency = Date.now() - start;

    if (result.length === 1 && result[0].alive === 1) {
      return NextResponse.json({
        status: 'healthy',
        database: 'connected',
        latencyMs: latency,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'unexpected response',
        latencyMs: latency,
      },
      { status: 503 }
    );
  } catch (error) {
    const latency = Date.now() - start;
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: latency,
      },
      { status: 503 }
    );
  }
}
