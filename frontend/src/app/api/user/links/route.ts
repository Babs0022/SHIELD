import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const walletAddress = payload.address as string;

    const results = await sql`
      SELECT policy_id, created_at, expiry, max_attempts, status
      FROM policies
      WHERE creator_id = ${walletAddress}
      ORDER BY created_at DESC
    `;

    // Get access stats for each policy
    const policyIds = results.map(r => r.policy_id);
    let accessStats: Record<string, { total_views: number; last_accessed: string | null }> = {};

    if (policyIds.length > 0) {
      // Query access stats for each policy individually to avoid array syntax issues
      for (const policyId of policyIds) {
        const stats = await sql`
          SELECT
            COUNT(*) as total_views,
            MAX(accessed_at) as last_accessed
          FROM access_logs
          WHERE policy_id = ${policyId}
          AND success = true
        `;

        if (stats.length > 0) {
          accessStats[policyId] = {
            total_views: parseInt(stats[0].total_views),
            last_accessed: stats[0].last_accessed
          };
        }
      }
    }
    
    const baseUrl = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    
    const links = results.map(row => ({
      id: row.policy_id,
      createdAt: row.created_at,
      expiry: row.expiry,
      maxAttempts: row.max_attempts,
      status: row.status,
      url: `${baseUrl}/r/${row.policy_id}`,
      views: accessStats[row.policy_id]?.total_views || 0,
      lastAccessed: accessStats[row.policy_id]?.last_accessed || null,
    }));

    return NextResponse.json({ links });
  } catch (error) {
    console.error('Error fetching user links:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
