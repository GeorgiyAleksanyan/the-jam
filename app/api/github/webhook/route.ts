import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

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
  const match = body.match(/(?:Funding Threshold|Minimum Funding)[^0-9]*(\d+(?:\.\d{2})?)/i);
  return match ? parseFloat(match[1]) : 0;
}

// Generate slug from title - MUST match sync route's generateSlug
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

// Handle issue events
async function handleIssueEvent(action: string, issue: any, repository: any) {
  if (!supabaseAdmin) {
    return { handled: false, error: 'Database not configured' };
  }

  // Find the source repo
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

  // Check if issue has the challenge label
  const labels = issue.labels?.map((l: any) => l.name) || [];
  const hasChallenge = labels.some((l: string) => 
    l.toLowerCase() === sourceRepo.challenge_label.toLowerCase()
  );

  if (!hasChallenge && action !== 'unlabeled') {
    return { handled: false, reason: 'Not a challenge issue' };
  }

  // Handle unlabeled - if challenge label was removed, close the challenge
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

  // Check existing challenge
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
    
    // Log status change if different
    const { data: currentChallenge } = await supabaseAdmin
      .from('challenges')
      .select('status')
      .eq('id', existing.id)
      .single();
    
    if (currentChallenge && currentChallenge.status !== status) {
      await supabaseAdmin.from('challenge_status_log').insert({
        challenge_id: existing.id,
        from_status: currentChallenge.status,
        to_status: status,
        triggered_by: 'webhook',
        metadata: { action, issue_number: issue.number },
      });
    }

    return { handled: true, action: 'updated', slug };
  } else {
    const { data: newChallenge } = await supabaseAdmin
      .from('challenges')
      .insert({ ...challengeData, created_at: new Date().toISOString() })
      .select('id')
      .single();

    if (newChallenge) {
      await supabaseAdmin.from('challenge_status_log').insert({
        challenge_id: newChallenge.id,
        from_status: null,
        to_status: status,
        triggered_by: 'webhook',
        metadata: { action: 'created', issue_number: issue.number },
      });
    }

    return { handled: true, action: 'created', slug };
  }
}

// Handle PR events
async function handlePullRequestEvent(action: string, pr: any, repository: any) {
  if (!supabaseAdmin) {
    return { handled: false, error: 'Database not configured' };
  }

  // Find source repo
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

  // Look for linked issue in PR body/title
  const textToSearch = `${pr.body || ''} ${pr.title || ''}`.toLowerCase();
  const issueMatch = textToSearch.match(/(?:fixes|closes|resolves|for)\s*#(\d+)/i);
  
  if (!issueMatch) {
    return { handled: false, reason: 'No linked issue found' };
  }

  const issueNumber = parseInt(issueMatch[1]);

  // Find the challenge
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

  // Determine submission status
  let submissionStatus = 'pending';
  if (prState === 'merged') {
    submissionStatus = 'success';
  } else if (prState === 'closed') {
    submissionStatus = 'failed';
  }

  if (action === 'opened' || action === 'synchronize' || action === 'reopened') {
    // Check if submission exists
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

  if (action === 'closed') {
    await supabaseAdmin
      .from('submissions')
      .update({
        status: pr.merged ? 'success' : 'failed',
        github_pr_state: prState,
        github_pr_merged_at: pr.merged_at,
        updated_at: new Date().toISOString(),
      })
      .eq('challenge_id', challenge.id)
      .eq('github_pr_number', pr.number);

    return { handled: true, action: pr.merged ? 'submission_merged' : 'submission_closed' };
  }

  return { handled: false, reason: 'Unhandled PR action' };
}

// Handle workflow run events (CI results)
async function handleWorkflowRunEvent(action: string, workflowRun: any, repository: any) {
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

export async function POST(request: NextRequest) {
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

    // Find source repo and verify signature if webhook_secret is set
    if (repoFullName) {
      const [owner, name] = repoFullName.split('/');
      const { data: sourceRepo } = await supabaseAdmin
        .from('source_repos')
        .select('webhook_secret')
        .eq('owner', owner)
        .eq('name', name)
        .single();

      if (sourceRepo?.webhook_secret) {
        if (!verifySignature(payload, signature, sourceRepo.webhook_secret)) {
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
      }
    }

    // Log the webhook
    await supabaseAdmin.from('github_webhook_log').insert({
      event_type: event,
      action,
      delivery_id: deliveryId,
      payload: data,
      processed: false,
    });

    let result: any = { handled: false };

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
    note: 'Webhooks are processed per-repo based on source_repos table',
  });
}
