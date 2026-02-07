import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const GITHUB_REST = 'https://api.github.com';

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  labels: { name: string }[];
  created_at: string;
  updated_at: string;
  html_url: string;
  user: { login: string };
}

// Generate slug from title - MUST match webhook's generateSlug
function generateSlug(title: string, issueNumber: number): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/\[challenge\]\s*/i, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 40);
  return `${baseSlug}-${issueNumber}`;
}

// Extract bounty from issue body - matches webhook logic
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

// Extract difficulty from labels - matches webhook logic
function extractDifficulty(labels: Array<{ name: string }>): string {
  const labelNames = labels.map(l => l.name.toLowerCase());
  if (labelNames.includes('legendary')) return 'legendary';
  if (labelNames.includes('hard')) return 'hard';
  if (labelNames.includes('medium')) return 'medium';
  if (labelNames.includes('easy')) return 'easy';
  return 'medium';
}

// Extract funding threshold from body
function extractFundingThreshold(body: string | null): number {
  if (!body) return 0;
  const match = body.match(/(?:Funding Threshold|Minimum Funding)[^0-9]*(\d+(?:\.\d{2})?)/i);
  return match ? parseFloat(match[1]) : 0;
}

// Determine status - matches webhook logic
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

// Sync a single issue to the database
async function syncIssue(
  issue: GitHubIssue,
  sourceRepoId: number,
  existingChallenges: Map<number, { id: number; prize_pool: number; slug: string }>
): Promise<{ action: string; slug: string } | { error: string }> {
  const slug = generateSlug(issue.title, issue.number);
  const labels = issue.labels.map(l => l.name);
  const bounty = extractBounty(issue.body);
  const difficulty = extractDifficulty(issue.labels);
  const fundingThreshold = extractFundingThreshold(issue.body);
  
  const existing = existingChallenges.get(issue.number);
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
    source_repo_id: sourceRepoId,
    github_issue_number: issue.number,
    github_issue_url: issue.html_url,
    github_issue_state: issue.state,
    github_labels: labels,
    github_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    // Update existing challenge
    const { error } = await supabaseAdmin!
      .from('challenges')
      .update(challengeData)
      .eq('id', existing.id);

    if (error) return { error: error.message };
    return { action: 'updated', slug };
  } else {
    // Insert new challenge
    const { error } = await supabaseAdmin!
      .from('challenges')
      .insert({ ...challengeData, created_at: issue.created_at });

    if (error) {
      // Handle slug conflict by updating existing slug-based entry
      if (error.code === '23505') {
        const { error: updateError } = await supabaseAdmin!
          .from('challenges')
          .update(challengeData)
          .eq('slug', slug);
        
        if (updateError) return { error: updateError.message };
        return { action: 'updated_by_slug', slug };
      }
      return { error: error.message };
    }
    return { action: 'created', slug };
  }
}

export async function POST(_request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Get all active source repos
    const { data: sourceRepos, error: repoError } = await supabaseAdmin
      .from('source_repos')
      .select('*')
      .eq('is_active', true);

    if (repoError || !sourceRepos?.length) {
      return NextResponse.json({ 
        error: 'No active source repos configured',
        details: repoError?.message 
      }, { status: 400 });
    }

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'thejam-sync',
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const results = {
      repos_synced: 0,
      created: 0,
      updated: 0,
      closed_synced: 0,
      errors: [] as string[],
    };

    for (const sourceRepo of sourceRepos) {
      const { owner, name, challenge_label } = sourceRepo;

      // Fetch existing challenges for this repo (to preserve prize_pool)
      const { data: existingChallenges } = await supabaseAdmin
        .from('challenges')
        .select('id, github_issue_number, prize_pool, slug')
        .eq('source_repo_id', sourceRepo.id);

      const existingMap = new Map(
        (existingChallenges || []).map(c => [c.github_issue_number, c])
      );

      // Fetch OPEN issues with challenge label
      const openResponse = await fetch(
        `${GITHUB_REST}/repos/${owner}/${name}/issues?labels=${encodeURIComponent(challenge_label)}&state=open&per_page=100`,
        { headers }
      );

      if (!openResponse.ok) {
        results.errors.push(`${owner}/${name}: GitHub API error ${openResponse.status}`);
        continue;
      }

      const openIssues: GitHubIssue[] = await openResponse.json();

      // Fetch CLOSED issues with challenge label (to sync solved/closed status)
      const closedResponse = await fetch(
        `${GITHUB_REST}/repos/${owner}/${name}/issues?labels=${encodeURIComponent(challenge_label)}&state=closed&per_page=100`,
        { headers }
      );

      const closedIssues: GitHubIssue[] = closedResponse.ok ? await closedResponse.json() : [];

      // Process all issues
      const allIssues = [...openIssues, ...closedIssues];

      for (const issue of allIssues) {
        const result = await syncIssue(issue, sourceRepo.id, existingMap);
        
        if ('error' in result) {
          results.errors.push(`Issue #${issue.number}: ${result.error}`);
        } else if (result.action === 'created') {
          results.created++;
        } else if (result.action.startsWith('updated')) {
          results.updated++;
          if (issue.state === 'closed') {
            results.closed_synced++;
          }
        }
      }

      results.repos_synced++;
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('GitHub sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to sync GitHub challenge issues to the database',
    note: 'Syncs both open AND closed issues from all active source_repos',
  });
}
