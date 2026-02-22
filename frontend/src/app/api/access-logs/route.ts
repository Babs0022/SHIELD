import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { z } from 'zod';

const logSchema = z.object({
  policyId: z.string(),
  recipientAddress: z.string(),
  success: z.boolean(),
  ipAddress: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = logSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
    }

    const { policyId, recipientAddress, success } = validation.data;

    // Get IP address from headers
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';

    await sql`
      INSERT INTO access_logs (policy_id, recipient_address, success, ip_address, accessed_at)
      VALUES (${policyId}, ${recipientAddress}, ${success}, ${ipAddress}, CURRENT_TIMESTAMP)
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging access:', error);
    return NextResponse.json({ error: 'Failed to log access.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const policyId = searchParams.get('policyId');

    if (!policyId) {
      return NextResponse.json({ error: 'Policy ID is required.' }, { status: 400 });
    }

    const logs = await sql`
      SELECT * FROM access_logs
      WHERE policy_id = ${policyId}
      ORDER BY accessed_at DESC
    `;

    const stats = await sql`
      SELECT
        COUNT(*) as total_views,
        COUNT(CASE WHEN success THEN 1 END) as successful_views,
        MAX(accessed_at) as last_accessed
      FROM access_logs
      WHERE policy_id = ${policyId}
    `;

    return NextResponse.json({ logs, stats: stats[0] });
  } catch (error) {
    console.error('Error fetching access logs:', error);
    return NextResponse.json({ error: 'Failed to fetch access logs.' }, { status: 500 });
  }
}
