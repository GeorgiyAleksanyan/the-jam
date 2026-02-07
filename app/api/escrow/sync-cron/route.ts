import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/escrow';
import { supabaseAdmin } from '@/lib/supabase';

// Use a more reliable RPC with fallback
const RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

const publicClient = createPublicClient({
  chain: base,
  transport: http(RPC_URL),
});

// Rate limit delay (ms between calls)
const RATE_LIMIT_DELAY = 500;

// Sleep helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * GET /api/escrow/sync-cron
 * Called by Vercel Cron every 5 minutes
 * Syncs on-chain escrow balances to the database
 * 
 * Optimization: Only syncs challenges that have prize_pool > 0 (funded)
 * to avoid hitting rate limits on unfunded challenges that don't exist on-chain.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate Vercel cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret) {
      const isValidAuth = 
        authHeader === `Bearer ${cronSecret}` || 
        authHeader === cronSecret;
      
      if (!isValidAuth) {
        console.error('Escrow sync auth failed. Header present:', !!authHeader);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // OPTIMIZATION: Only get funded challenges (prize_pool > 0)
    // Unfunded challenges don't exist on-chain and will revert
    const { data: challenges, error } = await supabaseAdmin
      .from('challenges')
      .select('id, slug, prize_pool')
      .gt('prize_pool', 0)  // Only funded challenges
      .order('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const updates: Array<{ id: number; slug: string; oldPool: number; newPool: number }> = [];
    const errors: Array<{ id: number; error: string }> = [];

    // Check each funded challenge's on-chain balance with rate limiting
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
        
        // Rate limit: wait between calls to avoid 429
        await sleep(RATE_LIMIT_DELAY);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        
        // Check if it's a "challenge doesn't exist" error (reverts)
        // This shouldn't happen now since we only query funded challenges,
        // but handle gracefully just in case
        if (errorMessage.includes('revert') || errorMessage.includes('execution reverted')) {
          console.warn(`Challenge ${challenge.id} not found on-chain (DB has ${challenge.prize_pool} USDC) - possible ID mismatch`);
          errors.push({ id: challenge.id, error: 'Not found on-chain' });
        } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
          console.error(`Rate limited on challenge ${challenge.id}, backing off...`);
          errors.push({ id: challenge.id, error: 'Rate limited' });
          // Extra delay on rate limit
          await sleep(RATE_LIMIT_DELAY * 4);
        } else {
          console.error(`Failed to sync challenge ${challenge.id}:`, err);
          errors.push({ id: challenge.id, error: errorMessage });
        }
      }
    }

    return NextResponse.json({
      success: true,
      funded_challenges: challenges?.length || 0,
      synced: updates.length,
      updates,
      errors: errors.length > 0 ? errors : undefined,
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
