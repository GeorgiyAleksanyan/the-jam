/**
 * Contribute to a challenge's prize pool
 * GET: List contributions for a challenge
 * POST: Add a contribution (requires wallet signature)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GET /api/challenges/[slug]/contributions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { slug } = await params;

  // Get challenge
  const { data: challenge, error: challengeError } = await supabaseAdmin
    .from('challenges')
    .select('id, prize_pool')
    .eq('slug', slug)
    .single();

  if (challengeError || !challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  // Get contributions
  const { data: contributions, error } = await supabaseAdmin
    .from('challenge_contributions')
    .select(`
      id,
      amount,
      token,
      chain,
      tx_hash,
      created_at,
      profiles:contributor_id (display_name, avatar_url, username),
      agents:contributor_agent (name, slug, avatar_url)
    `)
    .eq('challenge_id', challenge.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    prize_pool: challenge.prize_pool,
    contributions: contributions || [],
    total_contributors: new Set(contributions?.map(c => c.profiles || c.agents)).size,
  });
}

// POST /api/challenges/[slug]/contributions
// Body: { amount: number, token: string, chain: string, tx_hash: string, wallet_address: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { slug } = await params;
  const authHeader = request.headers.get('authorization');

  // Auth is optional for contributions (can contribute without account)
  let userId: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  }

  const body = await request.json();
  const { amount, token, chain, tx_hash, wallet_address } = body;

  // Validate required fields
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Valid amount required' }, { status: 400 });
  }
  if (!token) {
    return NextResponse.json({ error: 'Token type required (e.g., USDC)' }, { status: 400 });
  }
  if (!chain || !['solana', 'base', 'ethereum'].includes(chain)) {
    return NextResponse.json({ error: 'Valid chain required (solana, base, ethereum)' }, { status: 400 });
  }
  if (!tx_hash) {
    return NextResponse.json({ error: 'Transaction hash required' }, { status: 400 });
  }
  if (!wallet_address) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
  }

  // Get challenge
  const { data: challenge, error: challengeError } = await supabaseAdmin
    .from('challenges')
    .select('id, prize_pool, status')
    .eq('slug', slug)
    .single();

  if (challengeError || !challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  // Can only contribute to open/active challenges
  if (!['open', 'active', 'draft'].includes(challenge.status)) {
    return NextResponse.json({ error: 'Challenge is not accepting contributions' }, { status: 400 });
  }

  // Check for duplicate tx_hash
  const { data: existing } = await supabaseAdmin
    .from('challenge_contributions')
    .select('id')
    .eq('tx_hash', tx_hash)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Transaction already recorded' }, { status: 409 });
  }

  // Insert contribution
  const { data: contribution, error: insertError } = await supabaseAdmin
    .from('challenge_contributions')
    .insert({
      challenge_id: challenge.id,
      contributor_id: userId,
      amount,
      token,
      chain,
      tx_hash,
      wallet_address,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Update challenge prize pool
  const newPrizePool = (challenge.prize_pool || 0) + amount;
  await supabaseAdmin
    .from('challenges')
    .update({ prize_pool: newPrizePool })
    .eq('id', challenge.id);

  return NextResponse.json({
    contribution,
    new_prize_pool: newPrizePool,
  });
}
