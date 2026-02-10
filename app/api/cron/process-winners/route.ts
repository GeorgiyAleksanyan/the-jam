import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/escrow';

const VOTING_DURATION_HOURS = 72; // Default voting period
const MAX_PAYOUT_ATTEMPTS = 3;

interface ProcessResult {
  votingEnded: number;
  payoutsProcessed: number;
  payoutsFailed: number;
  errors: string[];
}

/**
 * Process challenges with ended voting periods
 * Selects winner based on vote count
 */
async function processEndedVotingPeriods(): Promise<{ processed: number; errors: string[] }> {
  if (!supabaseAdmin) {
    return { processed: 0, errors: ['Database not configured'] };
  }

  const errors: string[] = [];
  let processed = 0;

  // Find challenges in voting status where voting period has ended
  const now = new Date().toISOString();

  const { data: challenges } = await supabaseAdmin
    .from('challenges')
    .select('id, slug, prize_pool, voting_start_at, voting_end_at, escrow_challenge_id')
    .eq('status', 'voting')
    .lt('voting_end_at', now);

  if (!challenges || challenges.length === 0) {
    return { processed: 0, errors: [] };
  }

  for (const challenge of challenges) {
    try {
      // Get submissions with vote counts
      const { data: submissions } = await supabaseAdmin
        .from('submissions')
        .select(`
          id,
          agent_id,
          vote_count,
          github_pr_state,
          agents:agent_id (id, name, slug, wallet_address, owner_id)
        `)
        .eq('challenge_id', challenge.id)
        .eq('github_pr_state', 'merged')
        .order('vote_count', { ascending: false })
        .limit(1);

      if (!submissions || submissions.length === 0) {
        // No valid submissions - close without winner
        await supabaseAdmin
          .from('challenges')
          .update({
            status: 'closed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', challenge.id);

        errors.push(`Challenge ${challenge.slug}: No valid submissions - closed without winner`);
        continue;
      }

      const winner = submissions[0];
      const agent = winner.agents as any;
      const prizePool = challenge.prize_pool || 0;
      const winnerAmount = prizePool * 0.95;

      // Create pending payout
      const payoutStatus = agent?.wallet_address ? 'pending' : 'no_wallet';

      await supabaseAdmin
        .from('pending_payouts')
        .upsert({
          challenge_id: challenge.id,
          agent_id: winner.agent_id,
          amount: winnerAmount,
          status: payoutStatus,
          attempts: 0,
        }, {
          onConflict: 'challenge_id',
        });

      // Update challenge
      await supabaseAdmin
        .from('challenges')
        .update({
          status: 'closed',
          winner_agent_id: winner.agent_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', challenge.id);

      // Mark submission as winner
      await supabaseAdmin
        .from('submissions')
        .update({ is_winner: true, rank: 1 })
        .eq('id', winner.id);

      // Update agent stats
      if (winner.agent_id) {
        try {
          await supabaseAdmin.rpc('recalc_agent_stats', { p_agent_id: winner.agent_id });
        } catch {
          // Fallback manual update
          const { data: stats } = await supabaseAdmin
            .from('agents')
            .select('total_wins')
            .eq('id', winner.agent_id)
            .single();

          if (stats) {
            await supabaseAdmin
              .from('agents')
              .update({ total_wins: (stats.total_wins || 0) + 1 })
              .eq('id', winner.agent_id);
          }
        }
      }

      // Create notification
      if (agent?.owner_id) {
        try {
          await supabaseAdmin.from('notifications').insert({
            user_id: agent.owner_id,
            agent_id: agent.id,
            type: 'challenge_won',
            title: '🏆 Voting Complete - You Won!',
            message: `${agent.name} won the community vote for "${challenge.slug}"! Prize: $${winnerAmount.toFixed(2)} USDC.`,
            data: {
              challenge_id: challenge.id,
              challenge_slug: challenge.slug,
              amount: winnerAmount,
              selection: 'voting',
            },
          });
        } catch {
          // Ignore notification errors
        }
      }

      processed++;
    } catch (err) {
      errors.push(`Challenge ${challenge.slug}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return { processed, errors };
}

/**
 * Process pending payouts - retry failed ones and process new ones
 */
async function processPendingPayouts(): Promise<{ processed: number; failed: number; errors: string[] }> {
  if (!supabaseAdmin || !process.env.ESCROW_ADMIN_PRIVATE_KEY) {
    return { processed: 0, failed: 0, errors: ['Not configured'] };
  }

  const errors: string[] = [];
  let processed = 0;
  let failed = 0;

  // Get pending payouts that haven't exceeded max attempts
  const { data: payouts } = await supabaseAdmin
    .from('pending_payouts')
    .select(`
      id,
      challenge_id,
      agent_id,
      amount,
      status,
      attempts,
      agents:agent_id (id, name, slug, wallet_address, owner_id),
      challenges:challenge_id (id, slug, escrow_challenge_id, prize_pool)
    `)
    .in('status', ['pending', 'retry'])
    .lt('attempts', MAX_PAYOUT_ATTEMPTS);

  if (!payouts || payouts.length === 0) {
    return { processed: 0, failed: 0, errors: [] };
  }

  const publicClient = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org'),
  });

  const account = privateKeyToAccount(process.env.ESCROW_ADMIN_PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http('https://mainnet.base.org'),
  });

  for (const payout of payouts) {
    const agent = payout.agents as any;
    const challenge = payout.challenges as any;

    if (!agent?.wallet_address) {
      // Still no wallet - skip but don't count as failure
      continue;
    }

    const escrowId = challenge?.escrow_challenge_id || payout.challenge_id;

    try {
      // Check on-chain status
      const challengeData = await publicClient.readContract({
        address: ESCROW_ADDRESS as `0x${string}`,
        abi: ESCROW_ABI,
        functionName: 'getChallenge',
        args: [BigInt(escrowId)],
      }) as { id: bigint; totalFunding: bigint; status: number; winner: `0x${string}` };

      const pool = challengeData.totalFunding;
      const paid = challengeData.status === 2;
      const refunded = challengeData.status === 3;

      if (paid) {
        // Already paid - update status
        await supabaseAdmin
          .from('pending_payouts')
          .update({
            status: 'paid',
            updated_at: new Date().toISOString(),
          })
          .eq('id', payout.id);

        processed++;
        continue;
      }

      if (refunded || pool === BigInt(0)) {
        // No funds available
        await supabaseAdmin
          .from('pending_payouts')
          .update({
            status: 'no_funds',
            error: 'No funds in escrow',
            updated_at: new Date().toISOString(),
          })
          .eq('id', payout.id);

        failed++;
        errors.push(`Payout ${payout.id}: No funds in escrow for challenge ${escrowId}`);
        continue;
      }

      // Execute payout
      const hash = await walletClient.writeContract({
        address: ESCROW_ADDRESS as `0x${string}`,
        abi: ESCROW_ABI,
        functionName: 'payWinner',
        args: [BigInt(escrowId), agent.wallet_address as `0x${string}`],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      // Update payout record
      await supabaseAdmin
        .from('pending_payouts')
        .update({
          status: 'paid',
          tx_hash: hash,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', payout.id);

      // Update challenge
      await supabaseAdmin
        .from('challenges')
        .update({
          payout_tx: hash,
          payout_at: new Date().toISOString(),
        })
        .eq('id', payout.challenge_id);

      // Update agent earnings
      if (payout.agent_id) {
        try {
          await supabaseAdmin.rpc('recalc_agent_stats', { p_agent_id: payout.agent_id });
        } catch {
          const { data: stats } = await supabaseAdmin
            .from('agents')
            .select('total_earnings')
            .eq('id', payout.agent_id)
            .single();

          if (stats) {
            await supabaseAdmin
              .from('agents')
              .update({ total_earnings: (stats.total_earnings || 0) + payout.amount })
              .eq('id', payout.agent_id);
          }
        }
      }

      // Send notification
      if (agent?.owner_id) {
        try {
          await supabaseAdmin.from('notifications').insert({
            user_id: agent.owner_id,
            agent_id: agent.id,
            type: 'payout_complete',
            title: '💰 Payout Complete!',
            message: `$${payout.amount.toFixed(2)} USDC has been sent to your wallet for "${challenge?.slug}".`,
            data: {
              challenge_id: payout.challenge_id,
              amount: payout.amount,
              tx_hash: hash,
            },
          });
        } catch {
          // Ignore notification errors
        }
      }

      processed++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';

      // Update attempt count
      await supabaseAdmin
        .from('pending_payouts')
        .update({
          status: 'retry',
          error: errorMsg,
          attempts: (payout.attempts || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payout.id);

      if ((payout.attempts || 0) + 1 >= MAX_PAYOUT_ATTEMPTS) {
        await supabaseAdmin
          .from('pending_payouts')
          .update({ status: 'failed' })
          .eq('id', payout.id);
        failed++;
      }

      errors.push(`Payout ${payout.id}: ${errorMsg}`);
    }
  }

  return { processed, failed, errors };
}

// POST /api/cron/process-winners
// Should be called by Vercel Cron or external scheduler every 30 minutes
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.ADMIN_API_KEY;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result: ProcessResult = {
    votingEnded: 0,
    payoutsProcessed: 0,
    payoutsFailed: 0,
    errors: [],
  };

  try {
    // Process ended voting periods
    const votingResult = await processEndedVotingPeriods();
    result.votingEnded = votingResult.processed;
    result.errors.push(...votingResult.errors);

    // Process pending payouts
    const payoutResult = await processPendingPayouts();
    result.payoutsProcessed = payoutResult.processed;
    result.payoutsFailed = payoutResult.failed;
    result.errors.push(...payoutResult.errors);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
        ...result,
      },
      { status: 500 }
    );
  }
}

// GET - Status check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'process-winners',
    description: 'Processes ended voting periods and retries pending payouts',
    schedule: 'Every 30 minutes',
    config: {
      votingDurationHours: VOTING_DURATION_HOURS,
      maxPayoutAttempts: MAX_PAYOUT_ATTEMPTS,
    },
  });
}
