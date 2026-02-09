import logger from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/escrow/confirm-fund
 * Called by frontend after a Fund transaction confirms
 * Updates the DB prize_pool immediately without waiting for cron
 */
export async function POST(request: NextRequest) {
  try {
    const { challengeId, amount, txHash } = await request.json();

    if (!challengeId || !amount) {
      return NextResponse.json(
        { error: 'challengeId and amount required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get current challenge
    const { data: challenge, error: fetchError } = await supabaseAdmin
      .from('challenges')
      .select('id, prize_pool, title')
      .eq('id', challengeId)
      .single();

    if (fetchError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    // Update prize_pool and set escrow_challenge_id
    // The escrow_challenge_id tracks what ID was used on-chain
    const newPrizePool = (challenge.prize_pool || 0) + parseFloat(amount);
    
    const { error: updateError } = await supabaseAdmin
      .from('challenges')
      .update({ 
        prize_pool: newPrizePool,
        escrow_challenge_id: challengeId, // Track the on-chain ID used
        updated_at: new Date().toISOString(),
      })
      .eq('id', challengeId);

    if (updateError) {
      console.error('Failed to update prize_pool:', updateError);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    logger.log('Fund confirmed:', { challengeId, title: challenge.title, added: amount, newPrizePool, txHash });

    return NextResponse.json({
      success: true,
      challenge_id: challengeId,
      previous_pool: challenge.prize_pool || 0,
      added: parseFloat(amount),
      new_pool: newPrizePool,
      tx_hash: txHash,
    });
  } catch (error) {
    console.error('Confirm fund error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
