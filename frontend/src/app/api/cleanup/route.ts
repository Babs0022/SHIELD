import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import sql from '@/lib/db';

export async function POST(request: NextRequest) {
  // Verify admin authorization
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

    // Check if user is admin
    const adminAddresses = process.env.ADMIN_ADDRESSES?.split(',').map(a => a.toLowerCase()) || [];
    if (!adminAddresses.includes(walletAddress.toLowerCase())) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const now = Math.floor(Date.now() / 1000);

    // 1. Mark expired policies as revoked
    const expiredResult = await sql`
      UPDATE policies
      SET status = 'revoked', valid = false
      WHERE expiry < ${now}
      AND status != 'revoked'
      RETURNING policy_id
    `;

    // 2. Clean up old rate limit entries (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await sql`
      DELETE FROM rate_limits
      WHERE requested_at < ${oneHourAgo}
    `;

    // 3. Get cleanup statistics
    const stats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'revoked') as revoked_count,
        COUNT(*) FILTER (WHERE status = 'active' AND expiry >= ${now}) as active_count,
        COUNT(*) FILTER (WHERE expiry < ${now}) as expired_count
      FROM policies
    `;

    return NextResponse.json({
      success: true,
      cleanup: {
        newlyRevoked: expiredResult.length,
        totalRevoked: parseInt(stats[0].revoked_count),
        totalActive: parseInt(stats[0].active_count),
        totalExpired: parseInt(stats[0].expired_count),
      },
      message: `Cleanup completed. ${expiredResult.length} expired policies marked as revoked.`,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// Also allow GET for cron jobs
export async function GET(request: NextRequest) {
  // Check for cron secret to verify it's a legitimate cron job
  const cronSecret = request.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const now = Math.floor(Date.now() / 1000);

    // Mark expired policies as revoked
    const expiredResult = await sql`
      UPDATE policies
      SET status = 'revoked', valid = false
      WHERE expiry < ${now}
      AND status != 'revoked'
      RETURNING policy_id
    `;

    // Clean up old rate limit entries
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await sql`
      DELETE FROM rate_limits
      WHERE requested_at < ${oneHourAgo}
    `;

    return NextResponse.json({
      success: true,
      newlyRevoked: expiredResult.length,
      message: `Cron cleanup completed. ${expiredResult.length} expired policies marked as revoked.`,
    });
  } catch (error) {
    console.error('Cron cleanup error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
