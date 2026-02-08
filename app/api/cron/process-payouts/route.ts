/**
 * Process Pending Payouts Cron
 * 
 * Runs periodically to:
 * 1. Process payouts where agent has wallet
 * 2. Retry failed payouts (up to max_attempts)
 * 3. Notify agents who need to register wallets
 * 4. Create GitHub issues for stuck payouts
 * 
 * Called by Vercel Cron or manually by admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { supabaseAdmin } from '@/lib/supabase';
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/escrow';

// Verify cron secret or admin key
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = request.headers.get('x-cron-secret');
  
  // Vercel Cron sends this header
  if (cronSecret === process.env.CRON_SECRET) return true;
  
  // Admin API key
  if (authHeader === `Bearer ${process.env.ADMIN_API_KEY}`) return true;
  
  return false;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const results = {
    processed: 0,
    paid: 0,
    failed: 0,
    no_wallet: 0,
    notified: 0,
    errors: [] as string[],
  };

  try {
    // Get pending payouts that are ready to process
    const { data: payouts, error } = await supabaseAdmin
      .from('pending_payouts')
      .select(`
        id,
        challenge_id,
        agent_id,
        amount,
        status,
        attempts,
        max_attempts,
        notified_at,
        agents:agent_id (
          id,
          name,
          slug,
          wallet_address,
          wallet_chain,
          owner_id
        ),
        challenges:challenge_id (
          id,
          title,
          slug,
          github_issue_id
        )
      `)
      .in('status', ['pending', 'no_wallet'])
      .lt('attempts', 3)
      .order('created_at', { ascending: true })
      .limit(10); // Process 10 at a time to avoid timeouts

    if (error) {
      throw new Error(`Failed to fetch payouts: ${error.message}`);
    }

    if (!payouts || payouts.length === 0) {
      return NextResponse.json({ message: 'No pending payouts', ...results });
    }

    // Setup blockchain clients
    const publicClient = createPublicClient({
      chain: base,
      transport: http('https://mainnet.base.org'),
    });

    let walletClient: any = null;
    if (process.env.ESCROW_ADMIN_PRIVATE_KEY) {
      const account = privateKeyToAccount(process.env.ESCROW_ADMIN_PRIVATE_KEY as `0x${string}`);
      walletClient = createWalletClient({
        account,
        chain: base,
        transport: http('https://mainnet.base.org'),
      });
    }

    for (const payout of payouts) {
      results.processed++;
      const agent = payout.agents as any;
      const challenge = payout.challenges as any;

      try {
        // Check if agent has wallet now
        if (!agent?.wallet_address) {
          // No wallet - update status and maybe notify
          await supabaseAdmin
            .from('pending_payouts')
            .update({ 
              status: 'no_wallet',
              attempts: payout.attempts + 1,
            })
            .eq('id', payout.id);

          results.no_wallet++;

          // Notify if not already notified (within last 24h)
          const shouldNotify = !payout.notified_at || 
            new Date(payout.notified_at).getTime() < Date.now() - 24 * 60 * 60 * 1000;

          if (shouldNotify) {
            // Create notification
            if (agent.owner_id) {
              await supabaseAdmin.from('notifications').insert({
                user_id: agent.owner_id,
                agent_id: agent.id,
                type: 'wallet_needed',
                title: '💰 Payout Pending - Wallet Needed',
                message: `Your agent "${agent.name}" won "${challenge.title}" but doesn't have a wallet registered. Add a wallet to receive $${payout.amount} USDC!`,
                data: {
                  challenge_id: challenge.id,
                  challenge_slug: challenge.slug,
                  amount: payout.amount,
                },
              });
            }

            // Create/update GitHub issue if linked
            if (challenge.github_issue_id && process.env.GITHUB_TOKEN) {
              await createWalletNeededComment(challenge, agent, payout.amount);
            }

            await supabaseAdmin
              .from('pending_payouts')
              .update({ notified_at: new Date().toISOString() })
              .eq('id', payout.id);

            results.notified++;
          }

          continue;
        }

        // Has wallet - attempt payout
        if (!walletClient) {
          throw new Error('Escrow admin key not configured');
        }

        // Mark as processing
        await supabaseAdmin
          .from('pending_payouts')
          .update({ status: 'processing' })
          .eq('id', payout.id);

        // Check on-chain escrow status
        const challengeData = await publicClient.readContract({
          address: ESCROW_ADDRESS as `0x${string}`,
          abi: ESCROW_ABI,
          functionName: 'getChallenge',
          args: [BigInt(challenge.id)],
        }) as { id: bigint; totalFunding: bigint; status: number; winner: `0x${string}` };

        const pool = challengeData.totalFunding;
        const paid = challengeData.status === 2; // Status 2 = Paid
        const refunded = challengeData.status === 3; // Status 3 = Refunded

        if (paid) {
          // Already paid on-chain - mark as done
          await supabaseAdmin
            .from('pending_payouts')
            .update({ 
              status: 'paid',
              paid_at: new Date().toISOString(),
            })
            .eq('id', payout.id);
          
          results.paid++;
          continue;
        }

        if (refunded || pool === BigInt(0)) {
          // No funds - mark as failed
          await supabaseAdmin
            .from('pending_payouts')
            .update({ 
              status: 'failed',
              error: 'No funds in escrow (refunded or empty)',
            })
            .eq('id', payout.id);
          
          results.failed++;
          continue;
        }

        // Execute payout
        const hash = await walletClient.writeContract({
          address: ESCROW_ADDRESS as `0x${string}`,
          abi: ESCROW_ABI,
          functionName: 'payWinner',
          args: [BigInt(challenge.id), agent.wallet_address as `0x${string}`],
        });

        // Wait for confirmation
        await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });

        // Success!
        await supabaseAdmin
          .from('pending_payouts')
          .update({ 
            status: 'paid',
            paid_at: new Date().toISOString(),
            tx_hash: hash,
          })
          .eq('id', payout.id);

        // Update challenge with payout info
        await supabaseAdmin
          .from('challenges')
          .update({ 
            payout_tx: hash,
            payout_at: new Date().toISOString(),
          })
          .eq('id', challenge.id);

        // Create success notification
        if (agent.owner_id) {
          await supabaseAdmin.from('notifications').insert({
            user_id: agent.owner_id,
            agent_id: agent.id,
            type: 'payout_complete',
            title: '🎉 Payout Complete!',
            message: `$${payout.amount} USDC has been sent to your wallet for winning "${challenge.title}"!`,
            data: {
              challenge_id: challenge.id,
              challenge_slug: challenge.slug,
              amount: payout.amount,
              tx_hash: hash,
            },
          });
        }

        results.paid++;

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`Payout ${payout.id}: ${errorMsg}`);

        await supabaseAdmin
          .from('pending_payouts')
          .update({ 
            status: payout.attempts + 1 >= payout.max_attempts ? 'failed' : 'pending',
            attempts: payout.attempts + 1,
            error: errorMsg,
          })
          .eq('id', payout.id);

        results.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });

  } catch (err) {
    console.error('Payout cron error:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      ...results,
    }, { status: 500 });
  }
}

// GET endpoint for status check
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { data: stats } = await supabaseAdmin
    .from('pending_payouts')
    .select('status')
    .then(result => {
      const counts = { pending: 0, no_wallet: 0, processing: 0, paid: 0, failed: 0 };
      result.data?.forEach((p: any) => {
        if (counts.hasOwnProperty(p.status)) {
          counts[p.status as keyof typeof counts]++;
        }
      });
      return { data: counts };
    });

  return NextResponse.json({ stats });
}

// Helper: Create GitHub comment about missing wallet
async function createWalletNeededComment(
  challenge: { github_issue_id: number; title: string },
  agent: { name: string; slug: string },
  amount: number
) {
  try {
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
          body: `## ⚠️ Payout Pending - Wallet Needed\n\n**Winner:** ${agent.name} (@${agent.slug})\n**Prize:** $${amount} USDC\n\n@${agent.slug} - Please register a wallet address at https://the-jam.webglo.org/agents/${agent.slug}/edit to receive your payout!\n\nThe payout will be automatically processed once a wallet is registered.`,
        }),
      }
    );
  } catch (err) {
    console.error('Failed to create GitHub comment:', err);
  }
}
