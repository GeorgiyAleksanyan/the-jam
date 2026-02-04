/**
 * Payout management for challenge prizes
 * POST: Initiate payout to winner(s) - challenge creator or admin only
 * GET: Get payout status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GET /api/challenges/[slug]/payout - Get payout status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { slug } = await params;

  const { data: challenge, error } = await supabaseAdmin
    .from('challenges')
    .select(`
      id, 
      title,
      prize_pool, 
      status,
      payout_tx,
      payout_at,
      winner_agent_id,
      agents:winner_agent_id (id, name, slug, wallet_address, wallet_chain)
    `)
    .eq('slug', slug)
    .single();

  if (error || !challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  return NextResponse.json({
    challenge_id: challenge.id,
    title: challenge.title,
    prize_pool: challenge.prize_pool,
    status: challenge.status,
    payout_tx: challenge.payout_tx,
    payout_at: challenge.payout_at,
    winner: challenge.agents,
    can_payout: challenge.status === 'closed' && challenge.winner_agent_id && !challenge.payout_tx,
  });
}

// POST /api/challenges/[slug]/payout - Initiate payout
// Body: { tx_hash: string } (transaction hash after manual payout)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { slug } = await params;
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get challenge
  const { data: challenge, error: challengeError } = await supabaseAdmin
    .from('challenges')
    .select(`
      id,
      created_by,
      prize_pool,
      status,
      payout_tx,
      winner_agent_id,
      agents:winner_agent_id (id, name, wallet_address, wallet_chain)
    `)
    .eq('slug', slug)
    .single();

  if (challengeError || !challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  // Only creator can initiate payout
  if (challenge.created_by !== user.id) {
    return NextResponse.json({ error: 'Only challenge creator can initiate payout' }, { status: 403 });
  }

  // Validate payout conditions
  if (challenge.status !== 'closed') {
    return NextResponse.json({ error: 'Challenge must be closed before payout' }, { status: 400 });
  }

  if (!challenge.winner_agent_id) {
    return NextResponse.json({ error: 'No winner selected for this challenge' }, { status: 400 });
  }

  if (challenge.payout_tx) {
    return NextResponse.json({ error: 'Payout already completed', tx: challenge.payout_tx }, { status: 400 });
  }

  const winner = challenge.agents as any;
  if (!winner?.wallet_address) {
    return NextResponse.json({ error: 'Winner has no wallet address configured' }, { status: 400 });
  }

  const body = await request.json();
  const { tx_hash } = body;

  if (!tx_hash) {
    // Return payout instructions (no tx yet)
    return NextResponse.json({
      action: 'payout_required',
      prize_pool: challenge.prize_pool,
      winner: {
        name: winner.name,
        wallet_address: winner.wallet_address,
        wallet_chain: winner.wallet_chain,
      },
      instructions: `Send ${challenge.prize_pool} USDC to ${winner.wallet_address} on ${winner.wallet_chain}, then submit the tx_hash.`,
    });
  }

  // Record payout
  const { error: updateError } = await supabaseAdmin
    .from('challenges')
    .update({
      payout_tx: tx_hash,
      payout_at: new Date().toISOString(),
    })
    .eq('id', challenge.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Update winner's submission
  await supabaseAdmin
    .from('submissions')
    .update({
      payout_amount: challenge.prize_pool,
      payout_tx: tx_hash,
    })
    .eq('challenge_id', challenge.id)
    .eq('is_winner', true);

  // Update metrics
  await supabaseAdmin.rpc('increment_metric', {
    metric_name: 'total_prize_paid',
    increment_by: challenge.prize_pool,
  });

  return NextResponse.json({
    success: true,
    payout_tx: tx_hash,
    amount: challenge.prize_pool,
    winner: winner.name,
  });
}
