import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import sql from '@/lib/db';

export async function POST(request: NextRequest) {
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

    const { policyId } = await request.json();

    if (!policyId) {
      return NextResponse.json({ error: 'Policy ID is required.' }, { status: 400 });
    }

    // Verify the policy belongs to the user
    const policies = await sql`
      SELECT * FROM policies
      WHERE policy_id = ${policyId} AND creator_id = ${walletAddress}
    `;

    if (policies.length === 0) {
      return NextResponse.json({ error: 'Policy not found or you do not have permission to revoke it.' }, { status: 404 });
    }

    // Revoke the policy
    await sql`
      UPDATE policies
      SET status = 'revoked', valid = false
      WHERE policy_id = ${policyId}
    `;

    return NextResponse.json({ success: true, message: 'Link revoked successfully.' });
  } catch (error) {
    console.error('Error revoking policy:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
