import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  labels: Array<{ name: string; color: string }>;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

interface SourceRepo {
  id: number;
  owner: string;
  name: string;
  full_name: string;
  challenge_label: string;
}

// Extract bounty/prize from issue body
function extractBounty(body: string | null): number {
  if (!body) return 0;
  
  const patterns = [
    /\*?\*?(?:Bounty|Prize|Reward)\*?\*?:?\s*\$?(\d+(?:\.\d{2})?)\s*(?:USDC)?/i,
    /\$(\d+(?:\.\d{2})?)\s*USDC/i,
  ];
  
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
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

// Extract funding threshold from issue body
function extractFundingThreshold(body: string | null): number {
  if (!body) return 0;
  
  // Match patterns like: **Funding Threshold:** $15 USDC or Funding Threshold: 15
  const match = body.match(/(?:Funding Threshold|Minimum Funding)[^0-9]*(\d+(?:\.\d{2})?)/i);
  return match ? parseFloat(match[1]) : 0;
}

// Extract upvote threshold from issue body (default 20 for free challenges)
function extractUpvoteThreshold(body: string | null): number {
  if (!body) return 20;
  
  // Match patterns like: **Upvote Threshold:** 20 or Upvotes Required: 15
  const match = body.match(/(?:Upvote Threshold|Upvotes Required)[^0-9]*(\d+)/i);
  return match ? parseInt(match[1], 10) : 20;
}

// Generate slug from title
function generateSlug(title: string, issueNumber: number): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 40);
  return `${baseSlug}-${issueNumber}`;
}

// Determine challenge status from issue state and labels
function determineStatus(
  issue: GitHubIssue, 
  currentPrizePool: number, 
  fundingThreshold: number,
  currentUpvotes: number = 0,
  upvoteThreshold: number = 20
): string {
  const labelNames = issue.labels.map(l => l.name.toLowerCase());
  
  // Explicit status labels take precedence
  if (labelNames.includes('solved') || labelNames.includes('winner-selected')) return 'solved';
  if (labelNames.includes('voting')) return 'voting';
  if (labelNames.includes('cancelled')) return 'cancelled';
  
  // Closed issues
  if (issue.state === 'closed') {
    if (labelNames.includes('solved')) return 'solved';
    return 'closed';
  }
  
  // Funded challenges - check funding threshold
  const isFunded = fundingThreshold > 0 || currentPrizePool > 0;
  if (isFunded) {
    if (fundingThreshold > 0 && currentPrizePool < fundingThreshold) {
      return currentPrizePool > 0 ? 'funding' : 'proposed';
    }
    return 'open';
  }
  
  // Free challenges - check upvote threshold
  if (currentUpvotes >= upvoteThreshold) {
    return 'open';
  }
  
  return 'proposed';
}

// Fetch issues from a GitHub repo
async function fetchRepoIssues(repo: SourceRepo): Promise<GitHubIssue[]> {
  const url = `https://api.github.com/repos/${repo.owner}/${repo.name}/issues?labels=${encodeURIComponent(repo.challenge_label)}&state=all&per_page=100`;
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'TheJam-Sync',
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// Sync a single issue to the challenges table
async function syncIssue(issue: GitHubIssue, repo: SourceRepo): Promise<{ action: string; slug: string }> {
  if (!supabaseAdmin) {
    throw new Error('Database not configured');
  }
  
  const slug = generateSlug(issue.title, issue.number);
  const bounty = extractBounty(issue.body);
  const difficulty = extractDifficulty(issue.labels);
  const fundingThreshold = extractFundingThreshold(issue.body);
  const upvoteThreshold = extractUpvoteThreshold(issue.body);
  
  // Check if challenge exists
  const { data: existing } = await supabaseAdmin
    .from('challenges')
    .select('id, prize_pool, status, upvotes')
    .eq('source_repo_id', repo.id)
    .eq('github_issue_number', issue.number)
    .single();
  
  const currentPrizePool = existing?.prize_pool || bounty;
  const currentUpvotes = existing?.upvotes || 0;
  const status = determineStatus(issue, currentPrizePool, fundingThreshold, currentUpvotes, upvoteThreshold);
  
  const challengeData = {
    slug,
    title: issue.title,
    description: issue.body || '',
    difficulty,
    status,
    prize_pool: existing ? existing.prize_pool : bounty, // Don't overwrite existing prize pool
    funding_threshold: fundingThreshold,
    upvote_threshold: upvoteThreshold,
    source_repo_id: repo.id,
    github_issue_number: issue.number,
    github_issue_url: issue.html_url,
    github_issue_state: issue.state,
    github_labels: issue.labels.map(l => l.name),
    github_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  if (existing) {
    // Update existing challenge
    await supabaseAdmin
      .from('challenges')
      .update(challengeData)
      .eq('id', existing.id);
    
    return { action: 'updated', slug };
  } else {
    // Insert new challenge
    await supabaseAdmin
      .from('challenges')
      .insert({
        ...challengeData,
        created_at: new Date(issue.created_at).toISOString(),
      });
    
    return { action: 'created', slug };
  }
}

/**
 * POST /api/challenges/sync
 * Sync challenges from all active source repos
 * Auth: Admin API key required
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Invalid admin key' }, { status: 403 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get all active source repos
    const { data: repos, error: repoError } = await supabaseAdmin
      .from('source_repos')
      .select('*')
      .eq('is_active', true);

    if (repoError) {
      return NextResponse.json({ error: repoError.message }, { status: 500 });
    }

    const results: Array<{
      repo: string;
      issues: number;
      created: number;
      updated: number;
      errors: string[];
    }> = [];

    // Sync each repo
    for (const repo of repos || []) {
      const repoResult = {
        repo: `${repo.owner}/${repo.name}`,
        issues: 0,
        created: 0,
        updated: 0,
        errors: [] as string[],
      };

      try {
        const issues = await fetchRepoIssues(repo);
        repoResult.issues = issues.length;

        for (const issue of issues) {
          try {
            const syncResult = await syncIssue(issue, repo);
            if (syncResult.action === 'created') repoResult.created++;
            if (syncResult.action === 'updated') repoResult.updated++;
          } catch (err) {
            repoResult.errors.push(`Issue #${issue.number}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }

        // Update last_synced_at
        await supabaseAdmin
          .from('source_repos')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', repo.id);

      } catch (err) {
        repoResult.errors.push(`Fetch failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      results.push(repoResult);
    }

    const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);

    return NextResponse.json({
      success: true,
      repos: results.length,
      totalCreated,
      totalUpdated,
      results,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/challenges/sync
 * Get sync status
 */
export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { data: repos } = await supabaseAdmin
    .from('source_repos')
    .select('owner, name, challenge_label, is_active, last_synced_at')
    .order('owner');

  return NextResponse.json({
    repos,
    message: 'POST with admin auth to sync challenges from GitHub',
  });
}
