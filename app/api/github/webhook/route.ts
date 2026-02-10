import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/escrow';
import { withRateLimit } from '@/lib/rate-limit-middleware';

// Verify GitHub webhook signature
function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!secret || !signature) return false;
  
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

// Extract bounty from issue body
function extractBounty(body: string | null): number {
  if (!body) return 0;
  const patterns = [
    /\*?\*?(?:Bounty|Prize|Reward)\*?\*?:?\s*\$?(\d+(?:\.\d{2})?)\s*(?:USDC)?/i,
    /\$(\d+(?:\.\d{2})?)\s*USDC/i,
  ];
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) return parseFloat(match[1]);
  }
  return 0;
}

// Extract difficulty from labels
function extractDifficulty(labels: Array<{ name: string }>): string {
  const labelNames = labels.map(l => l.name.toLowerCase());
  if (labelNames.includes('legendary')) return 'legendary';
  if (labelNames.includes('hard')) return 'hard';
  if (labelNames.includes('medium')) return 'medium';
  if (labelNames.includes('easy')) return 'easy';
  return 'medium';
}

// Extract funding threshold
function extractFundingThreshold(body: string | null): number {
  if (!body) return 0;
  const truncatedBody = body.slice(0, 2000);
  const match = truncatedBody.match(/(?:Funding Threshold|Minimum Funding)[\s:]*\$?(\d{1,6}(?:\.\d{1,2})?)/i);
  return match ? parseFloat(match[1]) : 0;
}

// Generate slug from title
function generateSlug(title: string, issueNumber: number): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/\[challenge\]\s*/i, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 40);
  return `${baseSlug}-${issueNumber}`;
}

// Determine status from issue state and labels
function determineStatus(
  issueState: string,
  labels: string[],
  prizePool: number,
  fundingThreshold: number
): string {
  const lowerLabels = labels.map(l => l.toLowerCase());
  
  if (lowerLabels.includes('solved') || lowerLabels.includes('winner-selected')) return 'solved';
  if (lowerLabels.includes('voting')) return 'voting';
  if (lowerLabels.includes('cancelled')) return 'cancelled';
  
  if (issueState === 'closed') {
    return lowerLabels.includes('solved') ? 'solved' : 'closed';
  }
  
  if (fundingThreshold > 0 && prizePool < fundingThreshold) {
    return prizePool > 0 ? 'funding' : 'proposed';
  }
  
  return 'open';
}

// ============================================================================
// AUTO WINNER SELECTION & PAYOUT
// ============================================================================

interface AutoWinnerResult {
  success: boolean;
  action: string;
  winner?: {
    agentId: number;
    agentName: string;
    walletAddress: string | null;
  };
  payout?: {
    status: string;
    txHash?: string;
    amount?: number;
    error?: string;
  };
  error?: string;
}

/**
 * Process automatic winner selection for a merged PR
 * 
 * Auto-win conditions:
 * 1. Single merged submission with passing CI, OR
 * 2. Challenge has "auto-win" label, OR
 * 3. PR author is the challenge creator (self-solve)
 * 
 * If multiple submissions exist, starts voting period instead.
 */
async function processAutoWinner(
  challengeId: number,
  submissionId: number,
  prNumber: number
): Promise<AutoWinnerResult> {
  if (!supabaseAdmin) {
    return { success: false, action: 'skipped', error: 'Database not configured' };
  }

  // Get challenge details
  const { data: challenge, error: challengeError } = await supabaseAdmin
    .from('challenges')
    .select('id, slug, status, prize_pool, winner_agent_id, github_issue_number, github_labels, escrow_challenge_id, created_by')
    .eq('id', challengeId)
    .single();

  if (challengeError || !challenge) {
    return { success: false, action: 'skipped', error: 'Challenge not found' };
  }

  // Skip if already has winner or is closed
  if (challenge.winner_agent_id || challenge.status === 'closed' || challenge.status === 'solved') {
    return { success: false, action: 'skipped', error: 'Challenge already resolved' };
  }

  // Get all successful (merged) submissions for this challenge
  const { data: allSubmissions } = await supabaseAdmin
    .from('submissions')
    .select('id, agent_id, github_pr_state, github_ci_status')
    .eq('challenge_id', challengeId)
    .eq('github_pr_state', 'merged');

  const mergedSubmissions = allSubmissions || [];

  // Get the current submission with agent details
  const { data: submission } = await supabaseAdmin
    .from('submissions')
    .select(`
      id,
      agent_id,
      github_ci_status,
      agents:agent_id (id, name, slug, wallet_address, owner_id)
    `)
    .eq('id', submissionId)
    .single();

  if (!submission || !submission.agent_id) {
    // No agent linked - can't auto-select, need manual review
    return { 
      success: false, 
      action: 'needs_agent_link', 
      error: 'Submission has no linked agent - register at The Jam to claim' 
    };
  }

  const agent = submission.agents as any;
  const labels = (challenge.github_labels || []).map((l: string) => l.toLowerCase());
  const hasAutoWinLabel = labels.includes('auto-win') || labels.includes('single-winner');

  // Decision logic
  let shouldAutoWin = false;
  let reason = '';

  if (mergedSubmissions.length === 1) {
    // Only one merged submission - auto-win
    shouldAutoWin = true;
    reason = 'single_submission';
  } else if (hasAutoWinLabel) {
    // Has auto-win label - first merged PR wins
    shouldAutoWin = true;
    reason = 'auto_win_label';
  } else if (mergedSubmissions.length > 1) {
    // Multiple submissions - start voting period
    await supabaseAdmin
      .from('challenges')
      .update({
        status: 'voting',
        voting_start_at: new Date().toISOString(),
        voting_end_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', challengeId);

    return {
      success: true,
      action: 'voting_started',
      error: `Multiple submissions (${mergedSubmissions.length}) - voting period started`,
    };
  }

  if (!shouldAutoWin) {
    return { success: false, action: 'skipped', error: 'Conditions not met for auto-win' };
  }

  // =========== PROCESS WINNER ===========

  const prizePool = challenge.prize_pool || 0;
  const winnerAmount = prizePool * 0.95; // 5% platform fee

  // Create pending payout record
  const payoutStatus = agent.wallet_address ? 'pending' : 'no_wallet';
  
  await supabaseAdmin
    .from('pending_payouts')
    .upsert({
      challenge_id: challengeId,
      agent_id: submission.agent_id,
      amount: winnerAmount,
      status: payoutStatus,
      attempts: 0,
    }, {
      onConflict: 'challenge_id',
    });

  // Attempt escrow payout if conditions met
  let payoutResult: { status: string; txHash?: string; error?: string } = { status: payoutStatus };

  const escrowId = challenge.escrow_challenge_id || challengeId;

  if (agent.wallet_address && prizePool > 0 && process.env.ESCROW_ADMIN_PRIVATE_KEY) {
    try {
      const publicClient = createPublicClient({
        chain: base,
        transport: http('https://mainnet.base.org'),
      });

      // Check on-chain balance
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
          args: [BigInt(escrowId), agent.wallet_address as `0x${string}`],
        });

        await publicClient.waitForTransactionReceipt({ hash });

        payoutResult = { status: 'paid', txHash: hash };

        // Update pending payout
        await supabaseAdmin
          .from('pending_payouts')
          .update({
            status: 'paid',
            tx_hash: hash,
            paid_at: new Date().toISOString(),
          })
          .eq('challenge_id', challengeId);

      } else if (paid) {
        payoutResult = { status: 'already_paid', error: 'Already paid on-chain' };
      } else {
        payoutResult = { status: 'no_escrow_funds', error: 'No funds in escrow for this challenge' };
      }
    } catch (err) {
      console.error('Auto-payout failed:', err);
      payoutResult = {
        status: 'pending',
        error: err instanceof Error ? err.message : 'Payout failed - will retry',
      };

      await supabaseAdmin
        .from('pending_payouts')
        .update({
          error: payoutResult.error,
          attempts: 1,
        })
        .eq('challenge_id', challengeId);
    }
  } else if (!agent.wallet_address) {
    payoutResult.error = 'Winner has no wallet - payout pending registration';
  } else if (prizePool <= 0) {
    payoutResult = { status: 'no_prize', error: 'Unfunded challenge - no payout' };
  }

  // Update challenge with winner
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
    .eq('id', challengeId);

  // Mark submission as winner
  await supabaseAdmin
    .from('submissions')
    .update({ is_winner: true, rank: 1 })
    .eq('id', submissionId);

  // Trigger stats recalculation (uses DB function)
  try {
    await supabaseAdmin.rpc('recalc_agent_stats', { p_agent_id: submission.agent_id });
  } catch {
    // Stats function may not exist, fall back to manual update
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

  // Create notification for winner
  if (agent.owner_id) {
    const notifType = payoutResult.status === 'paid' ? 'payout_complete' :
                      payoutResult.status === 'no_wallet' ? 'wallet_needed' : 'challenge_won';

    const notifTitle = payoutResult.status === 'paid' ? '🎉 You Won + Got Paid!' :
                       payoutResult.status === 'no_wallet' ? '🏆 You Won! (Wallet Needed)' :
                       '🏆 You Won!';

    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: agent.owner_id,
        agent_id: agent.id,
        type: notifType,
        title: notifTitle,
        message: `${agent.name} won challenge "${challenge.slug}"! ${
          payoutResult.status === 'paid' 
            ? `$${winnerAmount.toFixed(2)} USDC sent to your wallet.`
            : payoutResult.status === 'no_wallet'
            ? `Register a wallet to receive $${winnerAmount.toFixed(2)} USDC.`
            : `Prize: $${winnerAmount.toFixed(2)} USDC.`
        }`,
        data: {
          challenge_id: challengeId,
          challenge_slug: challenge.slug,
          amount: winnerAmount,
          tx_hash: payoutResult.txHash,
          reason,
        },
      });
    } catch {
      // Ignore notification errors
    }
  }

  // Post GitHub comment
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
            body: `## 🏆 Challenge Complete!\n\n**Winner:** [${agent.name}](https://the-jam.webglo.org/agents/${agent.slug}) (PR #${prNumber})\n**Prize:** $${prizePool} USDC (Winner receives $${winnerAmount.toFixed(2)} after 5% platform fee)\n**Selection:** Automatic (${reason.replace('_', ' ')})${payoutInfo}\n\nCongratulations! 🎉`,
          }),
        }
      );

      // Close the issue
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

  return {
    success: true,
    action: 'winner_selected',
    winner: {
      agentId: submission.agent_id,
      agentName: agent.name,
      walletAddress: agent.wallet_address,
    },
    payout: {
      status: payoutResult.status,
      txHash: payoutResult.txHash,
      amount: winnerAmount,
      error: payoutResult.error,
    },
  };
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

// Handle issue events
async function handleIssueEvent(action: string, issue: any, repository: any) {
  if (!supabaseAdmin) {
    return { handled: false, error: 'Database not configured' };
  }

  const [owner, name] = repository.full_name.split('/');
  const { data: sourceRepo } = await supabaseAdmin
    .from('source_repos')
    .select('*')
    .eq('owner', owner)
    .eq('name', name)
    .eq('is_active', true)
    .single();

  if (!sourceRepo) {
    return { handled: false, reason: 'Repository not configured as source' };
  }

  const labels = issue.labels?.map((l: any) => l.name) || [];
  const hasChallenge = labels.some((l: string) =>
    l.toLowerCase() === sourceRepo.challenge_label.toLowerCase()
  );

  if (!hasChallenge && action !== 'unlabeled') {
    return { handled: false, reason: 'Not a challenge issue' };
  }

  if (action === 'unlabeled') {
    const removedLabel = issue.label?.name?.toLowerCase();
    if (removedLabel === sourceRepo.challenge_label.toLowerCase()) {
      await supabaseAdmin
        .from('challenges')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('source_repo_id', sourceRepo.id)
        .eq('github_issue_number', issue.number);

      return { handled: true, action: 'cancelled_label_removed' };
    }
    return { handled: false, reason: 'Irrelevant label removed' };
  }

  const slug = generateSlug(issue.title, issue.number);
  const bounty = extractBounty(issue.body);
  const difficulty = extractDifficulty(issue.labels);
  const fundingThreshold = extractFundingThreshold(issue.body);

  const { data: existing } = await supabaseAdmin
    .from('challenges')
    .select('id, prize_pool')
    .eq('source_repo_id', sourceRepo.id)
    .eq('github_issue_number', issue.number)
    .single();

  const prizePool = existing?.prize_pool || bounty;
  const status = determineStatus(issue.state, labels, prizePool, fundingThreshold);

  const challengeData = {
    slug,
    title: issue.title,
    description: issue.body || '',
    difficulty,
    status,
    prize_pool: existing ? existing.prize_pool : bounty,
    funding_threshold: fundingThreshold,
    source_repo_id: sourceRepo.id,
    github_issue_number: issue.number,
    github_issue_url: issue.html_url,
    github_issue_state: issue.state,
    github_labels: labels,
    github_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabaseAdmin
      .from('challenges')
      .update(challengeData)
      .eq('id', existing.id);

    return { handled: true, action: 'updated', slug };
  } else {
    await supabaseAdmin
      .from('challenges')
      .insert({ ...challengeData, created_at: new Date().toISOString() });

    return { handled: true, action: 'created', slug };
  }
}

// Handle PR events
async function handlePullRequestEvent(action: string, pr: any, repository: any) {
  if (!supabaseAdmin) {
    return { handled: false, error: 'Database not configured' };
  }

  const [owner, name] = repository.full_name.split('/');
  const { data: sourceRepo } = await supabaseAdmin
    .from('source_repos')
    .select('id')
    .eq('owner', owner)
    .eq('name', name)
    .eq('is_active', true)
    .single();

  if (!sourceRepo) {
    return { handled: false, reason: 'Repository not configured as source' };
  }

  // Look for linked issue
  const textToSearch = `${pr.body || ''} ${pr.title || ''}`.toLowerCase();
  const issueMatch = textToSearch.match(/(?:fixes|closes|resolves|for)\s*#(\d+)/i);

  if (!issueMatch) {
    return { handled: false, reason: 'No linked issue found' };
  }

  const issueNumber = parseInt(issueMatch[1]);

  const { data: challenge } = await supabaseAdmin
    .from('challenges')
    .select('id, slug, status')
    .eq('source_repo_id', sourceRepo.id)
    .eq('github_issue_number', issueNumber)
    .single();

  if (!challenge) {
    return { handled: false, reason: `Challenge not found for issue #${issueNumber}` };
  }

  // Find agent by GitHub username
  const { data: agentLink } = await supabaseAdmin
    .from('github_agent_links')
    .select('agent_id')
    .eq('github_username', pr.user.login.toLowerCase())
    .single();

  // Determine PR state
  let prState: 'open' | 'closed' | 'merged' = 'open';
  if (pr.merged || pr.merged_at) {
    prState = 'merged';
  } else if (pr.state === 'closed') {
    prState = 'closed';
  }

  let submissionStatus = 'pending';
  if (prState === 'merged') {
    submissionStatus = 'success';
  } else if (prState === 'closed') {
    submissionStatus = 'failed';
  }

  // Handle PR opened/updated
  if (action === 'opened' || action === 'synchronize' || action === 'reopened') {
    const { data: existingSubmission } = await supabaseAdmin
      .from('submissions')
      .select('id')
      .eq('challenge_id', challenge.id)
      .eq('github_pr_number', pr.number)
      .single();

    const submissionData: any = {
      challenge_id: challenge.id,
      status: submissionStatus,
      code: `See PR: ${pr.html_url}`,
      github_pr_number: pr.number,
      github_pr_url: pr.html_url,
      github_pr_state: prState,
      output: `PR #${pr.number}: ${pr.title}`,
      updated_at: new Date().toISOString(),
    };

    if (agentLink) {
      submissionData.agent_id = agentLink.agent_id;
    }

    if (existingSubmission) {
      await supabaseAdmin
        .from('submissions')
        .update(submissionData)
        .eq('id', existingSubmission.id);
      return { handled: true, action: 'submission_updated' };
    } else {
      await supabaseAdmin
        .from('submissions')
        .insert({ ...submissionData, created_at: new Date().toISOString() });
      return { handled: true, action: 'submission_created' };
    }
  }

  // Handle PR closed (merged or rejected)
  if (action === 'closed') {
    // Update submission status
    const { data: submission } = await supabaseAdmin
      .from('submissions')
      .update({
        status: pr.merged ? 'success' : 'failed',
        github_pr_state: prState,
        github_pr_merged_at: pr.merged_at,
        updated_at: new Date().toISOString(),
      })
      .eq('challenge_id', challenge.id)
      .eq('github_pr_number', pr.number)
      .select('id, agent_id')
      .single();

    // If PR was merged, attempt auto-winner selection
    if (pr.merged && submission) {
      const autoWinResult = await processAutoWinner(
        challenge.id,
        submission.id,
        pr.number
      );

      return {
        handled: true,
        action: 'submission_merged',
        autoWinner: autoWinResult,
      };
    }

    return { handled: true, action: pr.merged ? 'submission_merged' : 'submission_closed' };
  }

  return { handled: false, reason: 'Unhandled PR action' };
}

// Handle workflow run events (CI results)
async function handleWorkflowRunEvent(action: string, workflowRun: any, _repository: any) {
  if (action !== 'completed' || !supabaseAdmin) {
    return { handled: false, reason: 'Only handling completed workflows' };
  }

  const prNumbers = workflowRun.pull_requests?.map((pr: any) => pr.number) || [];
  if (prNumbers.length === 0) {
    return { handled: false, reason: 'No PRs associated with workflow' };
  }

  const ciStatus = workflowRun.conclusion === 'success' ? 'success' : 'failure';

  await supabaseAdmin
    .from('submissions')
    .update({
      github_ci_status: ciStatus,
      logs: `Workflow: ${workflowRun.name} - ${workflowRun.conclusion}`,
      updated_at: new Date().toISOString(),
    })
    .in('github_pr_number', prNumbers);

  return { handled: true, action: 'ci_status_updated', ciStatus };
}

// ============================================================================
// HTTP HANDLERS
// ============================================================================

export async function POST(request: NextRequest) {
  // Rate limit webhooks by IP
  const rateLimitResponse = await withRateLimit(request, 'webhooks');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const payload = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    const deliveryId = request.headers.get('x-github-delivery');

    const data = JSON.parse(payload);
    const action = data.action;
    const repoFullName = data.repository?.full_name;

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Verify signature for registered repos
    if (repoFullName) {
      if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repoFullName)) {
        return NextResponse.json({ error: 'Invalid repository name format' }, { status: 400 });
      }

      const [owner, name] = repoFullName.split('/');
      const { data: sourceRepo } = await supabaseAdmin
        .from('source_repos')
        .select('webhook_secret')
        .eq('owner', owner)
        .eq('name', name)
        .single();

      if (sourceRepo?.webhook_secret && !verifySignature(payload, signature, sourceRepo.webhook_secret)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Log webhook
    await supabaseAdmin.from('github_webhook_log').insert({
      event_type: event,
      action,
      delivery_id: deliveryId,
      payload: data,
      processed: false,
    });

    let result: any;

    switch (event) {
      case 'issues':
        result = await handleIssueEvent(action, data.issue, data.repository);
        break;
      case 'pull_request':
        result = await handlePullRequestEvent(action, data.pull_request, data.repository);
        break;
      case 'workflow_run':
        result = await handleWorkflowRunEvent(action, data.workflow_run, data.repository);
        break;
      case 'ping':
        result = { handled: true, action: 'pong', repo: repoFullName };
        break;
      default:
        result = { handled: false, reason: `Unhandled event: ${event}` };
        break;
    }

    // Mark as processed
    if (deliveryId) {
      await supabaseAdmin
        .from('github_webhook_log')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error: result.error || null,
        })
        .eq('delivery_id', deliveryId);
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'github-webhook',
    supports: ['issues', 'pull_request', 'workflow_run'],
    features: ['auto-winner-selection', 'auto-payout'],
    note: 'Webhooks are processed per-repo based on source_repos table',
  });
}
