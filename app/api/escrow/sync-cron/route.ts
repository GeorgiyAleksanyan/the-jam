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
 * GET /api/escrow/sync-cron
 * Called by Vercel Cron every 5 minutes
 * Syncs on-chain escrow balances to the database
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate Vercel cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Also allow if no CRON_SECRET is set (for testing)
      if (process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
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
        
        // Update if different (with small epsilon for float comparison)
        if (Math.abs(onChainPool - (challenge.prize_pool || 0)) > 0.001) {
          await supabaseAdmin
            .from('challenges')
            .update({ prize_pool: onChainPool })
            .eq('id', challenge.id);

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
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
