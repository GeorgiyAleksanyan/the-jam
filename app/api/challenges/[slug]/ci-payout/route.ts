import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/escrow';
import { withRateLimit } from '@/lib/rate-limit-middleware';

export const dynamic = 'force-dynamic';

/**
 * POST /api/challenges/[slug]/ci-payout
 * 
 * Direct endpoint for CI test workflows / trusted oracles (GitHub Actions)
 * to report test results and trigger automatic winner selection and escrow payout
 * for deterministic challenges.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Rate limit
  const rateLimitResponse = await withRateLimit(request, 'api');
  if (rateLimitResponse) return rateLimitResponse;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { slug } = await params;

  // Verify auth header (Admin API Key or Cron Secret)
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const adminKey = process.env.ADMIN_API_KEY;
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized = 
    (adminKey && token === adminKey) ||
    (cronSecret && token === cronSecret);

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { pr_number, ci_status, test_results, notes } = body;

  if (!pr_number) {
    return NextResponse.json({ error: 'pr_number is required' }, { status: 400 });
  }

  if (!ci_status || !['success', 'failure'].includes(ci_status)) {
    return NextResponse.json({ error: 'ci_status must be either "success" or "failure"' }, { status: 400 });
  }

  // Get challenge details
  const { data: challenge, error: challengeError } = await supabaseAdmin
    .from('challenges')
    .select('id, slug, title, status, prize_pool, winner_agent_id, github_issue_number, github_labels, escrow_challenge_id, is_deterministic')
    .eq('slug', slug)
    .single();

  if (challengeError || !challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  const labels = (challenge.github_labels || []).map((l: string) => l.toLowerCase());
  const isDeterministic = Boolean(
    challenge.is_deterministic ||
    labels.includes('deterministic') ||
    labels.includes('objective') ||
    labels.includes('ci-payout') ||
    labels.includes('auto-win')
  );

  if (!isDeterministic) {
    return NextResponse.json(
      { error: 'CI-based auto-payout is only available for deterministic challenges' },
      { status: 400 }
    );
  }

  // Find submission for this PR
  const { data: submission, error: submissionError } = await supabaseAdmin
    .from('submissions')
    .select(`
      id,
      agent_id,
      status,
      github_pr_number,
      github_pr_state,
      agents:agent_id (id, name, slug, wallet_address, wallet_chain, owner_id)
    `)
    .eq('challenge_id', challenge.id)
    .eq('github_pr_number', pr_number)
    .single();

  if (submissionError || !submission) {
    return NextResponse.json({ error: `Submission for PR #${pr_number} not found` }, { status: 404 });
  }

  // Update submission CI status and logs
  const logMessage = notes || (test_results ? JSON.stringify(test_results) : `CI evaluation: ${ci_status}`);
  await supabaseAdmin
    .from('submissions')
    .update({
      github_ci_status: ci_status,
      logs: logMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', submission.id);

  // If CI failed, do not award payout
  if (ci_status === 'failure') {
    return NextResponse.json({
      success: false,
      status: 'ci_failed',
      message: `CI tests failed for PR #${pr_number}. Winner not selected.`,
    });
  }

  // Check if challenge is already resolved
  if (challenge.winner_agent_id || challenge.status === 'closed' || challenge.status === 'solved') {
    return NextResponse.json({
      success: false,
      status: 'already_resolved',
      message: 'Challenge already has a winner or is closed',
      winner_agent_id: challenge.winner_agent_id,
    });
  }

  if (!submission.agent_id) {
    return NextResponse.json({
      success: false,
      status: 'needs_agent_link',
      error: 'Submission has no linked agent - registration required to claim payout',
    });
  }

  const agent = submission.agents as any;
  const prizePool = challenge.prize_pool || 0;
  const winnerAmount = prizePool * 0.95; // 5% platform fee

  // Create or update pending payout record
  const payoutStatus = agent.wallet_address ? 'pending' : 'no_wallet';

  await supabaseAdmin
    .from('pending_payouts')
    .upsert({
      challenge_id: challenge.id,
      agent_id: submission.agent_id,
      amount: winnerAmount,
      status: payoutStatus,
      attempts: 0,
    }, {
      onConflict: 'challenge_id',
    });

  let payoutResult: { status: string; txHash?: string; error?: string } = { status: payoutStatus };
  const escrowId = challenge.escrow_challenge_id || challenge.id;

  if (agent.wallet_address && prizePool > 0 && process.env.ESCROW_ADMIN_PRIVATE_KEY) {
    try {
      const publicClient = createPublicClient({
        chain: base,
        transport: http('https://mainnet.base.org'),
      });

      const challengeData = await publicClient.readContract({
        address: ESCROW_ADDRESS as `0x${string}`,
        abi: ESCROW_ABI,
        functionName: 'getChallenge',
        args: [BigInt(escrowId)],
      }) as { id: bigint; totalFunding: bigint; status: number; winner: `0x${string}` };

      const pool = challengeData.totalFunding;
      const paid = challengeData.status === 2;
      const refunded = challengeData.status === 3;

      if (pool > BigInt(0) && !paid && !refunded) {
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
          args: [BigInt(escrowId), agent.wallet_address as `0x${string}`],
        });

        await publicClient.waitForTransactionReceipt({ hash });

        payoutResult = { status: 'paid', txHash: hash };

        await supabaseAdmin
          .from('pending_payouts')
          .update({
            status: 'paid',
            tx_hash: hash,
            paid_at: new Date().toISOString(),
          })
          .eq('challenge_id', challenge.id);
      } else if (paid) {
        payoutResult = { status: 'already_paid', error: 'Already paid on-chain' };
      } else {
        payoutResult = { status: 'no_escrow_funds', error: 'No funds in escrow for this challenge' };
      }
    } catch (err) {
      console.error('Escrow payout execution failed:', err);
      payoutResult = {
        status: 'pending',
        error: err instanceof Error ? err.message : 'Escrow payout failed - queued for retry',
      };

      await supabaseAdmin
        .from('pending_payouts')
        .update({
          error: payoutResult.error,
          attempts: 1,
        })
        .eq('challenge_id', challenge.id);
    }
  } else if (!agent.wallet_address) {
    payoutResult.error = 'Winner has no wallet - pending registration';
  } else if (prizePool <= 0) {
    payoutResult = { status: 'no_prize', error: 'Unfunded challenge - no payout required' };
  }

  // Update challenge
  const updateData: any = {
    status: 'closed',
    winner_agent_id: submission.agent_id,
    updated_at: new Date().toISOString(),
  };

  if (payoutResult.txHash) {
    updateData.payout_tx = payoutResult.txHash;
    updateData.payout_at = new Date().toISOString();
  }

  await supabaseAdmin
    .from('challenges')
    .update(updateData)
    .eq('id', challenge.id);

  // Mark submission as winner
  await supabaseAdmin
    .from('submissions')
    .update({ 
      is_winner: true, 
      rank: 1,
      status: 'success',
      updated_at: new Date().toISOString() 
    })
    .eq('id', submission.id);

  // Recalculate stats
  try {
    await supabaseAdmin.rpc('recalc_agent_stats', { p_agent_id: submission.agent_id });
  } catch {
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
          total_earnings: (agentStats.total_earnings || 0) + (payoutResult.status === 'paid' ? winnerAmount : 0),
        })
        .eq('id', submission.agent_id);
    }
  }

  // Notification for winner
  if (agent.owner_id) {
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: agent.owner_id,
        agent_id: agent.id,
        type: payoutResult.status === 'paid' ? 'payout_complete' : 'challenge_won',
        title: payoutResult.status === 'paid' ? '🎉 Deterministic CI Payout Complete!' : '🏆 Deterministic Victory!',
        message: `${agent.name} passed deterministic CI tests and won challenge "${challenge.slug}"! Prize: $${winnerAmount.toFixed(2)} USDC.`,
        data: {
          challenge_id: challenge.id,
          challenge_slug: challenge.slug,
          amount: winnerAmount,
          tx_hash: payoutResult.txHash,
          reason: 'deterministic_ci',
        },
      });
    } catch {
      // Ignore notification errors
    }
  }

  // Post GitHub comment and close issue if configured
  if (challenge.github_issue_number && process.env.GITHUB_TOKEN) {
    try {
      let payoutInfo = '';
      if (payoutResult.txHash) {
        payoutInfo = `\n\n✅ **Payout Complete:** [View on Basescan](https://basescan.org/tx/${payoutResult.txHash})`;
      } else if (payoutResult.status === 'no_wallet') {
        payoutInfo = `\n\n⚠️ **Payout Pending:** Winner needs to [register a wallet](https://the-jam.webglo.org/agents/${agent.slug}/edit)`;
      } else if (payoutResult.status === 'pending') {
        payoutInfo = `\n\n⏳ **Payout Processing:** Will be sent automatically.`;
      }

      await fetch(
        `https://api.github.com/repos/GeorgiyAleksanyan/the-jam/issues/${challenge.github_issue_number}/comments`,
        {
          method: 'POST',
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
            'User-Agent': 'thejam-api',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            body: `## 🏆 Deterministic Challenge Completed via CI!\n\n**Winner:** [${agent.name}](https://the-jam.webglo.org/agents/${agent.slug}) (PR #${pr_number})\n**Prize:** $${prizePool} USDC (Winner receives $${winnerAmount.toFixed(2)} after 5% platform fee)\n**Evaluation:** Automated CI pass (deterministic criteria confirmed)${payoutInfo}\n\nCongratulations! 🎉`,
          }),
        }
      );

      await fetch(
        `https://api.github.com/repos/GeorgiyAleksanyan/the-jam/issues/${challenge.github_issue_number}`,
        {
          method: 'PATCH',
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
            'User-Agent': 'thejam-api',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            state: 'closed',
            state_reason: 'completed',
          }),
        }
      );
    } catch (err) {
      console.error('Failed to update GitHub issue:', err);
    }
  }

  return NextResponse.json({
    success: true,
    action: 'winner_selected_and_paid',
    winner: {
      agent_id: submission.agent_id,
      name: agent.name,
      slug: agent.slug,
      wallet_address: agent.wallet_address,
    },
    prize_pool: prizePool,
    winner_amount: winnerAmount,
    payout: payoutResult,
    explorer_url: payoutResult.txHash ? `https://basescan.org/tx/${payoutResult.txHash}` : null,
  });
}
