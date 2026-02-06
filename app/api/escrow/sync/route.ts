import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/escrow';
import { supabaseAdmin } from '@/lib/supabase';

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

/**
 * POST /api/escrow/sync
 * Syncs on-chain escrow balances to the database
 * Auth: Admin API key required
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Invalid admin key' }, { status: 403 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get all challenges
    const { data: challenges, error } = await supabaseAdmin
      .from('challenges')
      .select('id, slug, prize_pool')
      .order('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const updates: Array<{ id: number; slug: string; oldPool: number; newPool: number }> = [];

    // Check each challenge's on-chain balance
    for (const challenge of challenges || []) {
      try {
        const [pool] = await publicClient.readContract({
          address: ESCROW_ADDRESS as `0x${string}`,
          abi: ESCROW_ABI,
          functionName: 'getChallenge',
          args: [BigInt(challenge.id)],
        }) as [bigint, bigint, boolean, boolean];

        const onChainPool = parseFloat(formatUnits(pool, 6));
        
        // Update if different
        if (Math.abs(onChainPool - (challenge.prize_pool || 0)) > 0.001) {
          await supabaseAdmin
            .from('challenges')
            .update({ prize_pool: onChainPool, updated_at: new Date().toISOString() })
            .eq('id', challenge.id);

          // Explicitly check status transition (backup for DB trigger)
          await supabaseAdmin.rpc('check_challenge_status_transition', { p_challenge_id: challenge.id });

          updates.push({
            id: challenge.id,
            slug: challenge.slug,
            oldPool: challenge.prize_pool || 0,
            newPool: onChainPool,
          });
        }
      } catch (err) {
        console.error(`Failed to sync challenge ${challenge.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      synced: updates.length,
      updates,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/escrow/sync
 * Get sync status (no auth required)
 */
export async function GET() {
  return NextResponse.json({
    escrowAddress: ESCROW_ADDRESS,
    network: 'base-sepolia',
    message: 'POST with admin auth to sync balances',
  });
}
