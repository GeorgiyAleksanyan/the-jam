import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * One-time cleanup endpoint to fix duplicate challenges and migrate old data.
 * 
 * This endpoint:
 * 1. Fetches all GitHub challenge issues to build title -> issue mapping
 * 2. Finds challenges without github_issue_number
 * 3. Matches them to GitHub issues by normalized title
 * 4. Updates with correct github_issue_number and slug
 * 5. Removes duplicates (keeping oldest, moving submissions)
 * 
 * Run once after deploying the sync fix.
 */

const GITHUB_REST = 'https://api.github.com';

// Generate slug - matches sync/webhook
function generateSlug(title: string, issueNumber: number): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/\[challenge\]\s*/i, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 40);
  return `${baseSlug}-${issueNumber}`;
}

// Normalize title for matching
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\[challenge\]\s*/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const results = {
      orphans_matched: 0,
      duplicates_removed: 0,
      challenges_updated: 0,
      errors: [] as string[],
    };

    // Fetch GitHub issues to build title -> issue number map
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'thejam-cleanup',
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    // Get source repos
    const { data: sourceRepos } = await supabaseAdmin
      .from('source_repos')
      .select('*')
      .eq('is_active', true);

    if (!sourceRepos?.length) {
      return NextResponse.json({ error: 'No active source repos' }, { status: 400 });
    }

    // Build title -> issue mapping from all repos
    const titleToIssue = new Map<string, { number: number; state: string; sourceRepoId: number; title: string }>();

    for (const repo of sourceRepos) {
      // Fetch both open and closed issues
      for (const state of ['open', 'closed']) {
        const response = await fetch(
          `${GITHUB_REST}/repos/${repo.owner}/${repo.name}/issues?labels=${encodeURIComponent(repo.challenge_label)}&state=${state}&per_page=100`,
          { headers }
        );
        if (response.ok) {
          const issues = await response.json();
          for (const issue of issues) {
            const normalizedTitle = normalizeTitle(issue.title);
            titleToIssue.set(normalizedTitle, {
              number: issue.number,
              state: issue.state,
              sourceRepoId: repo.id,
              title: issue.title,
            });
          }
        }
      }
    }

    // Get all challenges
    const { data: allChallenges } = await supabaseAdmin
      .from('challenges')
      .select('id, slug, title, github_issue_number, source_repo_id, created_at')
      .order('created_at', { ascending: true });

    if (!allChallenges) {
      return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 });
    }

    // Group challenges by normalized title
    const byTitle = new Map<string, typeof allChallenges>();
    for (const challenge of allChallenges) {
      const normalized = normalizeTitle(challenge.title);
      const existing = byTitle.get(normalized) || [];
      existing.push(challenge);
      byTitle.set(normalized, existing);
    }

    // Process each group
    for (const [normalizedTitle, challenges] of byTitle) {
      const issueInfo = titleToIssue.get(normalizedTitle);
      
      if (!issueInfo) {
        // No matching GitHub issue - these might be manually created or deleted
        if (challenges.some(c => !c.github_issue_number)) {
          results.errors.push(`No GitHub issue found for: ${challenges[0].title}`);
        }
        continue;
      }

      // Find the best challenge to keep (one with github_issue_number set, or oldest)
      let keeper = challenges.find(c => c.github_issue_number === issueInfo.number);
      if (!keeper) {
        keeper = challenges[0]; // Keep oldest
      }

      const correctSlug = generateSlug(issueInfo.title, issueInfo.number);

      // First, delete any other entries that would conflict with the new slug
      const { data: conflicting } = await supabaseAdmin
        .from('challenges')
        .select('id')
        .eq('slug', correctSlug)
        .neq('id', keeper.id);

      if (conflicting?.length) {
        for (const conflict of conflicting) {
          // Move submissions first
          await supabaseAdmin
            .from('submissions')
            .update({ challenge_id: keeper.id })
            .eq('challenge_id', conflict.id);
          
          // Delete conflicting entry
          await supabaseAdmin
            .from('challenges')
            .delete()
            .eq('id', conflict.id);
          
          results.duplicates_removed++;
        }
      }

      // Update the keeper with correct data
      const { error: updateError } = await supabaseAdmin
        .from('challenges')
        .update({
          github_issue_number: issueInfo.number,
          source_repo_id: issueInfo.sourceRepoId,
          slug: correctSlug,
          updated_at: new Date().toISOString(),
        })
        .eq('id', keeper.id);

      if (updateError) {
        results.errors.push(`Failed to update ${keeper.title}: ${updateError.message}`);
        continue;
      }

      if (!keeper.github_issue_number) {
        results.orphans_matched++;
      }
      results.challenges_updated++;

      // Delete remaining duplicates (same normalized title but different entries)
      const toDelete = challenges.filter(c => c.id !== keeper.id);
      for (const dup of toDelete) {
        // Move submissions to keeper
        await supabaseAdmin
          .from('submissions')
          .update({ challenge_id: keeper.id })
          .eq('challenge_id', dup.id);

        // Delete duplicate
        await supabaseAdmin
          .from('challenges')
          .delete()
          .eq('id', dup.id);

        results.duplicates_removed++;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      github_issues_found: titleToIssue.size,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to cleanup duplicate challenges and fix data integrity',
    warning: 'This is a one-time migration endpoint. Matches challenges to GitHub issues by title.',
  });
}
