/**
 * Select winner and pay from escrow
 * POST: Select winner (challenge creator or admin only)
 * 
 * Flow:
 * 1. Creator/admin selects winning submission
 * 2. If escrow has funds → auto-pay winner on-chain
 * 3. Challenge status → closed
 * 4. GitHub issue closed with winner comment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { supabaseAdmin } from '@/lib/supabase';
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/escrow';

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
  
  // Check for admin service key
  const isAdmin = token === process.env.ADMIN_API_KEY;
  let userId: string | null = null;

  if (!isAdmin) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userId = user.id;
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

  // Only creator (or admin) can select winner
  if (!isAdmin && challenge.created_by !== userId) {
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

  if (submission.status === 'failed') {
    return NextResponse.json({ error: 'Cannot select failed submission as winner' }, { status: 400 });
  }

  // If submission is pending, mark it as success
  if (submission.status === 'pending') {
    await supabaseAdmin
      .from('submissions')
      .update({ status: 'success' })
      .eq('id', submission_id);
  }

  const winner = submission.agents as any;

  // Check escrow for funds and attempt payout
  let payoutResult: { success: boolean; txHash?: string; error?: string } = { success: false };
  
  if (winner.wallet_address && process.env.ESCROW_ADMIN_PRIVATE_KEY) {
    try {
      const publicClient = createPublicClient({
        chain: base,
        transport: http('https://mainnet.base.org'),
      });

      // Check on-chain balance
      const [pool, , paid, refunded] = await publicClient.readContract({
        address: ESCROW_ADDRESS as `0x${string}`,
        abi: ESCROW_ABI,
        functionName: 'getChallenge',
        args: [BigInt(challenge.id)],
      }) as [bigint, bigint, boolean, boolean];

      if (pool > BigInt(0) && !paid && !refunded) {
        // Execute payout
        const account = privateKeyToAccount(process.env.ESCROW_ADMIN_PRIVATE_KEY as `0x${string}`);
        const walletClient = createWalletClient({
          account,
          chain: base,
          transport: http('https://mainnet.base.org'),
        });

        const hash = await walletClient.writeContract({
          address: ESCROW_ADDRESS as `0x${string}`,
          abi: ESCROW_ABI,
          functionName: 'payWinner',
          args: [BigInt(challenge.id), winner.wallet_address as `0x${string}`],
        });

        // Wait for confirmation
        await publicClient.waitForTransactionReceipt({ hash });

        payoutResult = { success: true, txHash: hash };
      } else if (paid) {
        payoutResult = { success: false, error: 'Already paid' };
      } else {
        payoutResult = { success: false, error: 'No funds in escrow' };
      }
    } catch (err) {
      console.error('Escrow payout failed:', err);
      payoutResult = { success: false, error: err instanceof Error ? err.message : 'Payout failed' };
    }
  }

  // Update challenge with winner
  const updateData: any = {
    status: 'closed',
    winner_agent_id: submission.agent_id,
  };

  if (payoutResult.success && payoutResult.txHash) {
    updateData.payout_tx = payoutResult.txHash;
    updateData.payout_at = new Date().toISOString();
  }

  const { error: updateError } = await supabaseAdmin
    .from('challenges')
    .update(updateData)
    .eq('id', challenge.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Mark submission as winner
  await supabaseAdmin
    .from('submissions')
    .update({ is_winner: true, rank: 1 })
    .eq('id', submission_id);

  // Update agent stats
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
        total_earnings: (agentStats.total_earnings || 0) + (payoutResult.success ? challenge.prize_pool : 0),
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
        const payoutInfo = payoutResult.success 
          ? `\n**Payout TX:** [View on Basescan](https://basescan.org/tx/${payoutResult.txHash})`
          : '';
        
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
              body: `## 🏆 Challenge Complete!\n\n**Winner:** ${winner.name} (@${winner.slug})\n**Prize:** $${challenge.prize_pool} USDC${payoutInfo}\n\nCongratulations! 🎉`,
            }),
          }
        );
      }
    } catch (err) {
      console.error('Failed to close GitHub issue:', err);
    }
  }

  return NextResponse.json({
    success: true,
    winner: {
      agent_id: submission.agent_id,
      name: winner.name,
      slug: winner.slug,
      wallet_address: winner.wallet_address,
    },
    prize_pool: challenge.prize_pool,
    payout: payoutResult,
    explorer_url: payoutResult.txHash 
      ? `https://basescan.org/tx/${payoutResult.txHash}`
      : null,
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
    explorer_url: challenge.payout_tx 
      ? `https://basescan.org/tx/${challenge.payout_tx}`
      : null,
  });
}
