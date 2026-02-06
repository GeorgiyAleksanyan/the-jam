import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

interface SourceRepo {
  id: number;
  owner: string;
  name: string;
  challenge_label: string;
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

// Generate slug from title
function generateSlug(title: string, issueNumber: number): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 40);
  return `${baseSlug}-${issueNumber}`;
}

// Determine status
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

async function syncRepo(repo: SourceRepo): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  const url = `https://api.github.com/repos/${repo.owner}/${repo.name}/issues?labels=${encodeURIComponent(repo.challenge_label)}&state=all&per_page=100`;
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'TheJam-CronSync',
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    errors.push(`GitHub API error: ${response.status}`);
    return { synced, errors };
  }

  const issues = await response.json();

  for (const issue of issues) {
    try {
      const slug = generateSlug(issue.title, issue.number);
      const bounty = extractBounty(issue.body);
      const difficulty = extractDifficulty(issue.labels);
      const fundingThreshold = extractFundingThreshold(issue.body);
      const labels = issue.labels.map((l: any) => l.name);

      const { data: existing } = await supabaseAdmin!
        .from('challenges')
        .select('id, prize_pool')
        .eq('source_repo_id', repo.id)
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
        source_repo_id: repo.id,
        github_issue_number: issue.number,
        github_issue_url: issue.html_url,
        github_issue_state: issue.state,
        github_labels: labels,
        github_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        await supabaseAdmin!
          .from('challenges')
          .update(challengeData)
          .eq('id', existing.id);
      } else {
        await supabaseAdmin!
          .from('challenges')
          .insert({ ...challengeData, created_at: new Date().toISOString() });
      }

      synced++;
    } catch (err) {
      errors.push(`Issue #${issue.number}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Update last_synced_at
  await supabaseAdmin!
    .from('source_repos')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', repo.id);

  return { synced, errors };
}

/**
 * GET /api/challenges/sync-cron
 * Called by Vercel Cron every 15 minutes to sync challenges from GitHub
 */
export async function GET(request: NextRequest) {
  try {
    // Verify Vercel cron request
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get all active source repos
    const { data: repos, error } = await supabaseAdmin
      .from('source_repos')
      .select('*')
      .eq('is_active', true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results: Array<{ repo: string; synced: number; errors: string[] }> = [];

    for (const repo of repos || []) {
      const result = await syncRepo(repo);
      results.push({
        repo: `${repo.owner}/${repo.name}`,
        ...result,
      });
    }

    const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);

    return NextResponse.json({
      success: true,
      totalSynced,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
