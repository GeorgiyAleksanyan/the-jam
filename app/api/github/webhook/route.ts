import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

// Verify GitHub webhook signature
function verifySignature(payload: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;
  
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

// Extract bounty from issue body
function extractBounty(body: string | null): number | null {
  if (!body) return null;
  
  // Match patterns like "**Bounty**: $5 USDC" or "Bounty: 10 USDC" or "$20"
  const patterns = [
    /\*?\*?Bounty\*?\*?:?\s*\$?(\d+(?:\.\d{2})?)\s*(?:USDC)?/i,
    /\$(\d+(?:\.\d{2})?)\s*USDC/i,
    /(\d+(?:\.\d{2})?)\s*USDC/i,
  ];
  
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  return null;
}

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

// Handle issue events
async function handleIssueEvent(action: string, issue: any, repository: any) {
  const hasChallenge = issue.labels?.some((l: any) => l.name === 'challenge');
  
  if (!hasChallenge) {
    return { handled: false, reason: 'Not a challenge issue' };
  }

  const slug = generateSlug(issue.title);
  const bounty = extractBounty(issue.body);
  
  // Determine status from labels
  let status = 'proposed';
  const labels = issue.labels?.map((l: any) => l.name) || [];
  if (labels.includes('open')) status = 'open';
  else if (labels.includes('voting')) status = 'voting';
  else if (labels.includes('closed') || issue.state === 'closed') status = 'closed';
  else if (labels.includes('validated')) status = 'validated';

  // Determine difficulty
  let difficulty = 'medium';
  if (labels.includes('easy')) difficulty = 'easy';
  else if (labels.includes('hard')) difficulty = 'hard';
  else if (labels.includes('legendary')) difficulty = 'legendary';

  if (action === 'opened' || action === 'labeled' || action === 'edited') {
    // Upsert challenge
    const { data, error } = await supabase
      .from('challenges')
      .upsert({
        slug,
        title: issue.title,
        description: issue.body || '',
        status,
        difficulty,
        prize_pool: bounty || 0,
        github_issue_id: issue.number,
        github_issue_url: issue.html_url,
        source_url: issue.html_url,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'github_issue_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting challenge:', error);
      return { handled: false, error: error.message };
    }

    return { handled: true, action: 'upserted', challenge: data };
  }

  if (action === 'closed') {
    // Update challenge status
    const { error } = await supabase
      .from('challenges')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('github_issue_id', issue.number);

    if (error) {
      console.error('Error closing challenge:', error);
      return { handled: false, error: error.message };
    }

    return { handled: true, action: 'closed' };
  }

  return { handled: false, reason: 'Unhandled action' };
}

// Handle PR events
async function handlePullRequestEvent(action: string, pr: any, repository: any) {
  // Look for "Fixes #123" or "Closes #123" in PR body/title
  const textToSearch = ((pr.body || '') + ' ' + (pr.title || '')).toLowerCase();
  const issueMatch = textToSearch.match(/(?:fixes|closes|resolves)\s*#(\d+)/i);
  
  if (!issueMatch) {
    return { handled: false, reason: 'No linked issue found in: ' + textToSearch.substring(0, 100) };
  }

  const issueNumber = parseInt(issueMatch[1]);

  // Find the challenge
  const { data: challenge } = await supabase
    .from('challenges')
    .select('id, slug')
    .eq('github_issue_id', issueNumber)
    .single();

  if (!challenge) {
    return { handled: false, reason: 'Challenge not found for issue #' + issueNumber };
  }

  // Try to find agent by GitHub username (lowercase match)
  const { data: agentLink } = await supabase
    .from('github_agent_links')
    .select('agent_id')
    .eq('github_username', pr.user.login.toLowerCase())
    .single();

  if (action === 'opened' || action === 'synchronize') {
    // Create or update submission
    const submissionData: any = {
      challenge_id: challenge.id,
      status: 'pending',
      github_pr_number: pr.number,
      github_pr_url: pr.html_url,
      output: `PR #${pr.number}: ${pr.title}`,
      updated_at: new Date().toISOString(),
    };

    if (agentLink) {
      submissionData.agent_id = agentLink.agent_id;
    }

    const { data, error } = await supabase
      .from('submissions')
      .upsert(submissionData, {
        onConflict: 'github_pr_number',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating submission:', error);
      return { handled: false, error: error.message };
    }

    return { handled: true, action: 'submission_created', submission: data };
  }

  if (action === 'closed' && pr.merged) {
    // PR merged - update submission status
    const { error } = await supabase
      .from('submissions')
      .update({ 
        status: 'success',
        updated_at: new Date().toISOString()
      })
      .eq('github_pr_number', pr.number);

    if (error) {
      console.error('Error updating submission:', error);
      return { handled: false, error: error.message };
    }

    return { handled: true, action: 'submission_merged' };
  }

  return { handled: false, reason: 'Unhandled PR action' };
}

// Handle workflow run events (CI results)
async function handleWorkflowRunEvent(action: string, workflowRun: any, repository: any) {
  if (action !== 'completed') {
    return { handled: false, reason: 'Only handling completed workflows' };
  }

  // Find PRs associated with this workflow
  const prNumbers = workflowRun.pull_requests?.map((pr: any) => pr.number) || [];
  
  if (prNumbers.length === 0) {
    return { handled: false, reason: 'No PRs associated with workflow' };
  }

  const status = workflowRun.conclusion === 'success' ? 'success' : 'failed';

  // Update submissions
  const { error } = await supabase
    .from('submissions')
    .update({ 
      status,
      logs: `Workflow: ${workflowRun.name} - ${workflowRun.conclusion}`,
      updated_at: new Date().toISOString()
    })
    .in('github_pr_number', prNumbers);

  if (error) {
    console.error('Error updating submission from workflow:', error);
    return { handled: false, error: error.message };
  }

  return { handled: true, action: 'workflow_result_applied', status };
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    const deliveryId = request.headers.get('x-github-delivery');

    // Verify signature (skip in dev if no secret set)
    if (WEBHOOK_SECRET && !verifySignature(payload, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(payload);
    const action = data.action;

    // Log the webhook
    await supabase.from('github_webhook_log').insert({
      event_type: event,
      action,
      delivery_id: deliveryId,
      payload: data,
      processed: false,
    });

    let result: any = { handled: false };

    // Route to appropriate handler
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
        result = { handled: true, action: 'pong' };
        break;
      default:
        result = { handled: false, reason: 'Unhandled event type: ' + event };
    }

    // Mark as processed
    if (deliveryId) {
      await supabase
        .from('github_webhook_log')
        .update({ processed: true, processed_at: new Date().toISOString() })
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

// Also allow GET for health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'github-webhook' });
}
