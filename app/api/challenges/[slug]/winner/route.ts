/**
 * Select winner and close challenge
 * POST: Select winner (challenge creator only)
 * 
 * Flow:
 * 1. Creator selects winning submission
 * 2. Challenge status → closed
 * 3. GitHub issue gets closed with winner comment
 * 4. Creator manually sends payout
 * 5. Creator records tx_hash via /payout endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// POST /api/challenges/[slug]/winner - Select winner
// Body: { submission_id: number }
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
    .select('id, created_by, status, prize_pool, github_issue_id, winner_agent_id')
    .eq('slug', slug)
    .single();

  if (challengeError || !challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  // Only creator can select winner
  if (challenge.created_by !== user.id) {
    return NextResponse.json({ error: 'Only challenge creator can select winner' }, { status: 403 });
  }

  // Challenge must be open/active
  if (!['open', 'active', 'voting'].includes(challenge.status)) {
    return NextResponse.json({ error: 'Challenge is already closed' }, { status: 400 });
  }

  if (challenge.winner_agent_id) {
    return NextResponse.json({ error: 'Winner already selected' }, { status: 400 });
  }

  const body = await request.json();
  const { submission_id } = body;

  if (!submission_id) {
    return NextResponse.json({ error: 'submission_id is required' }, { status: 400 });
  }

  // Get submission
  const { data: submission, error: submissionError } = await supabaseAdmin
    .from('submissions')
    .select(`
      id,
      agent_id,
      status,
      agents:agent_id (id, name, slug, wallet_address, wallet_chain)
    `)
    .eq('id', submission_id)
    .eq('challenge_id', challenge.id)
    .single();

  if (submissionError || !submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  if (submission.status !== 'success') {
    return NextResponse.json({ error: 'Cannot select failed submission as winner' }, { status: 400 });
  }

  const winner = submission.agents as any;

  // Update challenge with winner
  const { error: updateError } = await supabaseAdmin
    .from('challenges')
    .update({
      status: 'closed',
      winner_agent_id: submission.agent_id,
    })
    .eq('id', challenge.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Mark submission as winner
  await supabaseAdmin
    .from('submissions')
    .update({ is_winner: true, rank: 1 })
    .eq('id', submission_id);

  // Update agent stats - increment wins and earnings
  // Note: Supabase doesn't have atomic increment in update, so we fetch + update
  const { data: agentStats } = await supabaseAdmin
    .from('agents')
    .select('total_wins, total_earnings')
    .eq('id', submission.agent_id)
    .single();

  if (agentStats) {
    await supabaseAdmin
      .from('agents')
      .update({
        total_wins: (agentStats.total_wins || 0) + 1,
        total_earnings: (agentStats.total_earnings || 0) + challenge.prize_pool,
      })
      .eq('id', submission.agent_id);
  }

  // Close GitHub issue if linked
  if (challenge.github_issue_id && process.env.GITHUB_TOKEN) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/GeorgiyAleksanyan/the-jam/issues/${challenge.github_issue_id}`,
        {
          method: 'PATCH',
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
            'User-Agent': 'thejam-api',
          },
          body: JSON.stringify({
            state: 'closed',
            state_reason: 'completed',
          }),
        }
      );

      // Add winner comment
      if (response.ok) {
        await fetch(
          `https://api.github.com/repos/GeorgiyAleksanyan/the-jam/issues/${challenge.github_issue_id}/comments`,
          {
            method: 'POST',
            headers: {
              'Accept': 'application/vnd.github+json',
              'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
              'User-Agent': 'thejam-api',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              body: `## 🏆 Challenge Complete!\n\n**Winner:** ${winner.name} (@${winner.slug})\n**Prize:** ${challenge.prize_pool} USDC\n\nCongratulations! 🎉`,
            }),
          }
        );
      }
    } catch (err) {
      console.error('Failed to close GitHub issue:', err);
      // Don't fail the request if GitHub update fails
    }
  }

  return NextResponse.json({
    success: true,
    winner: {
      agent_id: submission.agent_id,
      name: winner.name,
      slug: winner.slug,
      wallet_address: winner.wallet_address,
      wallet_chain: winner.wallet_chain,
    },
    prize_pool: challenge.prize_pool,
    next_step: winner.wallet_address 
      ? `Send ${challenge.prize_pool} USDC to ${winner.wallet_address}, then record tx via /api/challenges/${slug}/payout`
      : 'Winner has no wallet configured - contact them to set up payout',
  });
}

// GET /api/challenges/[slug]/winner - Get winner info
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
      status,
      prize_pool,
      payout_tx,
      payout_at,
      winner_agent_id,
      agents:winner_agent_id (id, name, slug, avatar_url)
    `)
    .eq('slug', slug)
    .single();

  if (error || !challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  if (!challenge.winner_agent_id) {
    return NextResponse.json({ winner: null, status: challenge.status });
  }

  return NextResponse.json({
    winner: challenge.agents,
    prize_pool: challenge.prize_pool,
    payout_tx: challenge.payout_tx,
    payout_at: challenge.payout_at,
    paid: !!challenge.payout_tx,
  });
}
