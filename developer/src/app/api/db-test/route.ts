import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { queryWithRetry } from '@/lib/db-retry';

export async function GET() {
  const start = Date.now();

  try {
    // Test 1: Check connection (with retry for cold starts)
    const [connectionTest] = await queryWithRetry<any[]>(
      () => sql`SELECT 1 as connected`,
      10 // More retries for health check
    );

    // Test 2: Check database version
    const [versionResult] = await sql`SELECT version()`;

    // Test 3: Check current database
    const [dbResult] = await sql`SELECT current_database() as database`;

    // Test 4: Check tables in developer schema
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'developer'
      ORDER BY table_name
    `;

    const latency = Date.now() - start;

    return NextResponse.json({
      success: true,
      connected: connectionTest?.connected === 1,
      version: versionResult?.version,
      database: dbResult?.database,
      tables: tables.map((t: any) => t.table_name),
      latencyMs: latency,
      envCheck: {
        hasPostgresUrl: !!process.env.POSTGRES_URL,
        urlPrefix: process.env.POSTGRES_URL?.substring(0, 50) + '...'
      }
    });
  } catch (error) {
    console.error('Database test failed:', error);
    const latency = Date.now() - start;
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: latency,
      envCheck: {
        hasPostgresUrl: !!process.env.POSTGRES_URL,
        urlPrefix: process.env.POSTGRES_URL?.substring(0, 50) + '...'
      }
    }, { status: 500 });
  }
}
